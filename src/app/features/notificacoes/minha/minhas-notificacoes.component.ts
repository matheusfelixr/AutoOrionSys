import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  BadgeComponent,
  ButtonComponent,
  PageHeaderComponent,
  EmptyStateComponent,
} from 'ui-lib';
import { NotificacoesService } from '../../../core/services/notificacoes.service';
import { AuthService } from '../../../core/services/auth.service';
import { Notificacao } from '../../../core/models/notificacao.model';

type Filtro = 'todas' | 'nao-lidas' | 'lidas';

@Component({
  selector: 'app-minhas-notificacoes',
  standalone: true,
  imports: [
    BadgeComponent,
    ButtonComponent,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="notif-page">
      <ui-page-header
        title="Minhas Notificações"
        [total]="minhas().length"
      >
        <ui-button
          variant="ghost"
          size="sm"
          [disabled]="unread().length === 0"
          (click)="markAllRead()"
        >
          Marcar todas como lidas
        </ui-button>
      </ui-page-header>

      <!-- Filter tabs -->
      <div class="filter-tabs">
        <button
          class="filter-tab"
          [class.filter-tab--active]="filtro() === 'todas'"
          [class.filter-tab--inactive]="filtro() !== 'todas'"
          (click)="filtro.set('todas')"
        >
          Todas ({{ minhas().length }})
        </button>
        <button
          class="filter-tab"
          [class.filter-tab--active]="filtro() === 'nao-lidas'"
          [class.filter-tab--inactive]="filtro() !== 'nao-lidas'"
          (click)="filtro.set('nao-lidas')"
        >
          Não lidas ({{ unread().length }})
        </button>
        <button
          class="filter-tab"
          [class.filter-tab--active]="filtro() === 'lidas'"
          [class.filter-tab--inactive]="filtro() !== 'lidas'"
          (click)="filtro.set('lidas')"
        >
          Lidas
        </button>
      </div>

      <!-- List -->
      @if (shown().length === 0) {
        <ui-empty-state
          icon="🔔"
          title="Nenhuma notificação"
          description="Você não tem notificações nesta categoria."
        />
      } @else {
        <div class="notif-list">
          @for (n of shown(); track n.id) {
            <div
              class="notif-item notif-item--{{ n.tipo }}"
              [class.notif-item--unread]="!notifService.isRead(n.id, currentUserId())"
              (click)="onCardClick(n)"
            >
              @if (!notifService.isRead(n.id, currentUserId())) {
                <div class="unread-dot"></div>
              }
              <div class="notif-body">
                <div class="notif-header-row">
                  <span class="notif-titulo" [class.notif-titulo--unread]="!notifService.isRead(n.id, currentUserId())">
                    {{ tipoIcon(n.tipo) }} {{ n.titulo }}
                  </span>
                  <ui-badge [variant]="tipoVariant(n.tipo)">{{ n.tipo }}</ui-badge>
                </div>
                <p class="notif-msg">{{ n.mensagem }}</p>
                <div class="notif-meta">
                  <span>{{ tempoRelativo(n.criadaEm) }}</span>
                  @if (n.link) {
                    <ui-button variant="ghost" size="sm" (click)="$event.stopPropagation(); navigate(n)">
                      Ver →
                    </ui-button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .notif-page { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.25rem; width: 100%; box-sizing: border-box; }
    .filter-tabs { display: flex; flex-direction: row; gap: 0.5rem; }
    .filter-tab { padding: 0.375rem 0.875rem; border: none; border-radius: 9999px; font-size: 0.875rem; cursor: pointer; font-family: var(--ui-font-family); transition: background 0.15s; }
    .filter-tab--active { background: var(--ui-color-primary); color: white; font-weight: 600; }
    .filter-tab--inactive { background: var(--ui-color-bg-subtle); color: var(--ui-color-text-secondary); }
    .filter-tab--inactive:hover { background: var(--ui-color-bg-base); }
    .notif-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .notif-item { display: flex; flex-direction: row; gap: 1rem; padding: 1rem; border-radius: var(--ui-radius-lg); border: 1px solid var(--ui-color-border); background: var(--ui-color-bg-base); cursor: pointer; transition: background 0.15s, border-color 0.15s; border-left: 3px solid transparent; }
    .notif-item:hover { background: var(--ui-color-bg-subtle); border-color: var(--ui-color-primary); }
    .notif-item--unread { background: rgba(45,125,210,0.04); }
    .notif-item--info.notif-item--unread { border-left-color: #3b82f6; }
    .notif-item--sucesso.notif-item--unread { border-left-color: #10b981; }
    .notif-item--aviso.notif-item--unread { border-left-color: #f59e0b; }
    .notif-item--erro.notif-item--unread { border-left-color: #ef4444; }
    .unread-dot { width: 8px; height: 8px; border-radius: 9999px; background: var(--ui-color-primary); flex-shrink: 0; margin-top: 6px; }
    .notif-body { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
    .notif-header-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .notif-titulo { font-size: 0.875rem; font-weight: 600; flex: 1; }
    .notif-titulo--unread { font-weight: 700; }
    .notif-msg { font-size: 0.875rem; color: var(--ui-color-text-secondary); margin: 0; }
    .notif-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--ui-color-text-muted); margin-top: 0.25rem; }
  `],
})
export class MinhasNotificacoesComponent {
  notifService = inject(NotificacoesService);
  private authService = inject(AuthService);
  private router = inject(Router);

  filtro = signal<Filtro>('todas');

  minhas = computed(() =>
    this.notifService.getForUser(
      this.authService.currentUser()?.id ?? '',
      this.authService.currentUser()?.perfil ?? '',
    )
  );

  unread = computed(() =>
    this.minhas().filter(n => !this.notifService.isRead(n.id, this.currentUserId()))
  );

  shown = computed(() => {
    if (this.filtro() === 'nao-lidas') return this.unread();
    if (this.filtro() === 'lidas')
      return this.minhas().filter(n => this.notifService.isRead(n.id, this.currentUserId()));
    return this.minhas();
  });

  currentUserId(): string { return this.authService.currentUser()?.id ?? ''; }

  onCardClick(n: Notificacao): void {
    this.notifService.markAsRead(n.id, this.currentUserId());
    if (n.link) this.router.navigateByUrl(n.link);
  }

  navigate(n: Notificacao): void {
    this.notifService.markAsRead(n.id, this.currentUserId());
    if (n.link) this.router.navigateByUrl(n.link);
  }

  markAllRead(): void {
    const u = this.authService.currentUser();
    if (!u) return;
    this.notifService.markAllAsRead(u.id, u.perfil);
  }

  tipoIcon(tipo: string): string {
    const map: Record<string, string> = { info: '🔵', sucesso: '✅', aviso: '⚠️', erro: '❌' };
    return map[tipo] ?? '🔔';
  }

  tipoVariant(tipo: string): 'primary' | 'success' | 'warning' | 'danger' | 'neutral' {
    const map: Record<string, any> = { info: 'primary', sucesso: 'success', aviso: 'warning', erro: 'danger' };
    return map[tipo] ?? 'neutral';
  }

  tempoRelativo(date: Date): string {
    const diffMs  = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH   = Math.floor(diffMs / 3600000);
    const diffD   = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffH < 24) return `há ${diffH}h`;
    return `há ${diffD} dia(s)`;
  }
}
