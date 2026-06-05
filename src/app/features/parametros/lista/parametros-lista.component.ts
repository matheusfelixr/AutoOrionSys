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
  SearchBarComponent,
} from 'ui-lib';
import { ParametrosService } from '../../../core/services/parametros.service';
import { Parametro, GrupoParametro, TipoParametro } from '../../../core/models/parametro.model';

@Component({
  selector: 'app-parametros-lista',
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
    SearchBarComponent,
  ],
  template: `
    <div class="crud-page">
      <ui-page-header title="Parâmetros" subtitle="Configurações do sistema" [total]="totalParametros()">
        <ui-button actions variant="primary" iconLeft="+" (clicked)="openCreate()">Novo Parâmetro</ui-button>
      </ui-page-header>

      <ui-search-bar
        placeholder="Buscar parâmetro..."
        [totalResults]="totalParametros()"
        totalLabel="parâmetro(s) encontrado(s)"
        [hasActiveFilters]="!!(busca() || grupoFiltro())"
        (searchChange)="onSearch($event)"
        (clearFilters)="clearFilters()"
      >
        <ui-select filters label="Grupo" [options]="grupoOptions()" [ngModel]="grupoFiltro()" (ngModelChange)="grupoFiltro.set($event)" />
      </ui-search-bar>

      @for (grupo of gruposComParametros(); track grupo.id) {
        <div class="grupo-section">
          <div class="grupo-section__header">
            <span class="grupo-section__nome">{{ grupo.nome }}</span>
            <span class="grupo-section__desc">{{ grupo.descricao }}</span>
            <ui-badge variant="neutral">{{ parametrosFiltradosByGrupo(grupo.id).length }}</ui-badge>
          </div>
          <ui-card>
            <ui-card-body>
              <div class="param-list">
                @for (p of parametrosFiltradosByGrupo(grupo.id); track p.id) {
                  <div class="param-row">
                    <span class="param-nome">{{ p.nome }}</span>
                    <span class="param-desc">{{ p.descricao }}</span>
                    <div class="param-value-col">
                      @if (editingParamId() === p.id) {
                        <div class="param-editor">
                          @if (p.tipo === 'booleano') {
                            <ui-select [options]="boolOpts" [ngModel]="editValue" (ngModelChange)="editValue = $event" />
                          } @else if (p.tipo === 'lista' && p.opcoes) {
                            <ui-select [options]="toSelectOpts(p.opcoes)" [ngModel]="editValue" (ngModelChange)="editValue = $event" />
                          } @else if (p.tipo === 'numero') {
                            <ui-input type="number" [ngModel]="editValue" (ngModelChange)="editValue = $event" />
                          } @else {
                            <ui-input [ngModel]="editValue" (ngModelChange)="editValue = $event" />
                          }
                          <div class="param-editor-actions">
                            <ui-button variant="primary" size="sm" [loading]="savingParam()" (clicked)="saveValor(p)">✓</ui-button>
                            <ui-button variant="ghost" size="sm" (clicked)="cancelEdit()">✕</ui-button>
                          </div>
                        </div>
                      } @else {
                        <div class="param-valor-display">
                          @if (p.tipo === 'booleano') {
                            <ui-badge [variant]="p.valor === 'true' ? 'success' : 'neutral'">
                              {{ p.valor === 'true' ? 'Sim' : 'Não' }}
                            </ui-badge>
                          } @else {
                            <span class="param-valor-text">{{ p.valor }}</span>
                          }
                          <ui-badge variant="neutral" style="font-size:10px">{{ p.tipo }}</ui-badge>
                        </div>
                      }
                    </div>
                    <div class="param-actions">
                      @if (editingParamId() !== p.id) {
                        <ui-button variant="ghost" size="sm" iconLeft="✏️" (clicked)="startEdit(p)">Editar valor</ui-button>
                      }
                      <ui-button variant="ghost" size="sm" iconLeft="⚙️" (clicked)="openEditParam(p)">Config</ui-button>
                      <ui-button variant="ghost" size="sm" iconLeft="🗑" (clicked)="confirmDeleteParam(p)">Excluir</ui-button>
                    </div>
                  </div>
                }
              </div>
            </ui-card-body>
          </ui-card>
        </div>
      } @empty {
        <ui-empty-state icon="🔧" title="Nenhum parâmetro encontrado" description="Crie o primeiro parâmetro do sistema." />
      }
    </div>

    <!-- ── Modal: Criar / Editar Parâmetro ─────────────────────────── -->
    <ui-modal
      [open]="paramModalOpen()"
      [title]="paramEditingId() ? 'Editar Parâmetro' : 'Novo Parâmetro'"
      size="lg"
      (closed)="onParamModalXClose()"
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
        <ui-input label="Nome (identificador)" placeholder="Ex: prmArredondamento" [required]="true"
          [ngModel]="paramForm.nome" (ngModelChange)="paramForm.nome = $event; markDirty()"
          [errorMessage]="paramErrors['nome'] || ''" />
        <ui-textarea label="Descrição" placeholder="Descreva o propósito deste parâmetro"
          [ngModel]="paramForm.descricao" (ngModelChange)="paramForm.descricao = $event; markDirty()" />
        <ui-select label="Grupo" [required]="true" [options]="grupoSelectOpts()"
          [ngModel]="paramForm.grupoId" (ngModelChange)="paramForm.grupoId = $event; markDirty()"
          [errorMessage]="paramErrors['grupoId'] || ''" />
        <ui-select label="Tipo" [options]="tipoOpts"
          [ngModel]="paramForm.tipo" (ngModelChange)="paramForm.tipo = $event; markDirty()" />
        <ui-input label="Valor" placeholder="Valor atual"
          [ngModel]="paramForm.valor" (ngModelChange)="paramForm.valor = $event; markDirty()" />
        @if (paramForm.tipo === 'lista') {
          <ui-textarea label="Opções (uma por linha)" placeholder="Opção1&#10;Opção2&#10;Opção3"
            [ngModel]="paramForm.opcoesText" (ngModelChange)="paramForm.opcoesText = $event; markDirty()" />
        }
        <ui-select label="Status" [options]="statusOpts"
          [ngModel]="paramForm.ativo ? 'true' : 'false'"
          (ngModelChange)="paramForm.ativo = $event === 'true'; markDirty()" />
      </div>
      <div modal-footer>
        <ui-button variant="ghost" (clicked)="requestParamClose()">Cancelar</ui-button>
        <ui-button variant="primary" [loading]="paramSaving()" (clicked)="saveParam()">Salvar</ui-button>
      </div>
    </ui-modal>

    <!-- ── Modal: Excluir Parâmetro ────────────────────────────────── -->
    <ui-modal [open]="deleteOpen()" title="Excluir Parâmetro" size="sm"
      (closed)="deleteOpen.set(false)">
      <div class="modal-form">
        <p>Excluir o parâmetro <strong>{{ deletingParam()?.nome }}</strong>? Esta ação não pode ser desfeita.</p>
      </div>
      <div modal-footer>
        <ui-button variant="ghost" (clicked)="deleteOpen.set(false)">Cancelar</ui-button>
        <ui-button variant="danger" (clicked)="executeDeleteParam()">Excluir</ui-button>
      </div>
    </ui-modal>
  `,
  styles: [`
    .crud-page { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.5rem; width: 100%; }
    .grupo-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .grupo-section__header {
      display: flex; flex-direction: row; align-items: center; gap: 0.75rem;
      padding-bottom: 0.375rem; border-bottom: 2px solid var(--ui-color-primary-light);
    }
    .grupo-section__nome { font-size: var(--ui-font-size-base); font-weight: 700; color: var(--ui-color-primary-dark, var(--ui-color-primary)); }
    .grupo-section__desc { flex: 1; font-size: var(--ui-font-size-sm); color: var(--ui-color-text-secondary); }
    .param-list { display: flex; flex-direction: column; gap: 0; }
    .param-row {
      display: flex; flex-direction: row; align-items: center; gap: 1rem;
      padding: 0.75rem 0; border-bottom: 1px solid var(--ui-color-border);
    }
    .param-row:last-child { border-bottom: none; }
    .param-nome {
      font-family: monospace; font-size: var(--ui-font-size-sm); font-weight: 600;
      color: var(--ui-color-text-primary); min-width: 200px; flex-shrink: 0;
      background: var(--ui-color-bg-subtle); padding: 2px 8px; border-radius: var(--ui-radius-sm);
    }
    .param-desc { flex: 1; font-size: var(--ui-font-size-sm); color: var(--ui-color-text-secondary); }
    .param-value-col { min-width: 220px; flex-shrink: 0; }
    .param-valor-display { display: flex; flex-direction: row; align-items: center; gap: 0.5rem; }
    .param-valor-text {
      font-family: monospace; font-size: var(--ui-font-size-sm); color: var(--ui-color-text-primary);
      background: var(--ui-color-bg-subtle); padding: 2px 8px; border-radius: var(--ui-radius-sm);
      border: 1px solid var(--ui-color-border);
    }
    .param-editor { display: flex; flex-direction: row; align-items: center; gap: 0.5rem; }
    .param-editor-actions { display: flex; flex-direction: row; gap: 0.25rem; flex-shrink: 0; }
    .param-actions { display: flex; flex-direction: row; gap: 0.25rem; flex-shrink: 0; }
    .modal-form { display: flex; flex-direction: column; gap: 1rem; }
    .discard-banner { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.875rem 1rem; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.4); border-radius: var(--ui-radius-md); }
    .discard-banner__text { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: var(--ui-font-size-sm); }
    .discard-banner__actions { display: flex; gap: 0.5rem; }
  `],
})
export class ParametrosListaComponent implements OnInit {
  private service = inject(ParametrosService);
  private toast   = inject(ToastService);

