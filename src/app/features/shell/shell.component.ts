import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { SidebarComponent, AvatarComponent, NavGroup } from 'ui-lib';
import { AuthService } from '../../core/services/auth.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { MenusService } from '../../core/services/menus.service';
import { TelasService } from '../../core/services/telas.service';
import { NotificacoesService } from '../../core/services/notificacoes.service';
import { NotificationSoundService } from '../../core/services/notification-sound.service';
import { environment } from '../../../environments/environment';

const SECTION_LABELS: Record<string, string> = {
  home:                  'Início',
  usuarios:              'Usuários',
  'usuarios-group':      'Usuários',
  perfis:                'Perfis de Acesso',
  perfil:                'Meu Perfil',
  'config/telas':        'Telas do Sistema',
  'config/menus':        'Menus',
  'config-group':        'Configurações',
  'config.telas':        'Telas do Sistema',
  'config.menus':        'Menus',
  'notificacoes':        'Minhas Notificações',
  'notificacoes-group':  'Notificações',
  'notificacoes.admin':  'Gerenciar Notificações',
  'parametros':          'Parâmetros',
  'parametros-group':    'Parâmetros',
  'parametros.grupos':   'Grupos de Parâmetros',
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, AvatarComponent],
  template: `
    @if (!networkStatus.isOnline()) {
      <div class="offline-banner">
        ⚠️ Sem conexão com a internet. Algumas funcionalidades podem não estar disponíveis.
      </div>
    }

    <!-- Mobile overlay backdrop -->
    @if (sidebarOpen()) {
      <div class="mobile-sidebar-backdrop" (click)="sidebarOpen.set(false)"></div>
    }

    <div class="shell">
      <div class="sidebar-wrapper" [class.sidebar-open]="sidebarOpen()">
        <ui-sidebar
          brand="FlexSys"
          brandIcon="🚗"
          [groups]="navGroups()"
          [collapsible]="true"
          [activeId]="activeId()"
          (itemClick)="onNavClick($event); sidebarOpen.set(false)"
        />
      </div>
      <div class="shell-main">
        <!-- Topbar -->
        <header class="shell-topbar">
          <div class="topbar-left">
            <button class="topbar-btn hamburger-btn" (click)="sidebarOpen.set(!sidebarOpen())" title="Menu">
              ☰
            </button>
            <span class="topbar-section">{{ sectionLabel() }}</span>
          </div>
          <div class="topbar-right">
            <!-- Dark mode toggle -->
            <button class="topbar-btn" (click)="toggleDark()" [title]="isDark() ? 'Modo claro' : 'Modo escuro'">
              {{ isDark() ? '☀️' : '🌙' }}
            </button>

            <!-- Sound toggle -->
            <button
              class="topbar-btn sound-toggle"
              [title]="notifSound.soundEnabled() ? 'Desativar som' : 'Ativar som'"
              (click)="notifSound.toggleSound()"
            >
              {{ notifSound.soundEnabled() ? '🔔' : '🔕' }}
            </button>

            <!-- Notification bell -->
            <div class="notif-wrapper" style="position:relative">
              <button class="topbar-btn notif-btn" title="Notificações"
                (click)="notifPanelOpen.set(!notifPanelOpen()); $event.stopPropagation()">
                🔔
                @if (notifCount() > 0) {
                  <span class="notif-badge">{{ notifCount() > 9 ? '9+' : notifCount() }}</span>
                }
              </button>

              @if (notifPanelOpen()) {
                <div class="notif-dropdown" (click)="$event.stopPropagation()">
                  <div class="notif-dropdown__header">
                    <span class="notif-dropdown__title">Notificações</span>
                    @if (notifCount() > 0) {
                      <button class="notif-mark-all-btn"
                        (click)="markAllNotifRead()">
                        Marcar todas como lidas
                      </button>
                    }
                  </div>
                  @if (recentNotifs().length === 0) {
                    <div class="notif-dropdown__empty">Nenhuma notificação</div>
                  } @else {
                    <div class="notif-dropdown__list">
                      @for (n of recentNotifs(); track n.id) {
                        <div class="notif-dropdown__item"
                          [class.notif-dropdown__item--unread]="!notifService.isRead(n.id, user()!.id)"
                          [class.notif-dropdown__item--info]="n.tipo === 'info'"
                          [class.notif-dropdown__item--sucesso]="n.tipo === 'sucesso'"
                          [class.notif-dropdown__item--aviso]="n.tipo === 'aviso'"
                          [class.notif-dropdown__item--erro]="n.tipo === 'erro'"
                          (click)="onNotifClick(n)">
                          <span class="notif-dropdown__icon">{{ notifIcon(n.tipo) }}</span>
                          <div class="notif-dropdown__body">
                            <span class="notif-dropdown__titulo">{{ n.titulo }}</span>
                            <span class="notif-dropdown__msg">{{ n.mensagem }}</span>
                            <span class="notif-dropdown__time">{{ timeAgo(n.criadaEm) }}</span>
                          </div>
                        </div>
                      }
                    </div>
                    <div class="notif-dropdown__footer">
                      <button class="notif-ver-todas-btn" (click)="verTodasNotifs()">
                        Ver todas as notificações →
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- User menu -->
            <div class="user-section" (click)="toggleUserMenu()">
              <ui-avatar
                [name]="user()?.nome ?? ''"
                [src]="user()?.avatarUrl"
                size="sm"
                variant="circle"
              />
              <span class="user-name">{{ firstName() }}</span>
              <span class="user-chevron" [class.open]="userMenuOpen()">▼</span>

              @if (userMenuOpen()) {
                <div class="user-menu-dropdown" (click)="$event.stopPropagation()">
                  <div class="user-menu-header">
                    <span class="user-menu-name">{{ user()?.nome }}</span>
                    <span class="user-menu-email">{{ user()?.email }}</span>
                  </div>
                  <div class="user-menu-divider"></div>
                  <button class="user-menu-item" (click)="goToProfile()">
                    <span>👤</span> Meu Perfil
                  </button>
                  <div class="user-menu-divider"></div>
                  <button class="user-menu-item user-menu-danger" (click)="logout()">
                    <span>🚪</span> Sair
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <!-- Main content -->
        <main class="shell-body">
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- Backdrop for user menu -->
    @if (userMenuOpen()) {
      <div class="menu-backdrop" (click)="userMenuOpen.set(false); notifPanelOpen.set(false)"></div>
    }
  `,

  styles: [`
    .offline-banner {
      background: var(--ui-color-warning, #ED8936);
      color: white;
      text-align: center;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    /* Mobile sidebar overlay backdrop */
    .mobile-sidebar-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 149;
    }

    .shell {
      display: flex;
      min-height: 100vh;
    }

    /* Sidebar wrapper for mobile positioning */
    .sidebar-wrapper {
      display: contents;
    }

    .shell-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }

    .shell-body {
      flex: 1;
      overflow-y: auto;
      background: var(--ui-color-bg-subtle);
    }

    /* Topbar */
    .shell-topbar {
      height: 56px;
      background: #0d0f18;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      position: sticky;
      top: 0;
      z-index: 100;
      flex-shrink: 0;
    }

    /* Hamburger button — hidden on desktop, shown on mobile */
    .hamburger-btn {
      display: none;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .topbar-section {
      color: white;
      font-size: 0.9375rem;
      font-weight: 600;
      letter-spacing: -0.2px;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .topbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: none;
      border: none;
      border-radius: var(--ui-radius-md);
      cursor: pointer;
      font-size: 1.1rem;
      transition: background var(--ui-transition-fast);
      position: relative;
    }

    .topbar-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .sound-toggle {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
      padding: 0.25rem 0.4rem;
      border-radius: var(--ui-radius-sm);
      opacity: 0.7;
      transition: opacity var(--ui-transition-fast);
    }
    .sound-toggle:hover { opacity: 1; }

    .notif-btn {
      position: relative;
    }

    .notif-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: #ef4444;
      color: white;
      font-size: 0.6rem;
      font-weight: 700;
      width: 14px;
      height: 14px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #0d0f18;
    }

    /* User section */
    .user-section {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      border-radius: var(--ui-radius-md);
      cursor: pointer;
      transition: background var(--ui-transition-fast);
      position: relative;
      margin-left: 0.25rem;
    }

    .user-section:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .user-name {
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .user-chevron {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.65rem;
      transition: transform var(--ui-transition-fast);
      display: inline-block;
    }

    .user-chevron.open {
      transform: rotate(180deg);
    }

    /* User dropdown */
    .user-menu-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 220px;
      background: var(--ui-color-bg-base);
      border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-lg);
      box-shadow: var(--ui-shadow-lg);
      z-index: 200;
      overflow: hidden;
    }

    .user-menu-header {
      padding: 0.875rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .user-menu-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ui-color-text-primary);
    }

    .user-menu-email {
      font-size: 0.75rem;
      color: var(--ui-color-text-muted);
      word-break: break-all;
    }

    .user-menu-divider {
      height: 1px;
      background: var(--ui-color-border);
    }

    .user-menu-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      width: 100%;
      padding: 0.625rem 1rem;
      background: none;
      border: none;
      font-size: 0.875rem;
      color: var(--ui-color-text-primary);
      cursor: pointer;
      transition: background var(--ui-transition-fast);
      font-family: var(--ui-font-family);
      text-align: left;
    }

    .user-menu-item:hover {
      background: var(--ui-color-bg-subtle);
    }

    .user-menu-danger {
      color: #dc2626;
    }

    .user-menu-danger:hover {
      background: rgba(239, 68, 68, 0.06);
    }

    /* Backdrop */
    .menu-backdrop {
      position: fixed;
      inset: 0;
      z-index: 99;
    }

    /* Banner de acesso negado */
    .acesso-negado-banner {
      padding: 1rem 1.5rem 0;
    }

    /* Notification dropdown */
    .notif-wrapper { position: relative; }
    .notif-dropdown {
      position: absolute; top: calc(100% + 8px); right: -8px;
      width: 360px; background: var(--ui-color-bg-base);
      border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-lg); box-shadow: var(--ui-shadow-xl);
      z-index: 300; overflow: hidden;
    }
    .notif-dropdown__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.875rem 1rem; border-bottom: 1px solid var(--ui-color-border);
      background: var(--ui-color-bg-subtle);
    }
    .notif-dropdown__title { font-size: 0.875rem; font-weight: 700; color: var(--ui-color-text-primary); }
    .notif-mark-all-btn {
      background: none; border: none; font-size: 0.7rem; color: var(--ui-color-primary);
      cursor: pointer; font-family: var(--ui-font-family); padding: 0;
    }
    .notif-mark-all-btn:hover { text-decoration: underline; }
    .notif-dropdown__empty {
      padding: 2rem 1rem; text-align: center;
      font-size: 0.875rem; color: var(--ui-color-text-muted);
    }
    .notif-dropdown__list { max-height: 320px; overflow-y: auto; }
    .notif-dropdown__item {
      display: flex; gap: 0.75rem; padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--ui-color-border); cursor: pointer;
      transition: background 0.15s; border-left: 3px solid transparent;
    }
    .notif-dropdown__item:hover { background: var(--ui-color-bg-subtle); }
    .notif-dropdown__item:last-child { border-bottom: none; }
    .notif-dropdown__item--unread { background: rgba(45,125,210,0.04); }
    .notif-dropdown__item--unread.notif-dropdown__item--info { border-left-color: #3b82f6; }
    .notif-dropdown__item--unread.notif-dropdown__item--sucesso { border-left-color: #10b981; }
    .notif-dropdown__item--unread.notif-dropdown__item--aviso { border-left-color: #f59e0b; }
    .notif-dropdown__item--unread.notif-dropdown__item--erro { border-left-color: #ef4444; }
    .notif-dropdown__icon { font-size: 1rem; flex-shrink: 0; margin-top: 2px; }
    .notif-dropdown__body { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .notif-dropdown__titulo { font-size: 0.8125rem; font-weight: 600; color: var(--ui-color-text-primary); }
    .notif-dropdown__msg {
      font-size: 0.75rem; color: var(--ui-color-text-secondary);
      overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .notif-dropdown__time {
      font-size: 0.6875rem; color: var(--ui-color-text-muted); margin-top: 2px;
    }
    .notif-dropdown__footer {
      padding: 0.625rem 1rem; border-top: 1px solid var(--ui-color-border);
      background: var(--ui-color-bg-subtle); text-align: center;
    }
    .notif-ver-todas-btn {
      background: none; border: none; font-size: 0.8125rem; color: var(--ui-color-primary);
      cursor: pointer; font-family: var(--ui-font-family); font-weight: 600;
    }
    .notif-ver-todas-btn:hover { text-decoration: underline; }

    /* ── Mobile responsive ── */
    @media (max-width: 768px) {
      .mobile-sidebar-backdrop {
        display: block;
      }
      .sidebar-wrapper {
        display: block;
        position: fixed;
        top: 0;
        left: -280px;
        height: 100vh;
        z-index: 150;
        transition: left 0.25s ease;
      }
      .sidebar-wrapper.sidebar-open {
        left: 0;
      }
      .hamburger-btn {
        display: flex;
      }
      /* Hide user name on small screens to save space */
      .user-name {
        display: none;
      }
      /* Notification dropdown: full width on mobile */
      .notif-dropdown {
        width: calc(100vw - 2rem);
        right: -4rem;
      }
    }

    @media (max-width: 480px) {
      .shell-topbar {
        padding: 0 0.75rem;
      }
      .topbar-section {
        font-size: 0.875rem;
      }
    }
  `],
})
export class ShellComponent implements OnInit {

