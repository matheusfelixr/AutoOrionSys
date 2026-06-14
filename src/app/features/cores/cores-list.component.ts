import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CardComponent, CardHeaderComponent, CardBodyComponent,
  BadgeComponent, ButtonComponent, InputComponent,
  ModalComponent, ToastService, LoadingComponent,
  PageHeaderComponent, SearchBarComponent, EmptyStateComponent,
  PaginationComponent, AuditInfoComponent, CanDirective,
} from 'ui-lib';
import { CoresService } from '../../core/services/cores.service';
import { Cor } from '../../core/models/cor.model';

const FORM_VAZIO = (): Partial<Cor> => ({ nome: '' });

@Component({
  selector: 'app-cores-list',
  standalone: true,
  imports: [
    FormsModule,
    CardComponent, CardHeaderComponent, CardBodyComponent,
    BadgeComponent, ButtonComponent, InputComponent,
    ModalComponent, LoadingComponent,
    PageHeaderComponent, SearchBarComponent, EmptyStateComponent,
    PaginationComponent, AuditInfoComponent, CanDirective,
  ],
  template: `
    <div class="cores-page">
      <ui-page-header
        title="Cadastro de Cores"
        subtitle="Gerencie as cores de veículos disponíveis no sistema"
        icon="🎨"
      >
        <ui-button *uiCan="['cores', 'criar']" actions variant="primary" (clicked)="abrirModal()">
          + Nova Cor
        </ui-button>
      </ui-page-header>

      <ui-card>
        <ui-card-body>
          <ui-search-bar
            placeholder="Buscar por nome da cor..."
            (searchChange)="onBusca($event)"
          />
        </ui-card-body>
      </ui-card>

      <ui-card>
        <ui-card-header>
          <span>{{ totalElements() }} cor{{ totalElements() !== 1 ? 'es' : '' }} encontrada{{ totalElements() !== 1 ? 's' : '' }}</span>
        </ui-card-header>
        <ui-card-body>
          @if (loading()) {
            <div class="loading-wrap"><ui-loading size="md" /></div>
          } @else if (cores().length === 0) {
            <ui-empty-state
              icon="🎨"
              title="Nenhuma cor encontrada"
              description="Cadastre a primeira cor clicando em '+ Nova Cor'."
            />
          } @else {
            <div class="table-wrap">
              <table class="cores-table">
                <thead>
                  <tr>
                    <th>Cor</th>
                    <th>Status</th>
                    <th>Criada em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of cores(); track c.id) {
                    <tr>
                      <td>
                        <div class="cor-nome">
                          <span class="cor-dot" [style.background]="corHex(c.nome)"></span>
                          <strong>{{ c.nome }}</strong>
                        </div>
                      </td>
                      <td>
                        <ui-badge
                          [label]="c.ativo ? 'Ativa' : 'Inativa'"
                          [color]="c.ativo ? 'success' : 'danger'"
                          size="sm"
                        />
                      </td>
                      <td class="date-cell">{{ formatDate(c.criadoEm) }}</td>
                      <td>
                        <div class="acoes">
                          <ui-button *uiCan="['cores', 'editar']" variant="ghost" size="sm" (clicked)="abrirModal(c)">✏️</ui-button>
                          <ui-button *uiCan="['cores', 'excluir']" variant="ghost" size="sm" (clicked)="confirmarExclusao(c)">🗑️</ui-button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="pagination-wrap">
              <ui-pagination
                [currentPage]="page() + 1"
                [totalPages]="totalPages()"
                (pageChange)="onPage($event - 1)"
              />
            </div>
          }
        </ui-card-body>
      </ui-card>
    </div>

    <!-- Modal Criar / Editar -->
    <ui-modal
      [open]="modalAberto()"
      [title]="tituloModal()"
      size="sm"
      (closed)="fecharModal()"
    >
      <div class="form-single">
        <ui-input
          label="Nome da Cor"
          [required]="true"
          placeholder="ex: Prata, Preto, Branco Pérola..."
          [ngModel]="formNome()"
          (ngModelChange)="setNome($event)"
          [errorMessage]="erroNome()"
        />
      </div>

      @if (editando()) {
        <ui-audit-info
          [criadoEm]="editando()!.criadoEm"
          [criadoPor]="editando()!.criadoPor"
          [atualizadoEm]="editando()!.atualizadoEm"
          [atualizadoPor]="editando()!.atualizadoPor"
        />
      }

      <div modal-footer class="modal-footer">
        <ui-button variant="ghost" (clicked)="fecharModal()">Cancelar</ui-button>
        <ui-button variant="primary" [loading]="salvando()" (clicked)="salvar()">
          {{ editando() ? 'Salvar Alterações' : 'Cadastrar Cor' }}
        </ui-button>
      </div>
    </ui-modal>

    <!-- Modal Exclusão -->
    <ui-modal
      [open]="confirmarExclusaoAberto()"
      title="Excluir Cor"
      size="sm"
      (closed)="fecharExclusao()"
    >
      <p>Tem certeza que deseja excluir a cor <strong>{{ nomeParaExcluir() }}</strong>?</p>
      <div modal-footer class="modal-footer">
        <ui-button variant="ghost" (clicked)="fecharExclusao()">Cancelar</ui-button>
        <ui-button variant="danger" [loading]="salvando()" (clicked)="excluir()">Excluir</ui-button>
      </div>
    </ui-modal>
  `,
  styles: [`
    .cores-page {
      display: flex; flex-direction: column; gap: 1.25rem;
      padding: 1.5rem;
    }
    .loading-wrap { display: flex; justify-content: center; padding: 3rem; }
    .table-wrap { overflow-x: auto; }
    .cores-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .cores-table th {
      padding: 0.75rem 1rem; text-align: left; font-weight: 600;
      color: var(--ui-color-text-secondary); border-bottom: 1px solid var(--ui-color-border);
    }
    .cores-table td {
      padding: 0.875rem 1rem; border-bottom: 1px solid var(--ui-color-border); vertical-align: middle;
    }
    .cores-table tbody tr:hover { background: var(--ui-color-bg-subtle); }
    .cor-nome { display: flex; align-items: center; gap: 0.625rem; }
    .cor-dot {
      width: 16px; height: 16px; border-radius: 50%;
      border: 1px solid var(--ui-color-border); flex-shrink: 0;
    }
    .date-cell { color: var(--ui-color-text-muted); font-size: 0.8rem; }
    .acoes { display: flex; gap: 0.25rem; }
    .pagination-wrap {
      display: flex; justify-content: center; padding: 1rem;
      border-top: 1px solid var(--ui-color-border);
    }
    .form-single { padding: 0.5rem 0; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; }
  `],
})
export class CoresListComponent implements OnInit {
  private svc   = inject(CoresService);
  private toast = inject(ToastService);

