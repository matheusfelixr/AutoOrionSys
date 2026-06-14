import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CardComponent, CardHeaderComponent, CardBodyComponent,
  BadgeComponent, ButtonComponent, InputComponent,
  ModalComponent, ToastService, LoadingComponent,
  PageHeaderComponent, SearchBarComponent, EmptyStateComponent,
  PaginationComponent, AuditInfoComponent, CanDirective,
} from 'ui-lib';
import { MarcasService } from '../../core/services/marcas.service';
import { Marca } from '../../core/models/marca.model';

const FORM_VAZIO = (): Partial<Marca> => ({ nome: '' });

@Component({
  selector: 'app-marcas-list',
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
    <div class="marcas-page">
      <ui-page-header
        title="Cadastro de Marcas"
        subtitle="Gerencie as marcas de veículos disponíveis no sistema"
        icon="🏷️"
      >
        <ui-button *uiCan="['marcas', 'criar']" actions variant="primary" (clicked)="abrirModal()">
          + Nova Marca
        </ui-button>
      </ui-page-header>

      <!-- Filtros -->
      <ui-card>
        <ui-card-body>
          <ui-search-bar
            placeholder="Buscar por nome da marca..."
            (searchChange)="onBusca($event)"
          />
        </ui-card-body>
      </ui-card>

      <!-- Tabela -->
      <ui-card>
        <ui-card-header>
          <span>{{ totalElements() }} marca{{ totalElements() !== 1 ? 's' : '' }} encontrada{{ totalElements() !== 1 ? 's' : '' }}</span>
        </ui-card-header>
        <ui-card-body>
          @if (loading()) {
            <div class="loading-wrap">
              <ui-loading size="md" />
            </div>
          } @else if (marcas().length === 0) {
            <ui-empty-state
              icon="🏷️"
              title="Nenhuma marca encontrada"
              description="Cadastre a primeira marca clicando em '+ Nova Marca'."
            />
          } @else {
            <div class="table-wrap">
              <table class="marcas-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Status</th>
                    <th>Criada em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of marcas(); track m.id) {
                    <tr>
                      <td><strong>{{ m.nome }}</strong></td>
                      <td>
                        <ui-badge
                          [label]="m.ativo ? 'Ativa' : 'Inativa'"
                          [color]="m.ativo ? 'success' : 'danger'"
                          size="sm"
                        />
                      </td>
                      <td class="date-cell">{{ formatDate(m.criadoEm) }}</td>
                      <td>
                        <div class="acoes">
                          <ui-button *uiCan="['marcas', 'editar']" variant="ghost" size="sm" (clicked)="abrirModal(m)">
                            ✏️
                          </ui-button>
                          <ui-button *uiCan="['marcas', 'excluir']" variant="ghost" size="sm" (clicked)="confirmarExclusao(m)">
                            🗑️
                          </ui-button>
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
          label="Nome da Marca"
          [required]="true"
          placeholder="ex: Honda, Toyota, Volkswagen..."
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
          {{ editando() ? 'Salvar Alterações' : 'Cadastrar Marca' }}
        </ui-button>
      </div>
    </ui-modal>

    <!-- Modal Confirmação Exclusão -->
    <ui-modal
      [open]="confirmarExclusaoAberto()"
      title="Excluir Marca"
      size="sm"
      (closed)="fecharExclusao()"
    >
      <p>Tem certeza que deseja excluir a marca <strong>{{ nomeParaExcluir() }}</strong>?</p>
      <p style="color: var(--ui-color-text-secondary); font-size: 0.875rem;">
        Veículos cadastrados com esta marca não serão afetados.
      </p>
      <div modal-footer class="modal-footer">
        <ui-button variant="ghost" (clicked)="fecharExclusao()">Cancelar</ui-button>
        <ui-button variant="danger" [loading]="salvando()" (clicked)="excluir()">Excluir</ui-button>
      </div>
    </ui-modal>
  `,
  styles: [`
    .marcas-page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.5rem;
      max-width: 900px;
      margin: 0 auto;
    }
    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
    .table-wrap { overflow-x: auto; }
    .marcas-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .marcas-table th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      color: var(--ui-color-text-secondary);
      border-bottom: 1px solid var(--ui-color-border);
      white-space: nowrap;
    }
    .marcas-table td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--ui-color-border);
      vertical-align: middle;
    }
    .marcas-table tbody tr:hover {
      background: var(--ui-color-bg-subtle);
    }
    .date-cell {
      color: var(--ui-color-text-muted);
      font-size: 0.8rem;
    }
    .acoes { display: flex; gap: 0.25rem; }
    .pagination-wrap {
      display: flex;
      justify-content: center;
      padding: 1rem;
      border-top: 1px solid var(--ui-color-border);
    }
    .form-single {
      padding: 0.5rem 0;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
  `],
})
export class MarcasListComponent implements OnInit {
  private svc   = inject(MarcasService);
  private toast = inject(ToastService);

  // ── Estado da listagem ──────────────────────────────────────────────────────
  marcas        = signal<Marca[]>([]);
  loading       = signal(false);
  totalElements = signal(0);
  totalPages    = signal(1);
  page          = signal(0);
  busca         = signal('');

  // ── Estado do modal ─────────────────────────────────────────────────────────
  modalAberto = signal(false);
  salvando    = signal(false);
  editando    = signal<Marca | null>(null);
  form        = signal<Partial<Marca>>(FORM_VAZIO());
  erros       = signal<Record<string, string>>({});

  // ── Modal exclusão ───────────────────────────────────────────────────────────
  confirmarExclusaoAberto = signal(false);
  marcaParaExcluir        = signal<Marca | null>(null);

  // ── Computed ────────────────────────────────────────────────────────────────
  tituloModal    = computed(() => this.editando() ? 'Editar Marca' : 'Nova Marca');
  nomeParaExcluir = computed(() => this.marcaParaExcluir()?.nome ?? '');
  formNome       = computed(() => this.form().nome ?? '');
  erroNome       = computed(() => this.erros()['nome'] ?? '');

  // ── Setters ──────────────────────────────────────────────────────────────────
  setNome(v: string) { this.form.set({ ...this.form(), nome: v }); }

  // ── Formatação ───────────────────────────────────────────────────────────────
  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR');
  }

  ngOnInit() { this.carregar(); }

  carregar() {
    this.loading.set(true);
    this.svc.getAll({ busca: this.busca(), page: this.page() }).subscribe({
      next: res => {
        this.marcas.set(res.content);
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erro ao carregar marcas.');
        this.loading.set(false);
      },
    });
  }

  onBusca(v: string) { this.busca.set(v); this.page.set(0); this.carregar(); }
  onPage(p: number)  { this.page.set(p);                    this.carregar(); }

  // ── Modal CRUD ───────────────────────────────────────────────────────────────
  abrirModal(m?: Marca) {
    this.erros.set({});
    this.editando.set(m ?? null);
    this.form.set(m ? { nome: m.nome } : FORM_VAZIO());
    this.modalAberto.set(true);
  }

  fecharModal() {
    this.modalAberto.set(false);
    this.editando.set(null);
  }

  fecharExclusao() { this.confirmarExclusaoAberto.set(false); }

  validar(): boolean {
    const e: Record<string, string> = {};
    if (!this.form().nome?.trim()) e['nome'] = 'Nome da marca é obrigatório';
    this.erros.set(e);
    return Object.keys(e).length === 0;
  }

  salvar() {
    if (!this.validar()) return;
    this.salvando.set(true);
    const payload = { nome: this.form().nome!.trim() };
    const editando = this.editando();

    const op = editando
      ? this.svc.update(editando.id!, payload)
      : this.svc.create(payload);

    op.subscribe({
      next: () => {
        this.toast.success(editando ? 'Marca atualizada!' : 'Marca cadastrada!');
        this.salvando.set(false);
        this.fecharModal();
        this.carregar();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Erro ao salvar marca.');
        this.salvando.set(false);
      },
    });
  }

  confirmarExclusao(m: Marca) {
    this.marcaParaExcluir.set(m);
    this.confirmarExclusaoAberto.set(true);
  }

  excluir() {
    const m = this.marcaParaExcluir();
    if (!m?.id) return;
    this.salvando.set(true);
    this.svc.delete(m.id).subscribe({
      next: () => {
        this.toast.success('Marca excluída!');
        this.salvando.set(false);
        this.confirmarExclusaoAberto.set(false);
        this.carregar();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Erro ao excluir marca.');
        this.salvando.set(false);
      },
    });
  }
}