  ngOnInit(): void {
    // Valida sessão no startup — se backend reiniciou (DB reset), desloga automaticamente
    if (!environment.useMockData) {
      this.auth.validateSession().subscribe(valid => {
        if (!valid) {
          this.router.navigate(['/login']);
          return;
        }
        // Sessão válida — carrega dados do menu e inicia notificações em tempo real
        this.menusService.getAll().subscribe();
        this.telasService.getAll().subscribe();
        this.notifService.init();
      });
    } else {
      this.menusService.getAll().subscribe();
      this.telasService.getAll().subscribe();
      // Mock mode: init loads mock data (no-op for WS)
      this.notifService.init();
    }
  }
  private router = inject(Router);
  private auth   = inject(AuthService);
  private perms  = inject(PermissionsService);
  networkStatus  = inject(NetworkStatusService);
  private menusService = inject(MenusService);
  private telasService = inject(TelasService);
  notifService = inject(NotificacoesService);
  notifSound   = inject(NotificationSoundService);

  user = this.auth.currentUser;

  isDark         = signal(false);
  userMenuOpen   = signal(false);
  notifPanelOpen = signal(false);
  sidebarOpen    = signal(false);

  constructor() {
    // Restaura o tema do usuário logado sempre que ele muda (login/troca de conta)
    effect(() => {
      const userId = this.user()?.id;
      if (!userId) return;
      const saved = localStorage.getItem(`flexsys-dark-${userId}`);
      const dark  = saved === 'true';
      this.isDark.set(dark);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }, { allowSignalWrites: true });
  }

