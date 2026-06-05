import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Notificacao, NotificacaoLeitura } from '../models/notificacao.model';
import { WebsocketService } from './websocket.service';
import { environment } from '../../../environments/environment';
import { ToastService } from 'ui-lib';
import { NotificationSoundService } from './notification-sound.service';

const MOCK_NOTIFICACOES: Notificacao[] = [
  {
    id: 'n1', titulo: 'Novo veÃ­culo cadastrado', tipo: 'info', ativa: true,
    mensagem: 'O veÃ­culo Toyota Corolla (ABC-1234) foi cadastrado com sucesso e estÃ¡ disponÃ­vel para consulta.',
    destinatario: 'todos', link: '/obras',
    criadaEm: new Date('2026-05-28T08:30:00'), criadaPor: 'u1',
  },
  {
    id: 'n2', titulo: 'Status atualizado', tipo: 'sucesso', ativa: true,
    mensagem: 'O veÃ­culo Jeep Compass (STU-2468) foi reservado por Pedro Alves. Confira a ficha do veÃ­culo.',
    destinatario: 'perfil', perfilAlvo: 'gerente', link: '/obras',
    criadaEm: new Date('2026-05-28T10:00:00'), criadaPor: 'u1',
  },
  {
    id: 'n3', titulo: 'AtenÃ§Ã£o: veÃ­culo em manutenÃ§Ã£o', tipo: 'aviso', ativa: true,
    mensagem: 'O veÃ­culo Fiat Argo (MNO-7890) foi encaminhado para manutenÃ§Ã£o preventiva. Retorno previsto em 3 dias.',
    destinatario: 'todos', link: '/obras',
    criadaEm: new Date('2026-05-27T14:15:00'), criadaPor: 'u1',
  },
  {
    id: 'n4', titulo: 'UsuÃ¡rio inativado', tipo: 'aviso', ativa: true,
    mensagem: 'O usuÃ¡rio "Eduardo Ferreira" foi inativado no sistema. Seus acessos foram revogados.',
    destinatario: 'perfil', perfilAlvo: 'admin',
    criadaEm: new Date('2026-05-27T09:00:00'), criadaPor: 'u15',
  },
  {
    id: 'n5', titulo: 'Ficha fotogrÃ¡fica registrada', tipo: 'sucesso', ativa: true,
    mensagem: 'Ricardo Alves registrou novas fotos na ficha do veÃ­culo Toyota Corolla (ABC-1234) â€” Frente e Traseira.',
    destinatario: 'perfil', perfilAlvo: 'gerente', link: '/obras',
    criadaEm: new Date('2026-05-26T16:45:00'), criadaPor: 'u4',
  },
  {
    id: 'n6', titulo: 'Novo perfil criado', tipo: 'info', ativa: true,
    mensagem: 'Um novo perfil de acesso foi criado no sistema. Revise as permissÃµes em ConfiguraÃ§Ãµes â†’ Perfis.',
    destinatario: 'perfil', perfilAlvo: 'admin', link: '/perfis',
    criadaEm: new Date('2026-05-25T11:30:00'), criadaPor: 'u1',
  },
  {
    id: 'n7', titulo: 'VeÃ­culo sem vistoria recente', tipo: 'erro', ativa: true,
    mensagem: 'O veÃ­culo Jeep Renegade (VWX-3690) estÃ¡ disponÃ­vel hÃ¡ mais de 30 dias sem vistoria registrada.',
    destinatario: 'usuario', usuarioAlvo: 'u7', link: '/obras',
    criadaEm: new Date('2026-05-24T09:00:00'), criadaPor: 'u1',
  },
  {
    id: 'n8', titulo: 'Bem-vindo ao autoorion!', tipo: 'sucesso', ativa: true,
    mensagem: 'Bem-vindo ao sistema autoorion. Explore os mÃ³dulos disponÃ­veis e configure seu perfil.',
    destinatario: 'todos', link: '/perfil',
    criadaEm: new Date('2026-05-20T08:00:00'), criadaPor: 'u1',
  },
];

// In-memory read status
const MOCK_LEITURAS: NotificacaoLeitura[] = [
  { notificacaoId: 'n8', usuarioId: 'u1', lidaEm: new Date('2026-05-20T08:05:00') },
  { notificacaoId: 'n6', usuarioId: 'u1', lidaEm: new Date('2026-05-25T12:00:00') },
];

/** Maps a raw WebSocket notification payload to the existing Notificacao shape */
function wsPayloadToNotificacao(raw: Record<string, unknown>): Notificacao {
  // WS payload may use different field names â€” normalise them
  const tipo = String(raw['tipo'] ?? 'info');
  const tipoMap: Record<string, string> = { success: 'sucesso', warning: 'aviso', error: 'erro' };
  return {
    id:          String(raw['id'] ?? `ws-${Date.now()}`),
    titulo:      String(raw['titulo'] ?? raw['title'] ?? 'Nova notificaÃ§Ã£o'),
    mensagem:    String(raw['mensagem'] ?? raw['message'] ?? ''),
    tipo:        (tipoMap[tipo] ?? tipo) as Notificacao['tipo'],
    destinatario: 'usuario',
    usuarioAlvo: String(raw['usuarioId'] ?? ''),
    ativa:       true,
    criadaEm:    raw['criadoEm'] ? new Date(String(raw['criadoEm'])) : new Date(),
    criadaPor:   String(raw['usuarioId'] ?? 'sistema'),
  };
}

