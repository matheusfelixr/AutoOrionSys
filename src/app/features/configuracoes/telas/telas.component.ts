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
  SearchBarComponent,
  EmptyStateComponent,
} from 'ui-lib';
import { TelasService } from '../../../core/services/telas.service';
import { MenusService } from '../../../core/services/menus.service';
import { TelaSistema } from '../../../core/models/tela.model';

@Component({
  selector: 'app-telas',
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
    SearchBarComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="crud-page">
      <ui-page-header
        title="Telas do Sistema"
        subtitle="Cadastro e configuração das telas disponíveis"
        [total]="filtered().length"
      >
        <ui-button actions variant="primary" iconLeft="+" (clicked)="openCreate()">Nova Tela</ui-button>
      </ui-page-header>

      <ui-search-bar
        placeholder="Buscar tela por nome ou screen name..."
        [totalResults]="filtered().length"
        totalLabel="tela(s) encontrada(s)"
        [hasActiveFilters]="!!menuFiltro()"
        (searchChange)="onSearch($event)"
        (clearFilters)="clearFilters()"
      >
        <ui-select filters label="Menu" [options]="menuOptions()"
          [ngModel]="menuFiltro()" (ngModelChange)="menuFiltro.set($event)" />
      </ui-search-bar>

      @if (filtered().length === 0) {
        <ui-empty-state icon="⚙️" title="Nenhuma tela encontrada"
          description="Cadastre a primeira tela do sistema.">
          <ui-button variant="primary" (clicked)="openCreate()">Nova Tela</ui-button>
        </ui-empty-state>
      } @else {
        <!-- ── VISUALIZAÇÃO EM ÁRVORE ─────────────────────────────── -->
        @for (grupo of menusComTelas(); track grupo.id) {
          <div class="tree-group">

            <!-- Cabeçalho da seção de menu -->
            <div class="tree-group__header">
              @if (grupo.icone) {
                <span class="tree-group__icone">{{ grupo.icone }}</span>
              }
              <span class="tree-group__nome">{{ grupo.nome }}</span>
              <span class="tree-group__count">{{ parentTelasByMenu(grupo.id).length }} item(s)</span>
            </div>

            <!-- Itens pai e seus filhos -->
            <div class="tree-body">
              @for (pai of parentTelasByMenu(grupo.id); track pai.id) {

                <!-- Item pai (com ícone) -->
                <div class="tree-item tree-item--parent">
                  <div class="tree-item__content">
                    <span class="tree-item__icon">{{ pai.icone || '📄' }}</span>
                    <div class="tree-item__info">
                      <div class="tree-item__title-row">
                        <strong class="tree-item__nome">{{ pai.nome }}</strong>
                        <code class="screen-chip">{{ pai.screenName }}</code>
                        <ui-badge [variant]="pai.ativo ? 'success' : 'neutral'" size="sm">{{ pai.ativo ? 'Ativo' : 'Inativo' }}</ui-badge>
                      </div>
                      @if (pai.descricao) {
                        <p class="tree-item__desc">{{ pai.descricao }}</p>
                      }
                    </div>
                  </div>
                  <div class="tree-item__actions">
                    <ui-button variant="ghost" size="sm" iconLeft="✏️" (clicked)="openEdit(pai)">Editar</ui-button>
                    <ui-button variant="ghost" size="sm" iconLeft="🗑" (clicked)="confirmDeleteItem(pai)">Excluir</ui-button>
                  </div>
                </div>

                <!-- Filhos do item pai -->
                @if (childrenOf(pai.screenName, grupo.id).length > 0) {
                  <div class="tree-children">
                    @for (filho of childrenOf(pai.screenName, grupo.id); track filho.id) {
                      <div class="tree-item tree-item--child">
                        <div class="tree-connector">
                          <span class="tree-connector__line"></span>
                          <span class="tree-connector__arrow">└</span>
                        </div>
                        <div class="tree-item__content">
                          <span class="tree-item__dot">•</span>
                          <div class="tree-item__info">
                            <div class="tree-item__title-row">
                              <span class="tree-item__nome">{{ filho.nome }}</span>
                              <code class="screen-chip screen-chip--child">{{ filho.screenName }}</code>
                              <ui-badge [variant]="filho.ativo ? 'success' : 'neutral'" size="sm">{{ filho.ativo ? 'Ativo' : 'Inativo' }}</ui-badge>
                            </div>
                            @if (filho.descricao) {
                              <p class="tree-item__desc">{{ filho.descricao }}</p>
                            }
                          </div>
                        </div>
                        <div class="tree-item__actions">
                          <ui-button variant="ghost" size="sm" iconLeft="✏️" (clicked)="openEdit(filho)">Editar</ui-button>
                          <ui-button variant="ghost" size="sm" iconLeft="🗑" (clicked)="confirmDeleteItem(filho)">Excluir</ui-button>
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </div>
        }
      }
    </div>

    <!-- ── Modal: Criar / Editar ─────────────────────────────────────── -->
    <ui-modal
      [open]="modalOpen()"
      [title]="editingId() ? 'Editar Tela' : 'Nova Tela'"
      size="xl"
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

        <!-- ── Seção 1: Posição na hierarquia ──────────────── -->
        <div class="form-section">
          <h4 class="form-section__title">📍 Posição na hierarquia</h4>

          <!-- Tipo: cards de seleção visual -->
          <div class="tipo-cards">
            <label
              class="tipo-card"
              [class.tipo-card--selected]="!form.isChild"
              (click)="form.isChild = false; form.parentScreenName = ''; form.icone = '📄'; markDirty()"
            >
              <span class="tipo-card__icon">🔷</span>
              <div class="tipo-card__text">
                <strong>Item principal</strong>
                <span>Aparece diretamente no menu, pode ter sub-itens</span>
              </div>
              @if (!form.isChild) { <span class="tipo-card__check">✓</span> }
            </label>

            <label
              class="tipo-card"
              [class.tipo-card--selected]="form.isChild"
              (click)="form.isChild = true; form.icone = ''; markDirty()"
            >
              <span class="tipo-card__icon">🔹</span>
              <div class="tipo-card__text">
                <strong>Sub-item</strong>
                <span>Filho de um item principal já cadastrado</span>
              </div>
              @if (form.isChild) { <span class="tipo-card__check">✓</span> }
            </label>
          </div>

          <!-- Menu onde vai aparecer -->
          <div class="form-row-2">
            <ui-select
              label="Menu (seção)"
              [required]="true"
              [options]="menuSelectOptions()"
              [ngModel]="form.menuId"
              (ngModelChange)="form.menuId = $event; form.parentScreenName = ''; markDirty()"
              [errorMessage]="errors['menuId'] || ''"
            />

            @if (form.isChild) {
              <ui-select
                label="Item pai"
                [required]="true"
                placeholder="Selecione o item pai..."
                [options]="parentOptions()"
                [ngModel]="form.parentScreenName"
                (ngModelChange)="form.parentScreenName = $event; markDirty()"
                [errorMessage]="errors['parentScreenName'] || ''"
              />
            } @else {
              <ui-input
                label="Ícone (emoji)"
                placeholder="Ex: 📊 🚗 👥"
                hint="Apenas itens principais têm ícone"
                [ngModel]="form.icone"
                (ngModelChange)="form.icone = $event; markDirty()"
              />
            }
          </div>
        </div>

        <!-- ── Preview em tempo real ───────────────────────── -->
        @if (form.menuId) {
          <div class="form-preview">
            <span class="form-preview__label">🔍 Pré-visualização na árvore</span>
            <div class="form-preview__tree">
              <div class="preview-section">{{ menuNome(form.menuId) || 'Seção' }}</div>
              @if (!form.isChild) {
                <div class="preview-parent">
                  {{ form.icone || '📄' }}
                  <strong>{{ form.nome || 'Nome da tela' }}</strong>
                  <code class="screen-chip">{{ form.screenName || 'screen.name' }}</code>
                </div>
              } @else {
                <div class="preview-parent preview-parent--ghost">
                  {{ parentIcone(form.parentScreenName) || '📄' }}
                  <span>{{ parentNome(form.parentScreenName) || 'Item pai' }}</span>
                </div>
                <div class="preview-child">
                  <span class="preview-connector">└──</span>
                  <span class="preview-dot">•</span>
                  <span>{{ form.nome || 'Nome da tela' }}</span>
                  <code class="screen-chip">{{ form.screenName || 'screen.name' }}</code>
                </div>
              }
            </div>
          </div>
        }

        <!-- ── Seção 2: Dados da tela ──────────────────────── -->
        <div class="form-section">
          <h4 class="form-section__title">📋 Dados da tela</h4>

          <div class="form-row-2">
            <ui-input
              label="Nome"
              placeholder="Ex: Relatórios Financeiros"
              [required]="true"
              [ngModel]="form.nome"
              (ngModelChange)="form.nome = $event; autoFillScreenName(); markDirty()"
              [errorMessage]="errors['nome'] || ''"
            />
            <ui-input
              label="Identificador (screenName)"
              placeholder="Ex: relatorios.financeiro"
              [required]="true"
              hint="Único, sem espaços, use ponto para sub-telas"
              [ngModel]="form.screenName"
              (ngModelChange)="form.screenName = $event; markDirty()"
              [errorMessage]="errors['screenName'] || ''"
            />
          </div>

          <ui-textarea
            label="Descrição"
            placeholder="Descreva brevemente o que esta tela faz..."
            [rows]="2"
            [ngModel]="form.descricao"
            (ngModelChange)="form.descricao = $event; markDirty()"
          />

          <ui-input
            label="Ordem"
            type="number"
            hint="Define a posição dentro do menu/item pai"
            [ngModel]="form.ordem"
            (ngModelChange)="form.ordem = +$event; markDirty()"
          />
        </div>
        <ui-select
          label="Status"
          [options]="statusOpts"
          [ngModel]="form.ativo ? 'true' : 'false'"
          (ngModelChange)="form.ativo = $event === 'true'; markDirty()"
        />
      </div>
      <div modal-footer>
        <ui-button variant="ghost" (clicked)="requestClose()">Cancelar</ui-button>
        <ui-button variant="primary" [loading]="saving()" (clicked)="save()">Salvar</ui-button>
      </div>
    </ui-modal>

    <!-- ── Modal: Excluir ────────────────────────────────────────────── -->
    <ui-modal [open]="confirmDeleteOpen()" title="Excluir Tela" size="sm"
      (closed)="confirmDeleteOpen.set(false)">
      <div class="modal-form">
        <p>Deseja excluir a tela <strong>{{ deletingItem()?.nome }}</strong>? Esta ação não pode ser desfeita.</p>
      </div>
      <div modal-footer>
        <ui-button variant="ghost" (clicked)="confirmDeleteOpen.set(false)">Cancelar</ui-button>
        <ui-button variant="danger" [loading]="deleting()" (clicked)="executeDelete()">Excluir</ui-button>
      </div>
    </ui-modal>
  `,
  styles: [`
    .crud-page { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.5rem; width: 100%; }

    /* ── ÁRVORE DE TELAS ──────────────────────────────────────────── */
    .tree-group { display: flex; flex-direction: column; gap: 0; }

    .tree-group__header {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      background: var(--ui-color-primary-light);
      border: 1px solid var(--ui-color-primary);
      border-radius: var(--ui-radius-md);
      margin-bottom: 0.25rem;
    }
    .tree-group__icone { font-size: 1rem; }
    .tree-group__nome {
      font-size: var(--ui-font-size-sm); font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--ui-color-primary-dark);
    }
    .tree-group__count {
      font-size: var(--ui-font-size-xs); color: var(--ui-color-primary);
      margin-left: auto; font-weight: 600;
    }

    /* Corpo da árvore */
    .tree-body { display: flex; flex-direction: column; gap: 0; padding-left: 0.5rem; }

    /* Item pai */
    .tree-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      border-left: 3px solid var(--ui-color-primary-light);
      background: var(--ui-color-bg-base);
      border-radius: 0 var(--ui-radius-md) var(--ui-radius-md) 0;
      margin-bottom: 2px;
      transition: background 0.15s;
    }
    .tree-item:hover { background: var(--ui-color-bg-subtle); }
    .tree-item--parent {
      border-left-color: var(--ui-color-primary);
      font-weight: 600;
    }
    .tree-item--child {
      border-left-color: var(--ui-color-border);
      background: transparent;
    }

    /* Conector visual └ */
    .tree-children {
      padding-left: 1.5rem;
      border-left: 2px dashed var(--ui-color-border);
      margin-left: 0.875rem;
      margin-bottom: 0.5rem;
    }
    .tree-connector { display: flex; align-items: center; flex-shrink: 0; display: none; }

    /* Conteúdo do item */
    .tree-item__content { flex: 1; display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
    .tree-item__icon { font-size: 1.1rem; flex-shrink: 0; }
    .tree-item__dot { font-size: 0.85rem; color: var(--ui-color-text-muted); flex-shrink: 0; }
    .tree-item__info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .tree-item__title-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .tree-item__nome { font-size: var(--ui-font-size-sm); }
    .tree-item--parent .tree-item__nome { font-weight: 700; font-size: var(--ui-font-size-base); }
    .tree-item__desc { margin: 0; font-size: var(--ui-font-size-xs); color: var(--ui-color-text-muted); }
    .tree-item__actions { display: flex; gap: 0.25rem; flex-shrink: 0; }

    /* Screen name chips */
    .screen-chip {
      display: inline-block; padding: 1px 8px;
      background: var(--ui-color-bg-subtle); border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-full); font-size: 10px;
      color: var(--ui-color-text-muted); font-family: monospace;
    }
    .screen-chip--child { font-size: 10px; opacity: 0.8; }

    /* Modal */
    .modal-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .discard-banner { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.875rem 1rem; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.4); border-radius: var(--ui-radius-md); }
    .discard-banner__text { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: var(--ui-font-size-sm); }
    .discard-banner__actions { display: flex; gap: 0.5rem; }

    /* Seções do formulário */
    .form-section { display: flex; flex-direction: column; gap: 0.875rem; padding: 1rem; background: var(--ui-color-bg-subtle); border-radius: var(--ui-radius-lg); border: 1px solid var(--ui-color-border); }
    .form-section__title { margin: 0; font-size: var(--ui-font-size-sm); font-weight: 700; color: var(--ui-color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; }
    @media (max-width: 600px) { .form-row-2 { grid-template-columns: 1fr; } }

    /* Cards de tipo (principal / sub-item) */
    .tipo-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .tipo-card {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.875rem 1rem; border: 2px solid var(--ui-color-border);
      border-radius: var(--ui-radius-lg); cursor: pointer;
      transition: border-color 0.15s, background 0.15s; position: relative;
    }
    .tipo-card:hover { border-color: var(--ui-color-primary); background: var(--ui-color-primary-light); }
    .tipo-card--selected { border-color: var(--ui-color-primary); background: var(--ui-color-primary-light); }
    .tipo-card__icon { font-size: 1.5rem; flex-shrink: 0; }
    .tipo-card__text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .tipo-card__text strong { font-size: var(--ui-font-size-sm); color: var(--ui-color-text-primary); }
    .tipo-card__text span { font-size: var(--ui-font-size-xs); color: var(--ui-color-text-secondary); }
    .tipo-card__check { position: absolute; top: 0.5rem; right: 0.5rem; color: var(--ui-color-primary); font-weight: 700; }

    /* Preview em tempo real */
    .form-preview {
      display: flex; flex-direction: column; gap: 0.5rem;
      padding: 0.875rem 1rem; background: var(--ui-color-bg-base);
      border: 1px dashed var(--ui-color-primary); border-radius: var(--ui-radius-md);
    }
    .form-preview__label { font-size: var(--ui-font-size-xs); font-weight: 600; color: var(--ui-color-primary); text-transform: uppercase; letter-spacing: 0.05em; }
    .form-preview__tree { display: flex; flex-direction: column; gap: 4px; font-size: var(--ui-font-size-sm); }
    .preview-section { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ui-color-primary-dark); padding: 2px 8px; background: var(--ui-color-primary-light); border-radius: var(--ui-radius-sm); align-self: flex-start; }
    .preview-parent { display: flex; align-items: center; gap: 0.5rem; padding: 4px 8px; font-weight: 600; }
    .preview-parent--ghost { opacity: 0.6; }
    .preview-child { display: flex; align-items: center; gap: 0.5rem; padding: 2px 8px; padding-left: 1.5rem; }
    .preview-connector { font-family: monospace; color: var(--ui-color-text-muted); }
    .preview-dot { color: var(--ui-color-text-muted); }
  `],
})
export class TelasComponent implements OnInit {
  private telasService = inject(TelasService);
  private menusService = inject(MenusService);
  private toast        = inject(ToastService);

  isLoading = signal(false);

  // ── Filters ───────────────────────────────────────────────────────────────

  buscaInput = '';
  busca      = signal('');
  menuFiltro = signal('');

  // ── Computed ──────────────────────────────────────────────────────────────

  filtered = computed(() => {
    const q   = this.busca().toLowerCase().trim();
    const mid = this.menuFiltro();
    return this.telasService.telas().filter(t =>
      (!q || t.nome.toLowerCase().includes(q) || t.screenName.toLowerCase().includes(q)) &&
      (!mid || t.menuId === mid)
    );
  });

  menusComTelas = computed(() => {
    const telasIds = new Set(this.filtered().map(t => t.menuId));
    return this.menusService.menus()
      .filter(m => telasIds.has(m.id))
      .sort((a, b) => a.ordem - b.ordem);
  });

  telasByMenu(menuId: string): TelaSistema[] {
    return this.filtered()
      .filter(t => t.menuId === menuId)
      .sort((a, b) => {
        if (!a.parentScreenName && b.parentScreenName) return -1;
        if (a.parentScreenName && !b.parentScreenName) return 1;
        return a.ordem - b.ordem;
      });
  }

  /** Retorna apenas os itens PAI (sem parentScreenName) de um menu */
  parentTelasByMenu(menuId: string): TelaSistema[] {
    return this.filtered()
      .filter(t => t.menuId === menuId && !t.parentScreenName)
      .sort((a, b) => a.ordem - b.ordem);
  }

  /** Retorna os filhos de um item pai específico */
  childrenOf(parentScreenName: string, menuId: string): TelaSistema[] {
    return this.filtered()
      .filter(t => t.parentScreenName === parentScreenName && t.menuId === menuId)
      .sort((a, b) => a.ordem - b.ordem);
  }

  // ── Select options ────────────────────────────────────────────────────────

  menuOptions = computed(() => [
    { label: 'Todos os menus', value: '' },
    ...this.menusService.menus().map(m => ({ label: m.nome, value: m.id })),
  ]);

  menuSelectOptions = computed(() =>
    this.menusService.menus().map(m => ({ label: m.nome, value: m.id }))
  );

  parentOptions = computed(() => {
    const mid = this.form.menuId;
    if (!mid) return [];
    return this.telasService.telas()
      .filter(t => t.menuId === mid && !t.parentScreenName)
      .map(t => ({ label: t.nome + ' (' + t.screenName + ')', value: t.screenName }));
  });

  readonly tipoOptions = [
    { label: 'Item principal (com ícone)', value: 'principal' },
    { label: 'Sub-item (filho de outro item)', value: 'filho' },
  ];

  readonly statusOpts = [
    { label: 'Ativo',   value: 'true' },
    { label: 'Inativo', value: 'false' },
  ];

  // ── Modal ─────────────────────────────────────────────────────────────────

  modalOpen         = signal(false);
  editingId         = signal<string | null>(null);
  saving            = signal(false);
  formDirty         = signal(false);
  confirmDiscard    = signal(false);
  confirmDeleteOpen = signal(false);
  deletingItem      = signal<TelaSistema | null>(null);
  deleting          = signal(false);

  form: {
    screenName: string; nome: string; descricao: string;
    menuId: string; parentScreenName: string; icone: string;
    ordem: number; ativo: boolean; isChild: boolean;
  } = { screenName: '', nome: '', descricao: '', menuId: '', parentScreenName: '', icone: '', ordem: 1, ativo: true, isChild: false };

  errors: Record<string, string> = {};

  ngOnInit(): void {
    this.isLoading.set(true);
    this.telasService.getAll().subscribe(() => this.isLoading.set(false));
  }

  /** Auto-preenche o screenName baseado no nome e contexto */
  autoFillScreenName(): void {
    if (this.editingId()) return; // não sobrescreve ao editar
    const base = this.form.nome
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-\.]/g, '');

    if (this.form.isChild && this.form.parentScreenName) {
      this.form.screenName = `${this.form.parentScreenName}.${base}`;
    } else {
      this.form.screenName = base;
    }
  }

  /** Nome do menu pelo id */
  menuNome(menuId: string): string {
    return this.menusService.menus().find(m => m.id === menuId)?.nome ?? '';
  }

  /** Nome do item pai pelo screenName */
  parentNome(screenName: string): string {
    return this.telasService.telas().find(t => t.screenName === screenName)?.nome ?? '';
  }

  /** Ícone do item pai pelo screenName */
  parentIcone(screenName: string): string {
    return this.telasService.telas().find(t => t.screenName === screenName)?.icone ?? '📄';
  }

  onSearch(value: string): void { this.busca.set(value); }

  clearFilters(): void {
    this.busca.set('');
    this.menuFiltro.set('');
  }

  openCreate(): void {
    this._resetForm();
    this.editingId.set(null);
    this.modalOpen.set(true);
  }

  openEdit(t: TelaSistema): void {
    this.form = {
      screenName:       t.screenName,
      nome:             t.nome,
      descricao:        t.descricao,
      menuId:           t.menuId,
      parentScreenName: t.parentScreenName ?? '',
      icone:            t.icone ?? '',
      ordem:            t.ordem,
      ativo:            t.ativo,
      isChild:          !!t.parentScreenName,
    };
    this.errors = {};
    this.formDirty.set(false);
    this.confirmDiscard.set(false);
    this.editingId.set(t.id);
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
    this._resetForm();
  }

  private _resetForm(): void {
    this.form = { screenName: '', nome: '', descricao: '', menuId: '', parentScreenName: '', icone: '', ordem: 1, ativo: true, isChild: false };
    this.errors = {};
  }

  save(): void {
    this.errors = {};
    if (!this.form.screenName?.trim()) this.errors['screenName'] = 'Screen name é obrigatório';
    if (!this.form.nome?.trim()) this.errors['nome'] = 'Nome é obrigatório';
    if (!this.form.menuId) this.errors['menuId'] = 'Menu é obrigatório';
    if (this.form.isChild && !this.form.parentScreenName) this.errors['parentScreenName'] = 'Selecione o item pai';
    if (Object.keys(this.errors).length > 0) return;

    const id = this.editingId();
    const data: Omit<TelaSistema, 'id'> = {
      screenName:       this.form.screenName,
      nome:             this.form.nome,
      descricao:        this.form.descricao,
      menuId:           this.form.menuId,
      parentScreenName: this.form.isChild && this.form.parentScreenName ? this.form.parentScreenName : undefined,
      icone:            !this.form.isChild && this.form.icone ? this.form.icone : undefined,
      ordem:            this.form.ordem,
      ativo:            this.form.ativo,
    };

    this.saving.set(true);
    const obs = id
      ? this.telasService.update(id, data)
      : this.telasService.create(data);
    obs.subscribe({
      next: () => {
        this.toast.success(id ? 'Tela atualizada!' : 'Tela cadastrada!');
        this.saving.set(false);
        this._doClose();
      },
      error: () => { this.toast.error('Erro ao salvar.'); this.saving.set(false); },
    });
  }

  confirmDeleteItem(t: TelaSistema): void {
    this.deletingItem.set(t);
    this.confirmDeleteOpen.set(true);
  }

  executeDelete(): void {
    const t = this.deletingItem();
    if (!t) return;
    this.deleting.set(true);
    this.telasService.delete(t.id).subscribe({
      next: () => {
        this.toast.success('Tela excluída!');
        this.confirmDeleteOpen.set(false);
        this.deletingItem.set(null);
        this.deleting.set(false);
      },
      error: () => { this.toast.error('Erro ao excluir.'); this.deleting.set(false); },
    });
  }
}
