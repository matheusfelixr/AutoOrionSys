import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { Notificacao } from '../models/notificacao.model';

/** Minimal STOMP frame parser/builder for WebSocket communication */
function buildStompFrame(command: string, headers: Record<string, string>, body = ''): string {
  const headerStr = Object.entries(headers).map(([k, v]) => `${k}:${v}`).join('\n');
  return `${command}\n${headerStr}\n\n${body}\0`;
}

function parseStompFrame(data: string): { command: string; headers: Record<string, string>; body: string } {
  const nullIdx = data.indexOf('\0');
  const frameStr = nullIdx >= 0 ? data.slice(0, nullIdx) : data;
  const lines = frameStr.split('\n');
  const command = lines[0].trim();
  const headers: Record<string, string> = {};
  let bodyStart = 1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') { bodyStart = i + 1; break; }
    const colonIdx = lines[i].indexOf(':');
    if (colonIdx > 0) {
      headers[lines[i].slice(0, colonIdx).trim()] = lines[i].slice(colonIdx + 1).trim();
    }
  }
  const body = lines.slice(bodyStart).join('\n');
  return { command, headers, body };
}

@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {
  private auth = inject(AuthService);
  private destroy$ = new Subject<void>();
  private ws: WebSocket | null = null;
  private connected = false;
  private subscriptions = new Map<string, (msg: string) => void>();
  private subCounter = 0;
  private pendingSubs: Array<{ destination: string; id: string; callback: (msg: string) => void }> = [];

  connect(): void {
    if (this.connected || environment.useMockData) return;

    const token = this.auth.getToken();
    if (!token) return;

    try {
      const wsUrl = `${window.location.origin.replace(/^http/, 'ws')}/ws/websocket`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (!this.ws) return;
        // Send STOMP CONNECT frame
        this.ws.send(buildStompFrame('CONNECT', {
          'accept-version': '1.1,1.0',
          'heart-beat': '4000,4000',
          'Authorization': `Bearer ${token}`,
          'login': this.auth.currentUser()?.id ?? '',
          'passcode': token,
        }));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        const data = typeof event.data === 'string' ? event.data : '';
        if (!data.trim()) return;

        const frame = parseStompFrame(data);

        if (frame.command === 'CONNECTED') {
          this.connected = true;
          // Subscribe to any pending subscriptions
          this.pendingSubs.forEach(sub => this._sendSubscribe(sub.destination, sub.id, sub.callback));
          this.pendingSubs = [];
        } else if (frame.command === 'MESSAGE') {
          const destination = frame.headers['destination'] || '';
          this.subscriptions.forEach((cb, dest) => {
            if (destination === dest || destination.endsWith(dest)) {
              cb(frame.body);
            }
          });
        } else if (frame.command === 'ERROR') {
          console.error('[WS] STOMP error:', frame.headers['message'], frame.body);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[WS] WebSocket error', err);
      };

      this.ws.onclose = () => {
        this.connected = false;
      };

    } catch (e) {
      console.error('[WS] Failed to connect', e);
    }
  }

  disconnect(): void {
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(buildStompFrame('DISCONNECT', {}));
        }
        this.ws.close();
      } catch { /* ignore */ }
      this.ws = null;
    }
    this.connected = false;
    this.subscriptions.clear();
    this.pendingSubs = [];
  }

  private _sendSubscribe(destination: string, id: string, callback: (msg: string) => void): void {
    this.subscriptions.set(destination, callback);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(buildStompFrame('SUBSCRIBE', { destination, id, ack: 'auto' }));
    }
  }

  private watch(destination: string): Observable<string> {
    return new Observable<string>(observer => {
      const id = `sub-${++this.subCounter}`;
      const callback = (msg: string) => observer.next(msg);

      if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this._sendSubscribe(destination, id, callback);
      } else {
        this.pendingSubs.push({ destination, id, callback });
      }

      return () => {
        this.subscriptions.delete(destination);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(buildStompFrame('UNSUBSCRIBE', { id }));
        }
      };
    });
  }

  /** Assina o tópico de notificações do usuário logado */
  onNotificacao(): Observable<Notificacao> {
    if (environment.useMockData) {
      return new Observable<Notificacao>(); // never emits
    }

    const userId = this.auth.currentUser()?.id;
    if (!userId) {
      return new Observable<Notificacao>(); // never emits
    }

    return new Observable<Notificacao>(observer => {
      // Assina /topic/notificacoes/{uuid} — mesma rota que o backend usa com convertAndSend
      const inner = this.watch(`/topic/notificacoes/${userId}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe(body => {
          try {
            const notificacao = JSON.parse(body) as Notificacao;
            observer.next(notificacao);
          } catch (e) {
            console.error('[WS] Erro ao parsear notificação', e);
          }
        });

      return () => inner.unsubscribe();
    }).pipe(takeUntil(this.destroy$));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