@Injectable({ providedIn: 'root' })
export class NotificacoesService {
  private http  = inject(HttpClient);
  private ws    = inject(WebsocketService);
  private toast = inject(ToastService);
  private sound = inject(NotificationSoundService);
  private readonly API = `${environment.apiUrl}/notificacoes`;

  private readonly _notificacoes = signal<Notificacao[]>([...MOCK_NOTIFICACOES]);
  private readonly _leituras     = signal<NotificacaoLeitura[]>([...MOCK_LEITURAS]);

  readonly notificacoes = this._notificacoes.asReadonly();
  readonly leituras     = this._leituras.asReadonly();

  // â”€â”€ Initialisation (WebSocket) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Call once from ShellComponent after session is validated */
  init(): void {
    if (environment.useMockData) return;

    this.ws.connect();

    // Listen for real-time notifications pushed via WebSocket
    this.ws.onNotificacao().subscribe((raw: unknown) => {
      const notif = wsPayloadToNotificacao(raw as Record<string, unknown>);
      this._notificacoes.update(list => [notif, ...list]);
      this.sound.play(this.toSoundTipo(notif.tipo));
      this.showPopup(notif);
    });
  }

  // â”€â”€ Popup helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private toSoundTipo(tipo: Notificacao['tipo']): 'success' | 'info' | 'warning' | 'error' {
    const map: Record<Notificacao['tipo'], 'success' | 'info' | 'warning' | 'error'> = {
      sucesso: 'success',
      info:    'info',
      aviso:   'warning',
      erro:    'error',
    };
    return map[tipo] ?? 'info';
  }

  private showPopup(notificacao: Notificacao): void {
    const text = `${notificacao.titulo}: ${notificacao.mensagem}`;
    switch (notificacao.tipo) {
      case 'sucesso': this.toast.success(text); break;
      case 'aviso':   this.toast.warning(text); break;
      case 'erro':    this.toast.error(text);   break;
      default:        this.toast.info(text);    break;
    }
  }

  // â”€â”€ Filtering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Returns notifications visible to the given user+perfil, sorted newest first */
  getForUser(userId: string, perfil: string): Notificacao[] {
    return this._notificacoes()
      .filter(n => n.ativa && this._isVisible(n, userId, perfil))
      .sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime());
  }

  /** Unread count for the given user */
  unreadCount(userId: string, perfil: string): number {
    const readIds = new Set(
      this._leituras().filter(l => l.usuarioId === userId).map(l => l.notificacaoId)
    );
    return this.getForUser(userId, perfil).filter(n => !readIds.has(n.id)).length;
  }

  isRead(notificacaoId: string, userId: string): boolean {
    return this._leituras().some(l => l.notificacaoId === notificacaoId && l.usuarioId === userId);
  }

  private _isVisible(n: Notificacao, userId: string, perfil: string): boolean {
    if (n.destinatario === 'todos') return true;
    if (n.destinatario === 'perfil') return n.perfilAlvo === perfil;
    if (n.destinatario === 'usuario') return n.usuarioAlvo === userId;
    return false;
  }

  // â”€â”€ Read status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  markAsRead(notificacaoId: string, userId: string): void {
    if (this.isRead(notificacaoId, userId)) return;
    this._leituras.update(l => [...l, { notificacaoId, usuarioId: userId, lidaEm: new Date() }]);
  }

  markAllAsRead(userId: string, perfil: string): void {
    const notifIds = this.getForUser(userId, perfil).map(n => n.id);
    const already  = new Set(this._leituras().filter(l => l.usuarioId === userId).map(l => l.notificacaoId));
    const novas    = notifIds.filter(id => !already.has(id)).map(id => ({
      notificacaoId: id, usuarioId: userId, lidaEm: new Date(),
    }));
    this._leituras.update(l => [...l, ...novas]);
  }

  // â”€â”€ CRUD (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getAll(): Observable<Notificacao[]> {
    return of(this._notificacoes());
  }

  create(data: Omit<Notificacao, 'id'>): Observable<Notificacao> {
    const nova: Notificacao = { id: 'n-' + Date.now(), ...data };
    this._notificacoes.update(list => [nova, ...list]);
    return of(nova);
  }

  update(id: string, data: Partial<Notificacao>): Observable<Notificacao> {
    const updated = { ...this._notificacoes().find(n => n.id === id)!, ...data };
    this._notificacoes.update(list => list.map(n => n.id === id ? updated : n));
    return of(updated);
  }

  delete(id: string): Observable<void> {
    this._notificacoes.update(list => list.filter(n => n.id !== id));
    return of(void 0);
  }
}
