import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CardComponent,
  CardBodyComponent,
  BadgeComponent,
  ButtonComponent,
  ModalComponent,
  InputComponent,
  TextareaComponent,
  SelectComponent,
  PaginationComponent,
  ToastService,
  PageHeaderComponent,
  SearchBarComponent,
  EmptyStateComponent,
} from 'ui-lib';
import { TelasService } from '../../core/services/telas.service';
import { TelaSistema } from '../../core/models/tela.model';

interface Perfil {
  id: string;
  nome: string;
  descricao: string;
  telas: string[];
  totalUsuarios: number;
  ativo: boolean;
}

const MOCK_PERFIS: Perfil[] = [
  { id: 'p1', nome: 'Admin',        descricao: 'Acesso total ao sistema',     telas: ['home','usuarios','perfis','perfil','config.telas','config.menus','parametros'], totalUsuarios: 2, ativo: true },
  { id: 'p2', nome: 'Gerente',      descricao: 'Gerencia equipes e recursos', telas: ['home','usuarios','perfil','parametros'], totalUsuarios: 4, ativo: true },
  { id: 'p3', nome: 'Técnico',      descricao: 'Acesso operacional',          telas: ['home','perfil'], totalUsuarios: 7, ativo: true },
  { id: 'p4', nome: 'Visualizador', descricao: 'Somente visualização',        telas: ['home','perfil'], totalUsuarios: 2, ativo: true },
];

