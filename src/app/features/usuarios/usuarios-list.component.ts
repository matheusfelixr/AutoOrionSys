import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CardComponent,
  CardHeaderComponent,
  CardBodyComponent,
  BadgeComponent,
  AvatarComponent,
  ButtonComponent,
  InputComponent,
  SelectComponent,
  PaginationComponent,
  ModalComponent,
  ToastService,
  LoadingComponent,
  ToggleComponent,
  PhotoCaptureComponent,
  CapturedPhoto,
  PageHeaderComponent,
  SearchBarComponent,
  EmptyStateComponent,
} from 'ui-lib';
import { UsuariosService } from '../../core/services/usuarios.service';
import { Usuario, PerfilUsuario, StatusUsuario } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth.service';
import { RelatorioService } from '../../core/services/relatorio.service';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [
    FormsModule,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    BadgeComponent,
    AvatarComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    PaginationComponent,
    ModalComponent,
    LoadingComponent,
    ToggleComponent,
    PhotoCaptureComponent,
    PageHeaderComponent,
    SearchBarComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="page">

      <!-- Page Header -->
      <ui-page-header title="Usuários" subtitle="Gerenciamento de usuários do sistema" [total]="filtered().length">
        <div actions style="display:flex;gap:0.75rem;align-items:center;">
          <div class="export-menu">
            <ui-button variant="secondary" iconRight="▾" (clicked)="exportMenuOpenUsuarios.set(!exportMenuOpenUsuarios())">Exportar</ui-button>
            @if (exportMenuOpenUsuarios()) {
              <div class="export-dropdown">
                <button (click)="exportarCSV(); exportMenuOpenUsuarios.set(false)">📄 CSV</button>
                <button (click)="imprimirRelatorio(); exportMenuOpenUsuarios.set(false)">🖨️ PDF / Imprimir</button>
              </div>
            }
          </div>
          <ui-button variant="primary" iconLeft="+" (clicked)="openCreate()">Novo Usuário</ui-button>
        </div>
      </ui-page-header>

      <!-- Search Bar -->
      <ui-search-bar
        [campoBuscaOptions]="campoBuscaOptions"
        [campoBusca]="campoBusca()"
        [placeholder]="campoBuscaPlaceholder"
        [totalResults]="filtered().length"
        totalLabel="usuário(s) encontrado(s)"
        [isLoading]="isLoading()"
        [hasActiveFilters]="!!(busca() || perfilFiltro() || statusFiltro())"
        (searchChange)="onSearch($event)"
        (campoBuscaChange)="campoBusca.set($event)"
        (clearFilters)="clearAllFilters()"
      >
        <ui-select filters label="Perfil" [options]="perfilOptions" [ngModel]="perfilFiltro()" (ngModelChange)="perfilFiltro.set($event); onDiscreteFilterChange()" />
        <ui-select filters label="Status" [options]="statusOptions" [ngModel]="statusFiltro()" (ngModelChange)="statusFiltro.set($event); onDiscreteFilterChange()" />
      </ui-search-bar>

      <!-- User List -->
      <ui-card>
        <ui-card-header>Usuários</ui-card-header>
        <ui-card-body>
          <div class="user-list">
            <!-- Sort header -->
            <div class="sort-header">
              <div></div> <!-- avatar placeholder -->
              <button class="sort-btn" (click)="toggleSort('nome')">
                Nome {{ sortIcon('nome') }}
              </button>
              <button class="sort-btn" (click)="toggleSort('perfil')">
                Perfil {{ sortIcon('perfil') }}
              </button>
              <button class="sort-btn" (click)="toggleSort('ultimoAcesso')">
                Último acesso {{ sortIcon('ultimoAcesso') }}
              </button>
              <div></div> <!-- actions placeholder -->
            </div>
            @for (u of paginatedUsers(); track u.id) {
              <div class="user-row">
                <ui-avatar [name]="u.nome" [src]="u.avatarUrl" size="md" />
                <div class="user-info">
                  <strong>{{ u.nome }}</strong>
                  <span>{{ u.email }}</span>
                  <span>{{ u.cargo }}</span>
                </div>
                <!-- Badge "você" + último acesso -->
                <div class="user-meta">
                  @if (u.id === currentUserId()) {
                    <span class="you-badge">você</span>
                  }
                  <span class="last-access">{{ formatDate(u.ultimoAcesso) }}</span>
                </div>
                <div class="user-badges">
                  <ui-badge [variant]="perfilVariant(u.perfil)">{{ u.perfil }}</ui-badge>
                </div>
                <div class="status-toggle-col">
                  <ui-toggle
                    [ngModel]="u.status === 'ativo'"
                    (ngModelChange)="toggleStatus(u)"
                    [label]="u.status === 'ativo' ? 'Ativo' : 'Inativo'"
                  />
                </div>
                <div class="user-actions">
                  <ui-button variant="ghost" size="sm" iconLeft="✏️" (clicked)="openEdit(u)">
                    Editar
                  </ui-button>
                  <ui-button
                    variant="ghost"
                    size="sm"
                    iconLeft="🗑"
                    style="color: var(--ui-color-danger)"
                    (clicked)="confirmDelete(u)"
                  >
                    Excluir
                  </ui-button>
                </div>
              </div>
            } @empty {
              <ui-empty-state icon="👥" title="Nenhum usuário encontrado" description="Tente ajustar os filtros ou crie um novo usuário." />
            }
          </div>
          <ui-pagination
            [currentPage]="page()"
            [totalPages]="totalPages()"
            (pageChange)="page.set($event)"
          />
        </ui-card-body>
      </ui-card>

    </div>

    <!-- Create/Edit Modal -->
    <ui-modal
      [open]="modalOpen()"
      [title]="editingId() ? 'Editar Usuário' : 'Novo Usuário'"
      size="lg"
      (closed)="onModalXClose()"
    >
      <div class="modal-form">

        <!-- Banner de confirmação de descarte -->
        @if (confirmDiscard()) {
          <div class="discard-banner">
            <span class="discard-banner__icon">⚠️</span>
            <div class="discard-banner__text">
              <strong>Alterações não salvas</strong>
              <span>Se fechar, todas as informações editadas serão perdidas.</span>
            </div>
            <div class="discard-banner__actions">
              <ui-button variant="ghost" size="sm" (clicked)="continueEditing()">Continuar editando</ui-button>
              <ui-button variant="danger" size="sm" (clicked)="discardChanges()">Descartar</ui-button>
            </div>
          </div>
        }
        <div class="modal-form-row">
          <ui-input
            label="Nome"
            placeholder="Nome completo"
            [required]="true"
            [ngModel]="form.nome"
            (ngModelChange)="form.nome = $event; markDirty()"
            [errorMessage]="formErrors['nome'] || ''"
          />
          <ui-input
            label="E-mail"
            placeholder="email@exemplo.com"
            type="email"
            [required]="true"
            [ngModel]="form.email"
            (ngModelChange)="form.email = $event; markDirty()"
            [errorMessage]="formErrors['email'] || ''"
          />
        </div>
        <div class="modal-form-row">
          <ui-input
            label="Cargo"
            placeholder="Ex: Engenheiro Civil"
            [required]="true"
            [ngModel]="form.cargo"
            (ngModelChange)="form.cargo = $event; markDirty()"
            [errorMessage]="formErrors['cargo'] || ''"
          />
          <ui-input
            label="Telefone"
            placeholder="(48) 99999-9999"
            type="tel"
            [ngModel]="form.telefone"
            (ngModelChange)="form.telefone = $event; markDirty()"
          />
        </div>
        <div class="modal-form-row">
          <ui-select
            label="Perfil"
            [options]="perfilFormOptions"
            [required]="true"
            [ngModel]="form.perfil"
            (ngModelChange)="form.perfil = $event; markDirty()"
            [errorMessage]="formErrors['perfil'] || ''"
          />
          <ui-select
            label="Status"
            [options]="statusFormOptions"
            [ngModel]="form.status"
            (ngModelChange)="form.status = $event; markDirty()"
          />
        </div>

        <!-- Seção de foto (colapsável) -->
        <div class="foto-section">
          <button class="foto-toggle-btn" type="button" (click)="showFotoSection.set(!showFotoSection())">
            <span>📷 {{ showFotoSection() ? 'Ocultar' : 'Adicionar foto do usuário' }}</span>
            <span class="foto-toggle-chevron" [class.open]="showFotoSection()">▼</span>
          </button>
          @if (showFotoSection()) {
            <div class="foto-inner">
              @if (fotoUsuario()) {
                <div class="foto-preview-row">
                  <img [src]="fotoUsuario()!.previewUrl" class="foto-preview" alt="Foto do usuário" />
                  <div class="foto-preview-info">
                    <span class="foto-preview-name">Foto capturada</span>
                    <button class="foto-remove-btn" type="button" (click)="fotoUsuario.set(null)">Remover</button>
                  </div>
                </div>
              } @else {
                <ui-photo-capture
                  titulo="Foto do Usuário"
                  [maxPhotos]="1"
                  [etapas]="[]"
                  (photosChange)="onFotoCapturada($event)"
                />
              }
            </div>
          }
        </div>

        <div class="modal-footer">
          <ui-button variant="ghost" (clicked)="requestClose()">Cancelar</ui-button>
          <ui-button variant="primary" [loading]="saving()" (clicked)="save()">Salvar</ui-button>
        </div>
      </div>
    </ui-modal>

    <!-- Delete Confirmation Modal -->
    <ui-modal
      [open]="confirmDeleteOpen()"
      title="Confirmar exclusão"
      size="sm"
      (closed)="confirmDeleteOpen.set(false)"
    >
      <div class="delete-confirm-body">
        <p>
          Deseja realmente excluir o usuário
          <strong>{{ deletingUser()?.nome }}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div class="modal-footer">
          <ui-button variant="ghost" (clicked)="confirmDeleteOpen.set(false)">Cancelar</ui-button>
          <ui-button variant="danger" [loading]="deleting()" (clicked)="executeDelete()">Excluir</ui-button>
        </div>
      </div>
    </ui-modal>
  `,
  styles: [`
    .page {
      padding: 1.5rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;
      min-width: 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .page-header h2 {
      margin: 0;
      font-size: var(--ui-font-size-xl, 1.5rem);
    }

    .page-subtitle {
      margin: 0;
      font-size: var(--ui-font-size-sm, 0.875rem);
      color: var(--ui-color-text-secondary, #666);
    }

    .filters {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 640px) {
      .filters {
        grid-template-columns: 1fr;
      }
    }

    .filter-header-row { display: flex; justify-content: space-between; align-items: center; }
    .clear-filters-btn { background: none; border: none; font-size: var(--ui-font-size-xs, 0.75rem); color: var(--ui-color-danger, #e53e3e); cursor: pointer; padding: 2px 6px; border-radius: 4px; }
    .clear-filters-btn:hover { background: rgba(229,62,62,0.08); }
    .filter-search-group { display: flex; gap: 0.5rem; align-items: flex-end; grid-column: span 1; }
    .filter-campo { width: 130px; flex-shrink: 0; }
    .filter-status-row { margin-top: 0.75rem; min-height: 20px; }
    .search-feedback { display: flex; align-items: center; gap: 0.5rem; font-size: var(--ui-font-size-sm, 0.875rem); color: var(--ui-color-text-secondary, #666); }
    .results-count { font-size: var(--ui-font-size-sm, 0.875rem); color: var(--ui-color-text-secondary, #666); }

    .user-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .sort-header {
      display: grid;
      grid-template-columns: 42px 1fr auto auto auto;
      gap: 1rem;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid var(--ui-color-border, #e2e8f0);
      margin-bottom: 0.5rem;
    }
    .sort-btn {
      background: none;
      border: none;
      font-size: var(--ui-font-size-xs, 0.75rem);
      font-weight: var(--ui-font-weight-semibold, 600);
      color: var(--ui-color-text-muted, #999);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      padding: 0;
      text-align: left;
      white-space: nowrap;
      transition: color var(--ui-transition-fast, 0.15s ease);
      font-family: var(--ui-font-family);
    }
    .sort-btn:hover { color: var(--ui-color-primary, #3b82f6); }

    .user-row {
      display: grid;
      grid-template-columns: auto 1fr auto auto auto auto;
      align-items: center;
      gap: 1rem;
      padding: 0.875rem 1rem;
      border-radius: var(--ui-radius-md, 8px);
      background: var(--ui-color-bg-subtle, #f8f8f8);
      border: 1px solid var(--ui-color-border, #e2e8f0);
      transition: var(--ui-transition-fast, all 0.15s ease);
    }

    .user-row:hover {
      background: var(--ui-color-bg-base, #fff);
      border-color: var(--ui-color-primary, #3b82f6);
    }

    .user-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .user-info strong {
      font-size: 0.9rem;
    }

    .user-info span {
      font-size: 0.8rem;
      color: var(--ui-color-text-secondary, #666);
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      min-width: 80px;
    }
    .you-badge {
      display: inline-block;
      padding: 1px 7px;
      background: var(--ui-color-primary-light);
      color: var(--ui-color-primary-dark);
      border-radius: var(--ui-radius-full);
      font-size: 10px;
      font-weight: var(--ui-font-weight-bold);
      letter-spacing: 0.03em;
    }
    .last-access {
      font-size: var(--ui-font-size-xs, 0.75rem);
      color: var(--ui-color-text-muted, #999);
    }

    .user-badges {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .status-toggle-col {
      display: flex;
      align-items: center;
      min-width: 90px;
    }

    .user-actions {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .empty {
      color: var(--ui-color-text-secondary, #666);
      text-align: center;
      padding: 2rem;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .modal-form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 640px) {
      .modal-form-row {
        grid-template-columns: 1fr;
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid var(--ui-color-border, #e2e8f0);
    }

    .delete-confirm-body {
      padding: 1rem 0;
      font-size: var(--ui-font-size-sm, 0.875rem);
      color: var(--ui-color-text-secondary, #666);
      line-height: 1.6;
    }

    /* Banner de descarte de alterações */
    .discard-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.4);
      border-radius: var(--ui-radius-md, 8px);
      animation: banner-in 0.18s ease;
    }
    @keyframes banner-in {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .discard-banner__icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }
    .discard-banner__text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: var(--ui-font-size-sm, 0.875rem);
    }
    .discard-banner__text strong { color: var(--ui-color-text-primary, #1a1a1a); }
    .discard-banner__text span   { color: var(--ui-color-text-secondary, #666); }
    .discard-banner__actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-shrink: 0;
    }
    @media (max-width: 600px) {
      .discard-banner { flex-direction: column; }
      .discard-banner__actions { width: 100%; justify-content: flex-end; }
    }

    /* Foto section */
    .foto-section {
      border-top: 1px solid var(--ui-color-border, #e2e8f0);
      padding-top: 1rem;
    }
    .foto-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      background: none;
      border: 1px solid var(--ui-color-border, #e2e8f0);
      border-radius: var(--ui-radius-md, 8px);
      padding: 0.625rem 0.875rem;
      font-size: var(--ui-font-size-sm, 0.875rem);
      color: var(--ui-color-text-secondary, #666);
      cursor: pointer;
      font-family: var(--ui-font-family);
      transition: background var(--ui-transition-fast, 0.15s ease);
    }
    .foto-toggle-btn:hover { background: var(--ui-color-bg-subtle, #f8f8f8); }
    .foto-toggle-chevron { font-size: 0.65rem; transition: transform 0.2s ease; display: inline-block; }
    .foto-toggle-chevron.open { transform: rotate(180deg); }
    .foto-inner { margin-top: 0.875rem; }
    .foto-preview-row { display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--ui-color-bg-subtle, #f8f8f8); border-radius: var(--ui-radius-md, 8px); border: 1px solid var(--ui-color-border); }
    .foto-preview { width: 64px; height: 64px; object-fit: cover; border-radius: 50%; border: 2px solid var(--ui-color-primary, #3b82f6); flex-shrink: 0; }
    .foto-preview-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .foto-preview-name { font-size: var(--ui-font-size-sm, 0.875rem); font-weight: 500; }
    .foto-remove-btn { background: none; border: none; font-size: var(--ui-font-size-xs, 0.75rem); color: var(--ui-color-danger, #e53e3e); cursor: pointer; padding: 0; text-align: left; font-family: var(--ui-font-family); }
    .foto-remove-btn:hover { text-decoration: underline; }

    .export-menu { position: relative; }
    .export-dropdown {
      position: absolute; top: calc(100% + 4px); right: 0; z-index: 100;
      background: var(--ui-color-surface); border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-md); box-shadow: var(--ui-shadow-lg);
      min-width: 160px; overflow: hidden;
    }
    .export-dropdown button {
      display: block; width: 100%; padding: 0.6rem 1rem; text-align: left;
      background: none; border: none; cursor: pointer; font-size: var(--ui-font-size-sm);
      color: var(--ui-color-text); font-family: var(--ui-font-family);
      transition: background var(--ui-transition-fast);
    }
    .export-dropdown button:hover { background: var(--ui-color-surface-hover); }

    /* ── Mobile responsive ── */
    @media (max-width: 640px) {
      .page {
        padding: 1rem;
      }

      /* Hide sort header on mobile — it doesn't work well with column layout */
      .sort-header {
        display: none;
      }

      /* User row: switch to column layout */
      .user-row {
        grid-template-columns: auto 1fr;
        grid-template-rows: auto auto auto;
        gap: 0.5rem;
      }

      /* Avatar stays top-left, user-info next to it */
      .user-info {
        grid-column: 2;
        grid-row: 1;
      }

      /* Meta, badges, toggle, actions span both columns */
      .user-meta {
        grid-column: 1 / -1;
        flex-direction: row;
        align-items: center;
        min-width: unset;
        gap: 0.5rem;
      }

      .user-badges {
        grid-column: 1 / -1;
        flex-wrap: wrap;
      }

      .status-toggle-col {
        grid-column: 1 / -1;
        min-width: unset;
      }

      .user-actions {
        grid-column: 1 / -1;
        justify-content: flex-end;
      }
    }
  `],
})
export class UsuariosListComponent implements OnInit {
  private service     = inject(UsuariosService);
  private toast       = inject(ToastService);
  private authService = inject(AuthService);
  private relatorio   = inject(RelatorioService);

  exportMenuOpenUsuarios = signal(false);

  // ── Loading inicial ────────────────────────────────────────────────────────

  /** Indica que os dados estão sendo carregados do backend */
  isLoading = signal(false);

  ngOnInit(): void {
    this.isLoading.set(true);
    this.service.getAll().subscribe({
      next:     () => this.isLoading.set(false),
      error:    () => this.isLoading.set(false),
    });
  }

  // ── Filtros (padrão backend-ready) ────────────────────────────────────────

  /**
   * Por que um campo de busca específico?
   *
   * Busca em múltiplos campos → banco faz full scan:
   *   WHERE nome ILIKE '%x%' OR email ILIKE '%x%'  ← não usa índice
   *
   * Campo único → banco usa o índice da coluna:
   *   WHERE nome ILIKE '%carlos%'  ← usa INDEX ON usuarios(nome)
   *
   * Em produção: GET /api/usuarios?campo=nome&busca=carlos&perfil=admin&status=ativo&page=1&pageSize=8
   */

  /** Campo da busca textual — indexado no banco */
  campoBusca = signal('nome');

  /** Valor efetivo da busca — atualizado pelo SearchBarComponent via debounce */
  busca = signal('');

  /** Filtros discretos — passados como query params ao backend */
  perfilFiltro  = signal('');
  statusFiltro  = signal('');

  readonly campoBuscaOptions = [
    { label: 'Nome',   value: 'nome'  },
    { label: 'E-mail', value: 'email' },
    { label: 'Cargo',  value: 'cargo' },
  ];

  readonly campoBuscaPlaceholders: Record<string, string> = {
    nome:  'Ex: Carlos Mendes',
    email: 'Ex: carlos@flexsys',
    cargo: 'Ex: Engenheiro Civil',
  };

  get campoBuscaPlaceholder(): string {
    return this.campoBuscaPlaceholders[this.campoBusca()] ?? 'Buscar...';
  }

  /** Called by SearchBarComponent after debounce */
  onSearch(value: string): void {
    this.busca.set(value);
    this.page.set(1);
  }

  /** Filtros discretos: aplicados imediatamente (sem debounce) */
  onDiscreteFilterChange(): void {
    this.page.set(1);
  }

  clearAllFilters(): void {
    this.busca.set('');
    this.campoBusca.set('nome');
    this.perfilFiltro.set('');
    this.statusFiltro.set('');
    this.page.set(1);
  }

  // ── Paginação ─────────────────────────────────────────────────────────────

  page     = signal(1);
  readonly pageSize = 8;

  // ── Sort ──────────────────────────────────────────────────────────────────

  sortField = signal<string>('nome');
  sortDir   = signal<'asc' | 'desc'>('asc');

  toggleSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  sortIcon(field: string): string {
    if (this.sortField() !== field) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  // ── Lista filtrada (leitura direta dos signals) ───────────────────────────

  /**
   * Computed que filtra a lista local.
   * Em produção, este computed seria substituído pela resposta paginada do backend.
   * Os parâmetros mapeiam 1:1 para query params da API.
   */
  filtered = computed(() => {
    const q     = this.busca().toLowerCase().trim();
    const campo = this.campoBusca();   // ← signal lido diretamente
    const p     = this.perfilFiltro();
    const s     = this.statusFiltro();
    const list  = this.service.usuarios(); // ← signal lido diretamente (fix do bug)

    const result = (!q && !p && !s) ? list : list.filter(u => {
      // Busca em campo específico (backend: WHERE {campo} ILIKE '%{q}%')
      if (q) {
        const val = campo === 'email' ? u.email
                  : campo === 'cargo' ? u.cargo
                  : u.nome;
        if (!val.toLowerCase().includes(q)) return false;
      }
      // Filtros exatos (backend: AND perfil = '{p}' AND status = '{s}')
      if (p && u.perfil !== p) return false;
      if (s && u.status !== s) return false;
      return true;
    });

    // Sort
    const field = this.sortField();
    const dir   = this.sortDir();
    return [...result].sort((a, b) => {
      let va: string | number, vb: string | number;
      if (field === 'nome')              { va = a.nome;  vb = b.nome; }
      else if (field === 'perfil')       { va = a.perfil; vb = b.perfil; }
      else if (field === 'dataCadastro') { va = a.dataCadastro.getTime(); vb = b.dataCadastro.getTime(); }
      else                               { va = a.ultimoAcesso?.getTime() ?? 0; vb = b.ultimoAcesso?.getTime() ?? 0; }

      const cmp = typeof va === 'string'
        ? va.localeCompare(vb as string, 'pt-BR')
        : (va as number) - (vb as number);
      return dir === 'asc' ? cmp : -cmp;
    });
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize))
  );

  paginatedUsers = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  // ── AuthService / currentUser ─────────────────────────────────────────────

  currentUserId = computed(() => this.authService.currentUser()?.id ?? '');

  formatDate(date?: Date | string | null): string {
    if (!date) return 'nunca';
    // O backend retorna strings ISO — converte para Date se necessário
    const d = date instanceof Date ? date : new Date(date as string);
    if (isNaN(d.getTime())) return 'nunca';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  // ── Modal criar/editar ────────────────────────────────────────────────────

  modalOpen         = signal(false);
  confirmDeleteOpen = signal(false);
  editingId         = signal<string | null>(null);
  saving            = signal(false);
  deletingUser      = signal<Usuario | null>(null);
  deleting          = signal(false);

  /** True quando o usuário alterou algum campo sem salvar */
  formDirty    = signal(false);
  /** True quando exibe o banner de confirmação de descarte */
  confirmDiscard = signal(false);

  /** Foto do usuário no formulário */
  fotoUsuario    = signal<CapturedPhoto | null>(null);
  showFotoSection = signal(false);

  onFotoCapturada(photos: CapturedPhoto[]): void {
    const photo = photos[0];
    if (!photo) { this.fotoUsuario.set(null); return; }

    // Converte blob URL → data URL (base64) para persistir após o modal fechar.
    // O PhotoCaptureComponent revoga os blob URLs no ngOnDestroy,
    // então armazenamos a versão base64 para evitar ERR_FILE_NOT_FOUND.
    const reader = new FileReader();
    reader.onload = () => {
      this.fotoUsuario.set({ ...photo, previewUrl: reader.result as string });
      this.markDirty();
    };
    reader.readAsDataURL(photo.file);
  }

  form = {
    nome: '', email: '', cargo: '', telefone: '',
    perfil: 'visualizador' as PerfilUsuario,
    status: 'ativo'        as StatusUsuario,
  };
  formErrors: Record<string, string> = {};

  readonly perfilOptions = [
    { label: 'Todos',        value: ''            },
    { label: 'Admin',        value: 'admin'        },
    { label: 'Gerente',      value: 'gerente'      },
    { label: 'Técnico',      value: 'tecnico'      },
    { label: 'Visualizador', value: 'visualizador' },
  ];

  readonly statusOptions = [
    { label: 'Todos',  value: ''       },
    { label: 'Ativo',  value: 'ativo'  },
    { label: 'Inativo',value: 'inativo'},
  ];

  readonly perfilFormOptions = [
    { label: 'Admin',        value: 'admin'        },
    { label: 'Gerente',      value: 'gerente'      },
    { label: 'Técnico',      value: 'tecnico'      },
    { label: 'Visualizador', value: 'visualizador' },
  ];

  readonly statusFormOptions = [
    { label: 'Ativo',  value: 'ativo'  },
    { label: 'Inativo',value: 'inativo'},
  ];

  openCreate(): void {
    this._resetForm();
    this.editingId.set(null);
    this.modalOpen.set(true);
  }

  openEdit(u: Usuario): void {
    this.form = { nome: u.nome, email: u.email, cargo: u.cargo,
                  telefone: u.telefone ?? '', perfil: u.perfil, status: u.status };
    this.formErrors    = {};
    this.formDirty.set(false);
    this.confirmDiscard.set(false);
    this.editingId.set(u.id);

    // Carrega foto existente do usuário para preview
    if (u.avatarUrl) {
      this.fotoUsuario.set({
        id: 'existing',
        file: new File([], 'foto.jpg'),
        previewUrl: u.avatarUrl,
        description: '',
        timestamp: new Date(),
      });
      this.showFotoSection.set(true);
    } else {
      this.fotoUsuario.set(null);
      this.showFotoSection.set(false);
    }

    this.modalOpen.set(true);
  }

  /** Marca o formulário como modificado */
  markDirty(): void { this.formDirty.set(true); }

  /** Botão Cancelar — verifica se há alterações antes de fechar */
  requestClose(): void {
    if (this.formDirty()) {
      this.confirmDiscard.set(true);
    } else {
      this._doCloseModal();
    }
  }

  /** Evento (closed) do modal — disparado pelo botão X */
  onModalXClose(): void {
    if (this.formDirty()) {
      // Reabre o modal imediatamente e exibe o banner de confirmação
      setTimeout(() => this.modalOpen.set(true), 0);
      this.confirmDiscard.set(true);
    }
    // se não está sujo: modal fecha normalmente, limpamos o estado
    else { this._doCloseModal(); }
  }

  /** Usuário confirma que quer descartar as alterações */
  discardChanges(): void {
    this.confirmDiscard.set(false);
    this._doCloseModal();
  }

  /** Usuário decide continuar editando */
  continueEditing(): void {
    this.confirmDiscard.set(false);
  }

  /** Fecha o modal e reseta TUDO — cache zerado */
  private _doCloseModal(): void {
    this.modalOpen.set(false);
    this.formErrors = {};
    this.formDirty.set(false);
    this.confirmDiscard.set(false);
    this.fotoUsuario.set(null);
    this.showFotoSection.set(false);
    this._resetForm();
  }

  private _resetForm(): void {
    this.form = { nome: '', email: '', cargo: '', telefone: '',
                  perfil: 'visualizador', status: 'ativo' };
    this.formErrors = {};
  }

  private validateUsuarioForm(): boolean {
    this.formErrors = {};
    if (!this.form.nome?.trim())  this.formErrors['nome']  = 'Nome é obrigatório';
    if (!this.form.email?.trim()) this.formErrors['email'] = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email))
      this.formErrors['email'] = 'E-mail inválido';
    else {
      // Verifica duplicidade de e-mail (ignora o próprio registro em edição)
      const emailLower = this.form.email.toLowerCase();
      const duplicate = this.service.usuarios().find(u =>
        u.email.toLowerCase() === emailLower && u.id !== (this.editingId() ?? '')
      );
      if (duplicate) this.formErrors['email'] = 'Este e-mail já está cadastrado';
    }
    if (!this.form.cargo?.trim()) this.formErrors['cargo'] = 'Cargo é obrigatório';
    if (!this.form.perfil)        this.formErrors['perfil'] = 'Perfil é obrigatório';
    return Object.keys(this.formErrors).length === 0;
  }

  save(): void {
    if (!this.validateUsuarioForm()) return;
    this.saving.set(true);
    const id = this.editingId();

    // Inclui o avatarUrl (data URL da foto) se houver foto capturada
    const payload: any = { ...this.form };
    if (this.fotoUsuario()) {
      payload.avatarUrl = this.fotoUsuario()!.previewUrl;
    }

    const obs = id ? this.service.update(id, payload) : this.service.create(payload);
    obs.subscribe({
      next:  () => {
        this.toast.success(id ? 'Usuário atualizado!' : 'Usuário criado!');
        this.saving.set(false);
        // Se o usuário editou o próprio avatar, atualiza a topbar em tempo real
        if (id && id === this.authService.currentUser()?.id && payload.avatarUrl) {
          this.authService.updateCurrentUserAvatar(payload.avatarUrl);
        }
        this._doCloseModal();
      },
      error: () => { this.toast.error('Erro ao salvar.'); this.saving.set(false); },
    });
  }

  confirmDelete(u: Usuario): void {
    this.deletingUser.set(u);
    this.confirmDeleteOpen.set(true);
  }

  executeDelete(): void {
    const u = this.deletingUser();
    if (!u) return;
    this.deleting.set(true);
    this.service.delete(u.id).subscribe({
      next: () => {
        this.toast.success('Usuário excluído com sucesso!');
        this.confirmDeleteOpen.set(false);
        this.deletingUser.set(null);
        this.deleting.set(false);
      },
      error: () => {
        this.toast.error('Erro ao excluir.');
        this.deleting.set(false);
      },
    });
  }

  exportarCSV(): void {
    this.relatorio.exportarCSV(this.filtered() as Record<string, any>[], [
      { header: 'Nome', field: 'nome' },
      { header: 'E-mail', field: 'email' },
      { header: 'Cargo', field: 'cargo' },
      { header: 'Perfil', field: 'perfil' },
      { header: 'Status', field: 'status' },
      { header: 'Telefone', field: 'telefone' },
    ], 'usuarios');
  }

  imprimirRelatorio(): void {
    this.relatorio.imprimirTabela(
      'Relatório de Usuários',
      `${this.filtered().length} usuários encontrados`,
      this.filtered() as Record<string, any>[],
      [
        { header: 'Nome', field: 'nome' },
        { header: 'E-mail', field: 'email' },
        { header: 'Cargo', field: 'cargo' },
        { header: 'Perfil', field: 'perfil' },
        { header: 'Status', field: 'status' },
        { header: 'Telefone', field: 'telefone' },
      ]
    );
  }

  toggleStatus(u: Usuario): void {
    const novoStatus: 'ativo' | 'inativo' = u.status === 'ativo' ? 'inativo' : 'ativo';
    this.service.update(u.id, { status: novoStatus }).subscribe({
      next: () => this.toast.success(
        novoStatus === 'ativo' ? `${u.nome} ativado!` : `${u.nome} desativado!`
      ),
      error: () => this.toast.error('Erro ao alterar status.'),
    });
  }

  perfilVariant(perfil: PerfilUsuario): 'primary' | 'success' | 'warning' | 'danger' | 'neutral' {
    const map: Record<PerfilUsuario, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
      admin: 'danger', gerente: 'primary', tecnico: 'warning', visualizador: 'neutral',
    };
    return map[perfil];
  }
}
