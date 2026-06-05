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

interface StatusObraItem {
  id: string;
  nome: string;
  descricao: string;
  cor: string;
  ordem: number;
  ativo: boolean;
}

const MOCK_STATUS: StatusObraItem[] = [
  { id: 's1', nome: 'Planejamento', descricao: 'Obra em fase de planejamento', cor: '#3B82F6', ordem: 1, ativo: true },
  { id: 's2', nome: 'Ativa',        descricao: 'Obra em execução',             cor: '#10B981', ordem: 2, ativo: true },
  { id: 's3', nome: 'Pausada',      descricao: 'Temporariamente pausada',      cor: '#F59E0B', ordem: 3, ativo: true },
  { id: 's4', nome: 'Concluída',    descricao: 'Finalizada e entregue',        cor: '#6B7280', ordem: 4, ativo: true },
];

@Component({
  selector: 'app-status-obra',
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
      <ui-page-header title="Status de Obra" subtitle="Configuração dos status disponíveis" [total]="filtered().length">
        <ui-button actions variant="primary" iconLeft="+" (clicked)="openCreate()">Novo Status</ui-button>
      </ui-page-header>

      <ui-search-bar
        placeholder="Buscar status..."
        [totalResults]="filtered().length"
        totalLabel="status encontrado(s)"
        [hasActiveFilters]="!!statusFiltro"
        (searchChange)="onSearch($event)"
        (clearFilters)="clearFilters()"
      >
        <ui-select filters label="Status" [options]="statusOpts" [(ngModel)]="statusFiltro" (ngModelChange)="onFilterChange()" />
      </ui-search-bar>

      <!-- Sort header -->
      <div class="crud-sort-header">
        <button class="crud-sort-btn" (click)="toggleSort('nome')">Nome {{ sortIcon('nome') }}</button>
        <button class="crud-sort-btn" (click)="toggleSort('ordem')">Ordem {{ sortIcon('ordem') }}</button>
      </div>

      <!-- List -->
      @if (paged().length > 0) {
        <div class="status-list">
          @for (s of paged(); track s.id) {
            <ui-card>
              <ui-card-body>
                <div class="status-row">
                  <div class="status-row__left">
                    <span class="status-dot" [style.background]="s.cor"></span>
                    <div class="status-row__info">
                      <div class="status-row__title-row">
                        <strong class="status-row__nome">{{ s.nome }}</strong>
                        <ui-badge [variant]="s.ativo ? 'success' : 'neutral'" size="md">{{ s.ativo ? 'Ativo' : 'Inativo' }}</ui-badge>
                        <span class="status-row__ordem">Ordem: {{ s.ordem }}</span>
                      </div>
                      <p class="status-row__desc">{{ s.descricao }}</p>
                    </div>
                  </div>
                  <div class="status-row__actions">
                    <ui-button variant="ghost" size="sm" iconLeft="✏️" (clicked)="openEdit(s)">Editar</ui-button>
                    <ui-button variant="ghost" size="sm" iconLeft="🗑" (clicked)="confirmDeleteItem(s)">Excluir</ui-button>
                  </div>
                </div>
              </ui-card-body>
            </ui-card>
          }
        </div>
      } @else {
        <ui-empty-state icon="🏷️" title="Nenhum status encontrado" description="Crie o primeiro status de obra.">
          <ui-button variant="primary" (clicked)="openCreate()">Novo Status</ui-button>
        </ui-empty-state>
      }

      @if (filtered().length > pageSize) {
        <ui-pagination [currentPage]="page()" [totalPages]="totalPages()" (pageChange)="page.set($event)" />
      }
    </div>

    <!-- Create/Edit Modal -->
    <ui-modal [open]="modalOpen()" [title]="editingId() ? 'Editar Status' : 'Novo Status'" size="lg" (closed)="onModalXClose()">
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
        <ui-input label="Nome" placeholder="Ex: Em Revisão" [required]="true" [ngModel]="form.nome" (ngModelChange)="form.nome=$event; markDirty()" [errorMessage]="errors['nome']||''" />
        <ui-textarea label="Descrição" placeholder="Descreva este status..." [rows]="2" [ngModel]="form.descricao" (ngModelChange)="form.descricao=$event; markDirty()" />
        <div class="color-row">
          <label class="modal-label">Cor</label>
          <input type="color" [(ngModel)]="form.cor" class="color-input" (ngModelChange)="markDirty()" />
        </div>
        <ui-input label="Ordem" type="number" [ngModel]="form.ordem" (ngModelChange)="form.ordem=$event; markDirty()" />
        <div class="modal-status-row">
          <label class="modal-label">Status</label>
          <ui-select [options]="statusFormOpts" [ngModel]="form.ativo ? 'true' : 'false'" (ngModelChange)="form.ativo = $event === 'true'; markDirty()" />
        </div>
        <div class="modal-footer">
          <ui-button variant="ghost" (clicked)="requestClose()">Cancelar</ui-button>
          <ui-button variant="primary" [loading]="saving()" (clicked)="save()">Salvar</ui-button>
        </div>
      </div>
    </ui-modal>

    <!-- Delete Modal -->
    <ui-modal [open]="confirmDeleteOpen()" title="Excluir Status" size="sm" (closed)="confirmDeleteOpen.set(false)">
      <div class="modal-form">
        <p>Deseja excluir o status <strong>{{ deletingItem()?.nome }}</strong>? Esta ação não pode ser desfeita.</p>
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
    .status-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .status-row { display: flex; align-items: center; gap: 1rem; }
    .status-row__left { flex: 1; display: flex; align-items: center; gap: 0.75rem; }
    .status-dot { width: 14px; height: 14px; border-radius: 9999px; flex-shrink: 0; }
    .status-row__info { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
    .status-row__title-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .status-row__nome { font-size: var(--ui-font-size-base); font-weight: 700; }
    .status-row__ordem { font-size: 11px; color: var(--ui-color-text-muted); }
    .status-row__desc { margin: 0; font-size: var(--ui-font-size-sm); color: var(--ui-color-text-secondary); }
    .status-row__actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
    .color-row { display: flex; flex-direction: column; gap: 0.5rem; }
    .color-input { width: 60px; height: 36px; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-sm); cursor: pointer; padding: 2px; }
    .modal-form { display: flex; flex-direction: column; gap: 1rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid var(--ui-color-border); }
    .modal-label { font-size: var(--ui-font-size-sm); font-weight: 600; color: var(--ui-color-text-primary); }
    .modal-status-row { display: flex; flex-direction: column; gap: 0.5rem; }
    .discard-banner { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.875rem 1rem; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.4); border-radius: var(--ui-radius-md); }
    .discard-banner__text { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: var(--ui-font-size-sm); }
    .discard-banner__actions { display: flex; gap: 0.5rem; }
  `],
})
export class StatusObraComponent {
  private toast = inject(ToastService);

  statusList = signal<StatusObraItem[]>([...MOCK_STATUS]);

  busca        = signal('');
  statusFiltro = '';
  sortField    = signal('ordem');
  sortDir      = signal<'asc' | 'desc'>('asc');
  page         = signal(1);
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

    let list = this.statusList().filter(item => {
      if (q && !item.nome.toLowerCase().includes(q)) return false;
      if (s === 'ativo'   && !item.ativo) return false;
      if (s === 'inativo' &&  item.ativo) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      const va = field === 'ordem' ? a.ordem : a.nome;
      const vb = field === 'ordem' ? b.ordem : b.nome;
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
  deletingItem      = signal<StatusObraItem | null>(null);
  deleting          = signal(false);

  form: { nome: string; descricao: string; cor: string; ordem: number; ativo: boolean } = {
    nome: '', descricao: '', cor: '#3B82F6', ordem: 1, ativo: true,
  };
  errors: Record<string, string> = {};

  openCreate(): void {
    this._resetForm();
    this.form.ordem = this.statusList().length + 1;
    this.editingId.set(null);
    this.modalOpen.set(true);
  }

  openEdit(s: StatusObraItem): void {
    this.form = { nome: s.nome, descricao: s.descricao, cor: s.cor, ordem: s.ordem, ativo: s.ativo };
    this.errors = {};
    this.formDirty.set(false);
    this.confirmDiscard.set(false);
    this.editingId.set(s.id);
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
    this.form = { nome: '', descricao: '', cor: '#3B82F6', ordem: 1, ativo: true };
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
        this.statusList.update(list => list.map(s => s.id === id ? { ...s, ...this.form } : s));
        this.toast.success('Status atualizado!');
      } else {
        const novo: StatusObraItem = { id: 's' + Date.now(), ...this.form };
        this.statusList.update(list => [...list, novo]);
        this.toast.success('Status criado!');
      }
      this.saving.set(false);
      this._doCloseModal();
    }, 400);
  }

  confirmDeleteItem(s: StatusObraItem): void {
    this.deletingItem.set(s);
    this.confirmDeleteOpen.set(true);
  }

  executeDelete(): void {
    const s = this.deletingItem();
    if (!s) return;
    this.deleting.set(true);
    setTimeout(() => {
      this.statusList.update(list => list.filter(item => item.id !== s.id));
      this.toast.success('Status excluído!');
      this.confirmDeleteOpen.set(false);
      this.deletingItem.set(null);
      this.deleting.set(false);
    }, 400);
  }
}