@Component({
  selector: 'app-perfis',
  standalone: true,
  imports: [
    FormsModule,
    CardComponent,
    CardBodyComponent,
    BadgeComponent,
    ButtonComponent,
    ModalComponent,
    InputComponent,
    TextareaComponent,
    SelectComponent,
    PaginationComponent,
    PageHeaderComponent,
    SearchBarComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="crud-page">
      <ui-page-header title="Perfis de Acesso" subtitle="Configuração de perfis e permissões" [total]="filtered().length">
        <ui-button actions variant="primary" iconLeft="+" (clicked)="openCreate()">Novo Perfil</ui-button>
      </ui-page-header>

      <ui-search-bar
        placeholder="Buscar perfil..."
        [totalResults]="filtered().length"
        totalLabel="perfil(is) encontrado(s)"
        [hasActiveFilters]="!!statusFiltro"
        (searchChange)="onSearch($event)"
        (clearFilters)="clearFilters()"
      >
        <ui-select filters label="Status" [options]="statusOpts" [(ngModel)]="statusFiltro" (ngModelChange)="onFilterChange()" />
      </ui-search-bar>

      <!-- Sort header -->
      <div class="crud-sort-header">
        <button class="crud-sort-btn" (click)="toggleSort('nome')">Nome {{ sortIcon('nome') }}</button>
        <button class="crud-sort-btn" (click)="toggleSort('totalUsuarios')">Usuários {{ sortIcon('totalUsuarios') }}</button>
      </div>

      <!-- List -->
      @if (paged().length > 0) {
        <div class="perfis-list">
          @for (p of paged(); track p.id) {
            <ui-card>
              <ui-card-body>
                <div class="perfil-row">
                  <div class="perfil-row__info">
                    <div class="perfil-row__title-row">
                      <strong class="perfil-row__nome">{{ p.nome }}</strong>
                      <ui-badge [variant]="p.ativo ? 'success' : 'neutral'" size="md">{{ p.ativo ? 'Ativo' : 'Inativo' }}</ui-badge>
                      <span class="perfil-row__count">
                        <ui-badge variant="primary">{{ p.totalUsuarios }} usuário(s)</ui-badge>
                      </span>
                    </div>
                    <p class="perfil-row__desc">{{ p.descricao }}</p>
                    <div class="perfil-row__telas">
                      <span class="tela-label">Telas:</span>
                      @for (t of p.telas; track t) {
                        <span class="tela-chip">{{ t }}</span>
                      }
                    </div>
                  </div>
                  <div class="perfil-row__actions">
                    <ui-button variant="ghost" size="sm" iconLeft="✏️" (clicked)="openEdit(p)">Editar</ui-button>
                    <ui-button variant="ghost" size="sm" iconLeft="🗑" (clicked)="confirmDeleteItem(p)">Excluir</ui-button>
                  </div>
                </div>
              </ui-card-body>
            </ui-card>
          }
        </div>
      } @else {
        <ui-empty-state icon="🔑" title="Nenhum perfil encontrado" description="Crie o primeiro perfil de acesso.">
          <ui-button variant="primary" (clicked)="openCreate()">Novo Perfil</ui-button>
        </ui-empty-state>
      }

      @if (filtered().length > pageSize) {
        <ui-pagination [currentPage]="page()" [totalPages]="totalPages()" (pageChange)="page.set($event)" />
      }
    </div>

    <!-- Create/Edit Modal -->
    <ui-modal [open]="modalOpen()" [title]="editingId() ? 'Editar Perfil' : 'Novo Perfil'" size="xl" (closed)="onModalXClose()">
      <div class="modal-form">
        @if (confirmDiscard()) {
          <div class="discard-banner">
            <span>⚠️</span>
            <div class="discard-banner__text"><strong>Alterações não salvas</strong><span>Se fechar, as alterações serão perdidas.</span></div>
            <div class="discard-banner__actions">
              <ui-button variant="ghost" size="sm" (clicked)="continueEditing()">Continuar</ui-button>
              <ui-button variant="danger" size="sm" (clicked)="discardChanges()">Descartar</ui-button>
            </div>
          </div>
        }
        <ui-input label="Nome do Perfil" placeholder="Ex: Gerente de Obras" [required]="true" [ngModel]="form.nome" (ngModelChange)="form.nome=$event; markDirty()" [errorMessage]="errors['nome']||''" />
        <ui-textarea label="Descrição" placeholder="Descreva as responsabilidades deste perfil..." [rows]="2" [ngModel]="form.descricao" (ngModelChange)="form.descricao=$event; markDirty()" />
        <div class="modal-status-row">
          <label class="modal-label">Status</label>
          <ui-select [options]="statusFormOpts" [ngModel]="form.ativo ? 'true' : 'false'" (ngModelChange)="form.ativo = $event === 'true'; markDirty()" />
        </div>

        <!-- Telas de acesso -->
        <div class="telas-section">
          <div class="telas-section__header">
            <label class="modal-label">Telas de Acesso</label>
            <span class="telas-count">{{ form.telas.length }} de {{ telasDisponiveis().length }} selecionadas</span>
          </div>
          <div class="telas-grid">
            @for (tela of telasDisponiveis(); track tela.screenName) {
              <label
                class="tela-item"
                [class.tela-item--checked]="form.telas.includes(tela.screenName)"
              >
                <input
                  type="checkbox"
                  class="tela-item__check"
                  [checked]="form.telas.includes(tela.screenName)"
                  (change)="toggleTela(tela.screenName, $event)"
                />
                <span class="tela-item__icon">{{ tela.icone || '📄' }}</span>
                <div class="tela-item__info">
                  <span class="tela-item__nome">{{ tela.nome }}</span>
                  <span class="tela-item__modulo">{{ tela.screenName }}</span>
                </div>
              </label>
            }
          </div>
        </div>

      </div>

      <!-- Footer fixo fora do body scrollável -->
      <div modal-footer>
        <ui-button variant="ghost" (clicked)="requestClose()">Cancelar</ui-button>
        <ui-button variant="primary" [loading]="saving()" (clicked)="save()">Salvar</ui-button>
      </div>
    </ui-modal>

    <!-- Delete Modal -->
    <ui-modal [open]="confirmDeleteOpen()" title="Excluir Perfil" size="sm" (closed)="confirmDeleteOpen.set(false)">
      <div class="modal-form">
        <p>Deseja excluir o perfil <strong>{{ deletingItem()?.nome }}</strong>? Esta ação não pode ser desfeita.</p>
        <div class="modal-footer">
          <ui-button variant="ghost" (clicked)="confirmDeleteOpen.set(false)">Cancelar</ui-button>
          <ui-button variant="danger" [loading]="deleting()" (clicked)="executeDelete()">Excluir</ui-button>
        </div>
      </div>
    </ui-modal>
  `,
  styles: [`
    .crud-page { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.5rem; width: 100%; }
    .crud-sort-header { display: flex; gap: 1rem; padding: 0 0 0.25rem; border-bottom: 1px solid var(--ui-color-border); }
    .crud-sort-btn { background: none; border: none; font-size: 11px; font-weight: 600; color: var(--ui-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; padding: 0 var(--ui-space-2); font-family: var(--ui-font-family); }
    .crud-sort-btn:hover { color: var(--ui-color-primary); }
    .perfis-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .perfil-row { display: flex; align-items: flex-start; gap: 1rem; }
    .perfil-row__info { flex: 1; display: flex; flex-direction: column; gap: 0.375rem; }
    .perfil-row__title-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .perfil-row__nome { font-size: var(--ui-font-size-base); font-weight: 700; }
    .perfil-row__desc { margin: 0; font-size: var(--ui-font-size-sm); color: var(--ui-color-text-secondary); }
    .perfil-row__telas { display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap; }
    .tela-label { font-size: 11px; color: var(--ui-color-text-muted); font-weight: 600; text-transform: uppercase; }
    .tela-chip { display: inline-block; padding: 2px 8px; background: var(--ui-color-bg-subtle); border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-full); font-size: 11px; color: var(--ui-color-text-secondary); font-family: monospace; }
    .perfil-row__actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
    .modal-form { display: flex; flex-direction: column; gap: 1rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid var(--ui-color-border); }
    .telas-section { display: flex; flex-direction: column; gap: 0.5rem; }
    .telas-section__header { display: flex; align-items: center; justify-content: space-between; }
    .telas-count { font-size: var(--ui-font-size-xs); color: var(--ui-color-text-muted); }
    .telas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.5rem; }
    .tela-item {
      display: flex; align-items: center; gap: 0.625rem;
      padding: 0.625rem 0.75rem;
      border: 1.5px solid var(--ui-color-border);
      border-radius: var(--ui-radius-md);
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      user-select: none;
    }
    .tela-item:hover { background: var(--ui-color-bg-subtle); border-color: var(--ui-color-primary); }
    .tela-item--checked { border-color: var(--ui-color-primary); background: var(--ui-color-primary-light); }
    .tela-item__check { width: 16px; height: 16px; accent-color: var(--ui-color-primary); flex-shrink: 0; cursor: pointer; }
    .tela-item__icon { font-size: 1rem; flex-shrink: 0; }
    .tela-item__info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .tela-item__nome { font-size: var(--ui-font-size-sm); font-weight: 500; color: var(--ui-color-text-primary); }
    .tela-item__modulo { font-size: 10px; color: var(--ui-color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .modal-label { font-size: var(--ui-font-size-sm); font-weight: 600; color: var(--ui-color-text-primary); }
    .modal-status-row { display: flex; flex-direction: column; gap: 0.5rem; }
    .discard-banner { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.875rem 1rem; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.4); border-radius: var(--ui-radius-md); }
    .discard-banner__text { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: var(--ui-font-size-sm); }
    .discard-banner__actions { display: flex; gap: 0.5rem; }
  `],
})
export class PerfisComponent {
  private toast        = inject(ToastService);
  private telasService = inject(TelasService);

  perfis = signal<Perfil[]>([...MOCK_PERFIS]);

  busca       = signal('');
  statusFiltro = '';
  sortField   = signal('nome');
  sortDir     = signal<'asc' | 'desc'>('asc');
  page        = signal(1);
  readonly pageSize = 6;

  readonly statusOpts = [
    { label: 'Todos',   value: '' },
    { label: 'Ativo',   value: 'ativo' },
    { label: 'Inativo', value: 'inativo' },
  ];

  readonly statusFormOpts = [
    { label: 'Ativo',   value: 'true' },
    { label: 'Inativo', value: 'false' },
  ];

  filtered = computed(() => {
    const q     = this.busca().toLowerCase().trim();
    const s     = this.statusFiltro;
    const field = this.sortField();
    const dir   = this.sortDir();

    let list = this.perfis().filter(p => {
      if (q && !p.nome.toLowerCase().includes(q) && !p.descricao.toLowerCase().includes(q)) return false;
      if (s === 'ativo'   && !p.ativo) return false;
      if (s === 'inativo' &&  p.ativo) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      const va = field === 'totalUsuarios' ? a.totalUsuarios : a.nome;
      const vb = field === 'totalUsuarios' ? b.totalUsuarios : b.nome;
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string, 'pt-BR') : (va as number) - (vb as number);
      return dir === 'asc' ? cmp : -cmp;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

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

  onSearch(value: string): void {
    this.busca.set(value);
    this.page.set(1);
  }

  onFilterChange(): void {
    this.page.set(1);
  }

  clearFilters(): void {
    this.busca.set('');
    this.statusFiltro = '';
    this.page.set(1);
  }

  // ── Modal ──────────────────────────────────────────────────────────────────

  modalOpen         = signal(false);
  editingId         = signal<string | null>(null);
  saving            = signal(false);
  formDirty         = signal(false);
  confirmDiscard    = signal(false);
  confirmDeleteOpen = signal(false);
  deletingItem      = signal<Perfil | null>(null);
  deleting          = signal(false);

  form: { nome: string; descricao: string; ativo: boolean; telas: string[] } = { nome: '', descricao: '', ativo: true, telas: [] };
  errors: Record<string, string> = {};

  openCreate(): void {
    this._resetForm();
    this.editingId.set(null);
    this.modalOpen.set(true);
  }

  /** Telas disponíveis para vincular — exclui agrupadores (não-navegáveis) */
  telasDisponiveis = computed(() =>
    this.telasService.telasAtivas().filter(t => !t.screenName.endsWith('-group'))
  );

  toggleTela(screenName: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.form.telas.includes(screenName)) {
        this.form.telas = [...this.form.telas, screenName];
      }
    } else {
      this.form.telas = this.form.telas.filter(t => t !== screenName);
    }
    this.markDirty();
  }

  openEdit(p: Perfil): void {
    this.form = { nome: p.nome, descricao: p.descricao, ativo: p.ativo, telas: [...p.telas] };
    this.errors = {};
    this.formDirty.set(false);
    this.confirmDiscard.set(false);
    this.editingId.set(p.id);
    this.modalOpen.set(true);
  }

  markDirty(): void { this.formDirty.set(true); }

  requestClose(): void {
    if (this.formDirty()) {
      this.confirmDiscard.set(true);
    } else {
      this._doCloseModal();
    }
  }

  onModalXClose(): void {
    if (this.formDirty()) {
      setTimeout(() => this.modalOpen.set(true), 0);
      this.confirmDiscard.set(true);
    } else {
      this._doCloseModal();
    }
  }

  discardChanges(): void {
    this.confirmDiscard.set(false);
    this._doCloseModal();
  }

  continueEditing(): void {
    this.confirmDiscard.set(false);
  }

  private _doCloseModal(): void {
    this.modalOpen.set(false);
    this.formDirty.set(false);
    this.confirmDiscard.set(false);
    this.errors = {};
    this._resetForm();
  }

  private _resetForm(): void {
    this.form = { nome: '', descricao: '', ativo: true, telas: [] };
    this.errors = {};
  }

  private validateForm(): boolean {
    this.errors = {};
    if (!this.form.nome?.trim()) this.errors['nome'] = 'Nome é obrigatório';
    return Object.keys(this.errors).length === 0;
  }

  save(): void {
    if (!this.validateForm()) return;
    this.saving.set(true);
    const id = this.editingId();
    setTimeout(() => {
      if (id) {
        this.perfis.update(list => list.map(p => p.id === id ? { ...p, ...this.form } : p));
        this.toast.success('Perfil atualizado!');
      } else {
        const novo: Perfil = { id: 'p' + Date.now(), ...this.form, totalUsuarios: 0 };
        this.perfis.update(list => [...list, novo]);
        this.toast.success('Perfil criado!');
      }
      this.saving.set(false);
      this._doCloseModal();
    }, 400);
  }

  confirmDeleteItem(p: Perfil): void {
    this.deletingItem.set(p);
    this.confirmDeleteOpen.set(true);
  }

  executeDelete(): void {
    const p = this.deletingItem();
    if (!p) return;
    this.deleting.set(true);
    setTimeout(() => {
      this.perfis.update(list => list.filter(item => item.id !== p.id));
      this.toast.success('Perfil excluído!');
      this.confirmDeleteOpen.set(false);
      this.deletingItem.set(null);
      this.deleting.set(false);
    }, 400);
  }
}