  busca      = signal('');
  grupoFiltro = signal('');

  // Inline edit
  editingParamId = signal<string | null>(null);
  editValue      = '';
  savingParam    = signal(false);

  // Param modal (create/edit)
  paramModalOpen  = signal(false);
  paramEditingId  = signal<string | null>(null);
  paramSaving     = signal(false);
  formDirty       = signal(false);
  confirmDiscard  = signal(false);

  paramForm: {
    nome: string;
    descricao: string;
    grupoId: string;
    tipo: TipoParametro;
    valor: string;
    opcoesText: string;
    ativo: boolean;
  } = { nome: '', descricao: '', grupoId: '', tipo: 'texto', valor: '', opcoesText: '', ativo: true };
  paramErrors: Record<string, string> = {};

  // Delete modal
  deleteOpen    = signal(false);
  deletingParam = signal<Parametro | null>(null);

  // ── Options ───────────────────────────────────────────────────────────────

  readonly boolOpts = [
    { label: 'Sim', value: 'true'  },
    { label: 'Não', value: 'false' },
  ];

  readonly tipoOpts = [
    { label: 'Texto',              value: 'texto'    },
    { label: 'Número',             value: 'numero'   },
    { label: 'Booleano (Sim/Não)', value: 'booleano' },
    { label: 'Lista',              value: 'lista'    },
  ];

