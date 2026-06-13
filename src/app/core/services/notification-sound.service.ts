import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationSoundService {

  private ctx: AudioContext | null = null;
  readonly soundEnabled = signal(
    localStorage.getItem('autoorion-notif-sound') !== 'false'
  );

  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    localStorage.setItem('autoorion-notif-sound', String(next));
  }

  play(tipo: 'success' | 'info' | 'warning' | 'error'): void {
    if (!this.soundEnabled()) return;
    try {
      this.ctx ??= new AudioContext();
      switch (tipo) {
        case 'success': this.playTones([523, 659], [0, 0.15], 0.12); break;
        case 'info':    this.playTones([440],      [0],        0.10); break;
        case 'warning': this.playTones([440, 370], [0, 0.18], 0.14); break;
        case 'error':   this.playTones([440, 370, 311], [0, 0.15, 0.30], 0.15); break;
      }
    } catch { /* AudioContext bloqueado antes de interação do usuário — silencioso */ }
  }

  private playTones(freqs: number[], delays: number[], duration: number): void {
    freqs.forEach((freq, i) => {
      const osc    = this.ctx!.createOscillator();
      const gain   = this.ctx!.createGain();
      const start  = this.ctx!.currentTime + delays[i];

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.type      = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.start(start);
      osc.stop(start + duration + 0.05);
    });
  }
}