  notifCount = computed(() => {
    const u = this.user();
    if (!u) return 0;
    return this.notifService.unreadCount(u.id, u.perfil);
  });

  recentNotifs = computed(() => {
    const u = this.user();
    if (!u) return [];
    return this.notifService.getForUser(u.id, u.perfil).slice(0, 5);
  });

  private _urlToActiveId(url: string): string {
    // Strip leading slash and query params
    const path = url.replace(/^\//, '').split('?')[0];
    // For nested config routes like 'config/telas' return full path
    if (path.startsWith('config/')) return path;
    return path.split('/')[0] || 'home';
  }

  activeId = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => this._urlToActiveId((e as NavigationEnd).url)),
    ),
    { initialValue: this._urlToActiveId(this.router.url) },
  );

  sectionLabel = computed(() => SECTION_LABELS[this.activeId()] ?? 'Início');

  firstName = computed(() => this.user()?.nome.split(' ')[0] ?? '');

  navGroups = computed<NavGroup[]>(() => {
    const grupos = this.menusService.menus()
      .filter(g => g.ativo)
      .sort((a, b) => a.ordem - b.ordem);
    const telas  = this.telasService.telas().filter(t => t.ativo);

    const canSee = (s: string): boolean =>
      s === 'sair' || s.endsWith('-group') || this.perms.can(s as any);

    const homeGroup: NavGroup = {
      label: '',
      items: [{ id: 'home', label: 'Início', icon: '🏠' } as any],
    };

    const dynamicGroups = grupos.map(grupo => {
      const topLevel = telas
        .filter(t => t.menuId === grupo.id && !t.parentScreenName)
        .sort((a, b) => a.ordem - b.ordem);

      const items: NavGroup['items'] = topLevel
        .filter(t => {
          if (!canSee(t.screenName)) return false;
          if (t.screenName.endsWith('-group')) {
            const children = telas.filter(c => c.parentScreenName === t.screenName);
            return children.some(c => canSee(c.screenName));
          }
          return true;
        })
        .map(t => {
          const children = telas
            .filter(c => c.parentScreenName === t.screenName && canSee(c.screenName))
            .sort((a, b) => a.ordem - b.ordem)
            .map(c => ({ id: c.screenName, label: c.nome }));

          const navItem: any = { id: t.screenName, label: t.nome };
          if (t.icone) navItem['icon'] = t.icone;
          if (children.length) navItem['children'] = children;
          return navItem;
        });

      return { label: grupo.nome, items };
    }).filter(g => g.items.length > 0);

    return [homeGroup, ...dynamicGroups];
  });

  toggleUserMenu(): void { this.userMenuOpen.update(v => !v); }

  toggleDark(): void {
    this.isDark.update(v => !v);
    const dark   = this.isDark();
    const userId = this.user()?.id;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    // Persiste preferência por usuário
    if (userId) {
      localStorage.setItem(`flexsys-dark-${userId}`, String(dark));
    }
  }

  onNavClick(item: any): void {
    if (item.id === 'sair') {
      this.auth.logout();
      this.router.navigate(['/login']);
      return;
    }
    if (item.children?.length) return; // handled by sidebar (submenu toggle)

    // Convert screenName to route path (dots become slashes for config.* items)
    const path = item.id.includes('.')
      ? '/' + item.id.replace('.', '/')
      : '/' + item.id;
    this.router.navigateByUrl(path);
  }

  goToProfile(): void {
    this.userMenuOpen.set(false);
    this.router.navigate(['/perfil']);
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  notifIcon(tipo: string): string {
    const m: Record<string, string> = { info: 'ℹ️', sucesso: '✅', aviso: '⚠️', erro: '❌' };
    return m[tipo] ?? '🔔';
  }

  timeAgo(date: Date): string {
    const now = Date.now();
    const diff = now - new Date(date).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'agora';
    if (mins < 60)  return `${mins}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days === 1) return 'ontem';
    return `${days}d atrás`;
  }

  markAllNotifRead(): void {
    const u = this.user();
    if (!u) return;
    this.notifService.markAllAsRead(u.id, u.perfil);
  }

  onNotifClick(n: any): void {
    const u = this.user();
    if (u) this.notifService.markAsRead(n.id, u.id);
    this.notifPanelOpen.set(false);
    if (n.link) this.router.navigateByUrl(n.link);
  }

  verTodasNotifs(): void {
    this.notifPanelOpen.set(false);
    this.router.navigate(['/notificacoes']);
  }
}