  readonly statusOpts = [
    { label: 'Ativo',   value: 'true'  },
    { label: 'Inativo', value: 'false' },
  ];

  // ── Computed ──────────────────────────────────────────────────────────────

  gruposComParametros = computed(() => {
    const gId    = this.grupoFiltro();
    const grupos = this.service.grupos().filter(g => g.ativo).sort((a, b) => a.ordem - b.ordem);
    return grupos.filter(g => {
      if (gId && g.id !== gId) return false;
      return this.parametrosFiltradosByGrupo(g.id).length > 0;
    });
  });

  parametrosFiltradosByGrupo(grupoId: string): Parametro[] {
    const q = this.busca().toLowerCase();
    return this.service.parametros()
      .filter(p => p.grupoId === grupoId && p.ativo &&
        (!q || p.nome.toLowerCase().includes(q) || p.descricao.toLowerCase().includes(q)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  totalParametros = computed(() =>
    this.gruposComParametros().reduce((acc, g) => acc + this.parametrosFiltradosByGrupo(g.id).length, 0)
  );

  grupoOptions = computed(() => [
    { label: 'Todos os grupos', value: '' },
    ...this.service.grupos()
      .filter(g => g.ativo)
      .sort((a, b) => a.ordem - b.ordem)
      .map(g => ({ label: g.nome, value: g.id })),
  ]);

  grupoSelectOpts = computed(() =>
    this.service.grupos()
      .filter(g => g.ativo)
      .sort((a, b) => a.ordem - b.ordem)
      .map(g => ({ label: g.nome, value: g.id }))
  );

  // ── Inline edit ───────────────────────────────────────────────────────────

  startEdit(p: Parametro): void {
    this.editingParamId.set(p.id);
    this.editValue = p.valor;
  }

  cancelEdit(): void {
    this.editingParamId.set(null);
    this.editValue = '';
  }

  saveValor(p: Parametro): void {
    this.savingParam.set(true);
    this.service.updateValor(p.id, this.editValue).subscribe({
      next: () => {
        this.toast.success('Valor atualizado!');
        this.cancelEdit();
        this.savingParam.set(false);
      },
      error: () => { this.toast.error('Erro ao salvar.'); this.savingParam.set(false); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  toSelectOpts(opcoes: string[]): { label: string; value: string }[] {
    return opcoes.map(o => ({ label: o, value: o }));
  }

  onSearch(v: string): void { this.busca.set(v); }
  clearFilters(): void { this.busca.set(''); this.grupoFiltro.set(''); }

  // ── CRUD modal ────────────────────────────────────────────────────────────

  openCreate(): void {
    this.paramForm = { nome: '', descricao: '', grupoId: this.service.grupos()[0]?.id ?? '', tipo: 'texto', valor: '', opcoesText: '', ativo: true };
    this.paramErrors = {};
    this.formDirty.set(false);
    this.confirmDiscard.set(false);
    this.paramEditingId.set(null);
    this.paramModalOpen.set(true);
  }

  openEditParam(p: Parametro): void {
    this.paramForm = {
      nome: p.nome,
      descricao: p.descricao,
      grupoId: p.grupoId,
      tipo: p.tipo,
      valor: p.valor,
      opcoesText: (p.opcoes ?? []).join('\n'),
      ativo: p.ativo,
    };
    this.paramErrors = {};
    this.formDirty.set(false);
    this.confirmDiscard.set(false);
    this.paramEditingId.set(p.id);
    this.paramModalOpen.set(true);
  }

  markDirty(): void { this.formDirty.set(true); }

  requestParamClose(): void {
    if (this.formDirty()) {
      this.confirmDiscard.set(true);
    } else {
      this._doParamClose();
    }
  }

  onParamModalXClose(): void {
    if (this.formDirty()) {
      setTimeout(() => this.paramModalOpen.set(true), 0);
      this.confirmDiscard.set(true);
    } else {
      this._doParamClose();
    }
  }

  discardChanges(): void {
    this.confirmDiscard.set(false);
    this._doParamClose();
  }

  continueEditing(): void {
    this.confirmDiscard.set(false);
  }

  private _doParamClose(): void {
    this.paramModalOpen.set(false);
    this.formDirty.set(false);
    this.confirmDiscard.set(false);
    this.paramErrors = {};
  }

  saveParam(): void {
    this.paramErrors = {};
    if (!this.paramForm.nome?.trim()) {
      this.paramErrors['nome'] = 'Nome é obrigatório';
      return;
    }
    if (!this.paramForm.grupoId) {
      this.paramErrors['grupoId'] = 'Grupo é obrigatório';
      return;
    }

    const opcoes = this.paramForm.tipo === 'lista'
      ? this.paramForm.opcoesText.split('\n').map(o => o.trim()).filter(Boolean)
      : undefined;

    const data = {
      nome:      this.paramForm.nome.trim(),
      descricao: this.paramForm.descricao,
      grupoId:   this.paramForm.grupoId,
      tipo:      this.paramForm.tipo,
      valor:     this.paramForm.valor,
      opcoes,
      ativo:     this.paramForm.ativo,
    };

    this.paramSaving.set(true);
    const id  = this.paramEditingId();
    const obs = id
      ? this.service.updateParametro(id, data)
      : this.service.createParametro(data);

    obs.subscribe(() => {
      this.toast.success(id ? 'Parâmetro atualizado!' : 'Parâmetro criado!');
      this.paramSaving.set(false);
      this._doParamClose();
    });
  }

  confirmDeleteParam(p: Parametro): void {
    this.deletingParam.set(p);
    this.deleteOpen.set(true);
  }

  executeDeleteParam(): void {
    const p = this.deletingParam();
    if (!p) return;
    this.service.deleteParametro(p.id).subscribe(() => {
      this.toast.success('Parâmetro excluído!');
      this.deleteOpen.set(false);
      this.deletingParam.set(null);
    });
  }

  ngOnInit(): void {
    this.service.getGrupos().subscribe();
    this.service.getParametros().subscribe();
  }
}
