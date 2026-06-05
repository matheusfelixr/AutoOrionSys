import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
  ToastService,
  PageHeaderComponent,
  EmptyStateComponent,
} from 'ui-lib';
import { ParametrosService } from '../../../core/services/parametros.service';
import { GrupoParametro } from '../../../core/models/parametro.model';

@Component({
  selector: 'app-grupos-parametro',
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
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="crud-page">
      <ui-page-header
        title="Grupos de Parâmetros"
        subtitle="Agrupe os parâmetros do sistema por categoria"
        [total]="sortedGrupos().length"
      >
        <ui-button actions variant="primary" iconLeft="+" (clicked)="openCreate()">Novo Grupo</ui-button>
      </ui-page-header>

      @if (sortedGrupos().length === 0) {
        <ui-empty-state icon="📂" title="Nenhum grupo cadastrado"
          description="Crie o primeiro grupo para organizar os parâmetros do sistema.">
          <ui-button variant="primary" (clicked)="openCreate()">Novo Grupo</ui-button>
        </ui-empty-state>
      } @else {
        <div class="grupos-list">
          @for (grupo of sortedGrupos(); track grupo.id) {
            <ui-card>
              <ui-card-body>
                <div class="grupo-row">
                  <div class="grupo-order-btns">
                    <button class="order-btn" title="Subir" (click)="service.reorderGrupo(grupo.id, 'up')">▲</button>
                    <button class="order-btn" title="Descer" (click)="service.reorderGrupo(grupo.id, 'down')">▼</button>
                  </div>
                  <strong class="grupo-nome">{{ grupo.nome }}</strong>
                  <span class="grupo-desc">{{ grupo.descricao }}</span>
                  <span class="grupo-ordem">ordem: {{ grupo.ordem }}</span>
                  <ui-badge [variant]="grupo.ativo ? 'success' : 'neutral'">
                    {{ grupo.ativo ? 'Ativo' : 'Inativo' }}
                  </ui-badge>
                  <div class="grupo-actions">
                    <ui-button variant="ghost" size="sm" iconLeft="✏️" (clicked)="openEdit(grupo)">Editar</ui-button>
                    <ui-button variant="ghost" size="sm" iconLeft="🗑" (clicked)="confirmDelete(grupo)">Excluir</ui-button>
                  </div>
                </div>
              </ui-card-body>
            </ui-card>
          }
        </div>
      }
    </div>

    <!-- ── Modal: Criar / Editar ─────────────────────────────────────── -->
    <ui-modal
      [open]="modalOpen()"
      [title]="editingId() ? 'Editar Grupo' : 'Novo Grupo'"
      size="md"
      (closed)="onModalXClose()"
    >
      <div class="modal-form">
        @if (confirmDiscard()) {
          <div class="discard-banner">
            <span>⚠️</span>
            <div class="discard-banner__text">
              <strong>Alterações não salvas</strong>
              <span>Se fechar, as alterações serão perdidas.</span>
            </div>
            <div class="discard-banner__actions">
              <ui-button variant="ghost" size="sm" (clicked)="continueEditing()">Continuar</ui-button>
              <ui-button variant="danger" size="sm" (clicked)="discardChanges()">Descartar</ui-button>
            </div>
          </div>
        }
        <ui-input label="Nome" placeholder="Ex: Financeiro" [required]="true"
          [ngModel]="form.nome" (ngModelChange)="form.nome = $event; markDirty()"
          [errorMessage]="errors['nome'] || ''" />
        <ui-textarea label="Descrição" placeholder="Descreva o propósito deste grupo"
          [ngModel]="form.descricao" (ngModelChange)="form.descricao = $event; markDirty()" />
        <ui-input label="Ordem" type="number"
          [ngModel]="form.ordem" (ngModelChange)="form.ordem = +$event; markDirty()" />
        <ui-select label="Status" [options]="statusOpts"
          [ngModel]="form.ativo ? 'true' : 'false'"
          (ngModelChange)="form.ativo = $event === 'true'; markDirty()" />
      </div>
      <div modal-footer>
        <ui-button variant="ghost" (clicked)="requestClose()">Cancelar</ui-button>
        <ui-button variant="primary" [loading]="saving()" (clicked)="save()">Salvar</ui-button>
      </div>
    </ui-modal>

    <!-- ── Modal: Excluir ────────────────────────────────────────────── -->
    <ui-modal [open]="deleteOpen()" title="Excluir Grupo" size="sm"
      (closed)="deleteOpen.set(false)">
      <div class="modal-form">
        <p>Excluir o grupo <strong>{{ deletingItem()?.nome }}</strong>? Esta ação não pode ser desfeita.</p>
      </div>
      <div modal-footer>
        <ui-button variant="ghost" (clicked)="deleteOpen.set(false)">Cancelar</ui-button>
        <ui-button variant="danger" (clicked)="executeDelete()">Excluir</ui-button>
      </div>
    </ui-modal>
  `,
  styles: [`
    .crud-page { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.5rem; width: 100%; }
    .grupos-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .grupo-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .grupo-nome { font-size: var(--ui-font-size-base); font-weight: 700; min-width: 120px; }
    .grupo-desc { flex: 1; font-size: var(--ui-font-size-sm); color: var(--ui-color-text-secondary); }
    .grupo-ordem { font-size: var(--ui-font-size-xs); color: var(--ui-color-text-muted); font-family: monospace; }
    .grupo-actions { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; }
    .order-btn {
      width: 26px; height: 26px;
      background: var(--ui-color-bg-subtle); border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-sm); cursor: pointer; font-size: 0.7rem;
      display: flex; align-items: center; justify-content: center;
    }
    .order-btn:hover { background: var(--ui-color-primary-light); border-color: var(--ui-color-primary); }
    .grupo-order-btns { display: flex; gap: 2px; }
    .modal-form { display: flex; flex-direction: column; gap: 1rem; }
    .discard-banner { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.875rem 1rem; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.4); border-radius: var(--ui-radius-md); }
    .discard-banner__text { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: var(--ui-font-size-sm); }
    .discard-banner__actions { display: flex; gap: 0.5rem; }
  `],
})
export class GruposParametroComponent implements OnInit {
  service = inject(ParametrosService);
  private toast = inject(ToastService);

  sortedGrupos = computed(() =>
    [...this.service.grupos()].sort((a, b) => a.ordem - b.ordem)
  );

  // ── Modal create/edit ─────────────────────────────────────────────────────

  modalOpen      = signal(false);
  editingId      = signal<string | null>(null);
  saving         = signal(false);
  formDirty      = signal(false);
  confirmDiscard = signal(false);

  deleteOpen   = signal(false);
  deletingItem = signal<GrupoParametro | null>(null);

  form: { nome: string; descricao: string; ordem: number; ativo: boolean } =
    { nome: '', descricao: '', ordem: 1, ativo: true };
  errors: Record<string, string> = {};

  readonly statusOpts = [
    { label: 'Ativo',   value: 'true'  },
    { label: 'Inativo', value: 'false' },
  ];

  ngOnInit(): void {
    this.service.getGrupos().subscribe();
  }

  openCreate(): void {
    this.form = { nome: '', descricao: '', ordem: this.service.grupos().length + 1, ativo: true };
    this.errors = {};
    this.formDirty.set(false);
    this.confirmDiscard.set(false);
    this.editingId.set(null);
    this.modalOpen.set(true);
  }

  openEdit(grupo: GrupoParametro): void {
    this.form = { nome: grupo.nome, descricao: grupo.descricao, ordem: grupo.ordem, ativo: grupo.ativo };
    this.errors = {};
    this.formDirty.set(false);
    this.confirmDiscard.set(false);
    this.editingId.set(grupo.id);
    this.modalOpen.set(true);
  }

  markDirty(): void { this.formDirty.set(true); }

  requestClose(): void {
    if (this.formDirty()) {
      this.confirmDiscard.set(true);
    } else {
      this._doClose();
    }
  }

  onModalXClose(): void {
    if (this.formDirty()) {
      setTimeout(() => this.modalOpen.set(true), 0);
      this.confirmDiscard.set(true);
    } else {
      this._doClose();
    }
  }

  discardChanges(): void {
    this.confirmDiscard.set(false);
    this._doClose();
  }

  continueEditing(): void {
    this.confirmDiscard.set(false);
  }

  private _doClose(): void {
    this.modalOpen.set(false);
    this.formDirty.set(false);
    this.confirmDiscard.set(false);
    this.errors = {};
  }

  save(): void {
    this.errors = {};
    if (!this.form.nome?.trim()) {
      this.errors['nome'] = 'Nome é obrigatório';
      return;
    }
    this.saving.set(true);
    const id  = this.editingId();
    const obs = id
      ? this.service.updateGrupo(id, this.form)
      : this.service.createGrupo(this.form);
    obs.subscribe(() => {
      this.toast.success(id ? 'Grupo atualizado!' : 'Grupo criado!');
      this.saving.set(false);
      this._doClose();
    });
  }

  confirmDelete(grupo: GrupoParametro): void {
    this.deletingItem.set(grupo);
    this.deleteOpen.set(true);
  }

  executeDelete(): void {
    const grupo = this.deletingItem();
    if (!grupo) return;
    this.service.deleteGrupo(grupo.id).subscribe(() => {
      this.toast.success('Grupo excluído!');
      this.deleteOpen.set(false);
      this.deletingItem.set(null);
    });
  }
}