  cores         = signal<Cor[]>([]);
  loading       = signal(false);
  totalElements = signal(0);
  totalPages    = signal(1);
  page          = signal(0);
  busca         = signal('');

  modalAberto = signal(false);
  salvando    = signal(false);
  editando    = signal<Cor | null>(null);
  form        = signal<Partial<Cor>>(FORM_VAZIO());
  erros       = signal<Record<string, string>>({});

  confirmarExclusaoAberto = signal(false);
  corParaExcluir          = signal<Cor | null>(null);

  tituloModal    = computed(() => this.editando() ? 'Editar Cor' : 'Nova Cor');
  nomeParaExcluir = computed(() => this.corParaExcluir()?.nome ?? '');
  formNome       = computed(() => this.form().nome ?? '');
  erroNome       = computed(() => this.erros()['nome'] ?? '');

  setNome(v: string) { this.form.set({ ...this.form(), nome: v }); }

  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR');
  }

  /** Mapa simples de nomes de cor → hex aproximado para o ponto visual */
  corHex(nome: string): string {
    const map: Record<string, string> = {
      'Amarelo': '#FACC15', 'Azul': '#3B82F6', 'Azul Celeste': '#7DD3FC',
      'Azul Escuro': '#1E3A8A', 'Azul Marinho': '#1E40AF', 'Bege': '#D4B896',
      'Bordô': '#881337', 'Branco': '#F8FAFC', 'Branco Pérola': '#F1F5F9',
      'Bronze': '#B45309', 'Cinza': '#9CA3AF', 'Cinza Escuro': '#4B5563',
      'Cobre': '#C2410C', 'Dourado': '#D97706', 'Grafite': '#374151',
      'Laranja': '#F97316', 'Laranja Metálico': '#EA580C', 'Marrom': '#78350F',
      'Prata': '#CBD5E1', 'Preto': '#111827', 'Rosa': '#F472B6',
      'Roxo': '#7C3AED', 'Verde': '#22C55E', 'Verde Escuro': '#14532D',
      'Verde Militar': '#4D7C0F', 'Vermelho': '#EF4444', 'Vermelho Escuro': '#991B1B',
      'Vinho': '#7F1D1D',
    };
    return map[nome] ?? '#94A3B8';
  }

  ngOnInit() { this.carregar(); }

  carregar() {
    this.loading.set(true);
    this.svc.getAll({ busca: this.busca(), page: this.page() }).subscribe({
      next: res => {
        this.cores.set(res.content);
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => { this.toast.error('Erro ao carregar cores.'); this.loading.set(false); },
    });
  }

  onBusca(v: string) { this.busca.set(v); this.page.set(0); this.carregar(); }
  onPage(p: number)  { this.page.set(p);                    this.carregar(); }

  abrirModal(c?: Cor) {
    this.erros.set({});
    this.editando.set(c ?? null);
    this.form.set(c ? { nome: c.nome } : FORM_VAZIO());
    this.modalAberto.set(true);
  }

  fecharModal()   { this.modalAberto.set(false); this.editando.set(null); }
  fecharExclusao(){ this.confirmarExclusaoAberto.set(false); }

  validar(): boolean {
    const e: Record<string, string> = {};
    if (!this.form().nome?.trim()) e['nome'] = 'Nome da cor é obrigatório';
    this.erros.set(e);
    return Object.keys(e).length === 0;
  }

  salvar() {
    if (!this.validar()) return;
    this.salvando.set(true);
    const payload  = { nome: this.form().nome!.trim() };
    const editando = this.editando();
    const op = editando ? this.svc.update(editando.id!, payload) : this.svc.create(payload);
    op.subscribe({
      next: () => {
        this.toast.success(editando ? 'Cor atualizada!' : 'Cor cadastrada!');
        this.salvando.set(false); this.fecharModal(); this.carregar();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Erro ao salvar cor.');
        this.salvando.set(false);
      },
    });
  }

  confirmarExclusao(c: Cor) {
    this.corParaExcluir.set(c);
    this.confirmarExclusaoAberto.set(true);
  }

  excluir() {
    const c = this.corParaExcluir();
    if (!c?.id) return;
    this.salvando.set(true);
    this.svc.delete(c.id).subscribe({
      next: () => {
        this.toast.success('Cor excluída!');
        this.salvando.set(false); this.confirmarExclusaoAberto.set(false); this.carregar();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Erro ao excluir cor.');
        this.salvando.set(false);
      },
    });
  }
}
