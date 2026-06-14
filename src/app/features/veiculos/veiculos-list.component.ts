import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CardComponent, CardHeaderComponent, CardBodyComponent,
  BadgeComponent, ButtonComponent, InputComponent, SelectComponent,
  ModalComponent, ToastService, LoadingComponent, ToggleComponent,
  PageHeaderComponent, SearchBarComponent, EmptyStateComponent,
  PaginationComponent, AuditInfoComponent, CanDirective,
} from 'ui-lib';
import { VeiculosService } from '../../core/services/veiculos.service';
import { MarcasService } from '../../core/services/marcas.service';
import { Veiculo } from '../../core/models/veiculo.model';
import { AuthService } from '../../core/services/auth.service';

const ANOS = Array.from({ length: 40 }, (_, i) => {
  const ano = new Date().getFullYear() - i;
  return { value: ano, label: String(ano) };
});

const FORM_VAZIO = (): Partial<Veiculo> => ({
  placa: '', modelo: '', marca: '',
  anoFabricacao: new Date().getFullYear(),
  cor: '', km: undefined,
  chassi: '', renavam: '', numeroMotor: '',
  podeVenderMotor: false, baixado: false, descricao: '',
});

// ── Validação RENAVAM ────────────────────────────────────────────────────────
function validarRenavam(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 9 && digits.length !== 11) return false;
  const padded = digits.padStart(11, '0');
  const weights = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(padded[i], 10) * weights[i];
  }
  const resto = soma % 11;
  const digito = resto < 2 ? 0 : 11 - resto;
  return digito === parseInt(padded[10], 10);
}

// ── Validação Chassi (VIN) ───────────────────────────────────────────────────
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;
function validarChassi(v: string): boolean {
  return VIN_REGEX.test(v);
}

@Component({
  selector: 'app-veiculos-list',
  standalone: true,
  imports: [
    FormsModule,
    CardComponent, CardHeaderComponent, CardBodyComponent,
    BadgeComponent, ButtonComponent, InputComponent, SelectComponent,
    ToggleComponent, ModalComponent, LoadingComponent,
    PageHeaderComponent, SearchBarComponent, EmptyStateComponent,
    PaginationComponent, AuditInfoComponent, CanDirective,
  ],
  template: `
    <div class="veiculos-page">
      <ui-page-header
        title="Veículos"
        subtitle="Gerencie os veículos cadastrados no sistema"
        icon="🚗"
      >
        <ui-button *uiCan="['veiculos', 'criar']" actions variant="primary" (clicked)="abrirModal()">
          + Novo Veículo
        </ui-button>
      </ui-page-header>

      <!-- Filtros -->
      <ui-card>
        <ui-card-body>
          <div class="filtros">
            <ui-search-bar
              placeholder="Buscar por placa, modelo, chassi, RENAVAM..."
              (searchChange)="onBusca($event)"
              style="flex:1"
            />
          </div>
        </ui-card-body>
      </ui-card>

      <!-- Tabela -->
      <ui-card>
        <ui-card-header>
          <span>{{ totalElements() }} veículo{{ totalElements() !== 1 ? 's' : '' }} encontrado{{ totalElements() !== 1 ? 's' : '' }}</span>
        </ui-card-header>
        <ui-card-body>
          @if (loading()) {
            <div class="loading-wrap">
              <ui-loading size="md" />
            </div>
          } @else if (veiculos().length === 0) {
            <ui-empty-state
              icon="🚗"
              title="Nenhum veículo encontrado"
              description="Cadastre o primeiro veículo clicando em '+ Novo Veículo'."
            />
          } @else {
            <div class="table-wrap">
              <table class="veiculo-table">
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Modelo / Marca</th>
                    <th>Ano / KM</th>
                    <th>Chassi</th>
                    <th>RENAVAM</th>
                    <th>Flags</th>
                    <th>Responsável</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (v of veiculos(); track v.id) {
                    <tr [class.row-baixado]="v.baixado">
                      <td><span class="placa-badge">{{ v.placa }}</span></td>
                      <td>
                        <div class="modelo-info">
                          <strong>{{ v.modelo }}</strong>
                          <span>{{ v.marca }}</span>
                        </div>
                      </td>
                      <td>
                        <div class="ano-km">
                          <span>{{ v.anoFabricacao ?? '—' }}</span>
                          <span class="km-text">{{ formatKm(v.km) }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="mono-text">{{ v.chassi || '—' }}</span>
                      </td>
                      <td>
                        <span class="mono-text">{{ v.renavam || '—' }}</span>
                      </td>
                      <td>
                        <div class="flags">
                          @if (v.baixado) {
                            <ui-badge label="Baixado" color="danger" size="sm" />
                          }
                          @if (v.podeVenderMotor) {
                            <ui-badge label="Motor" color="warning" size="sm" />
                          }
                        </div>
                      </td>
                      <td>{{ v.responsavelNome || '—' }}</td>
                      <td>
                        <div class="acoes">
                          <ui-button *uiCan="['veiculos', 'editar']" variant="ghost" size="sm" (clicked)="abrirModal(v)">
                            ✏️
                          </ui-button>
                          <ui-button *uiCan="['veiculos', 'excluir']" variant="ghost" size="sm" (clicked)="confirmarExclusao(v)">
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
      size="lg"
      (closed)="fecharModal()"
    >
      <div class="form-grid">
        <ui-input
          label="Placa"
          [required]="true"
          placeholder="ABC-1234 ou ABC1D23"
          [ngModel]="formPlaca()"
          (ngModelChange)="setPlaca($event)"
          [maxLength]="7"
          [errorMessage]="erroPlaca()"
          (keydown)="onPlacaKeydown($event)"
        />
        <ui-select
          label="Marca"
          [required]="true"
          placeholder="Selecione a marca..."
          [options]="marcasOptions()"
          [ngModel]="formMarca()"
          (ngModelChange)="setMarca($event)"
          [errorMessage]="erroMarca()"
        />
        <ui-input
          label="Modelo"
          [required]="true"
          placeholder="ex: Civic, Corolla..."
          [ngModel]="formModelo()"
          (ngModelChange)="setModelo($event)"
          [errorMessage]="erroModelo()"
        />
        <ui-select
          label="Ano de Fabricação"
          [options]="anosOptions"
          (valueChange)="setAno($event)"
        />
        <ui-input
          label="Cor"
          placeholder="ex: Prata, Preto..."
          [ngModel]="formCor()"
          (ngModelChange)="setCor($event)"
        />
        <ui-input
          label="KM"
          type="number"
          placeholder="0"
          [ngModel]="formKm()"
          (ngModelChange)="setKm($event)"
        />
        <ui-input
          label="Chassi (VIN)"
          placeholder="17 caracteres alfanuméricos"
          [ngModel]="formChassi()"
          (ngModelChange)="setChassi($event)"
          [errorMessage]="erroChassi()"
          class="full-width"
        />
        <ui-input
          label="RENAVAM"
          placeholder="9 ou 11 dígitos"
          [ngModel]="formRenavam()"
          (ngModelChange)="setRenavam($event)"
          [errorMessage]="erroRenavam()"
        />
        <ui-input
          label="Número do Motor"
          placeholder="ex: EA111-ABC123"
          [ngModel]="formNumeroMotor()"
          (ngModelChange)="setNumeroMotor($event)"
        />
        <div class="toggles-row full-width">
          <ui-toggle
            label="Pode vender motor"
            [ngModel]="formPodeVenderMotor()"
            (ngModelChange)="setPodeVenderMotor($event)"
          />
          <ui-toggle
            label="Veículo baixado"
            [ngModel]="formBaixado()"
            (ngModelChange)="setBaixado($event)"
          />
        </div>
        <ui-input
          label="Descrição"
          placeholder="Observações sobre o veículo..."
          [ngModel]="formDescricao()"
          (ngModelChange)="setDescricao($event)"
          class="full-width"
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
          {{ editando() ? 'Salvar Alterações' : 'Cadastrar Veículo' }}
        </ui-button>
      </div>
    </ui-modal>

    <!-- Modal Confirmação Exclusão -->
    <ui-modal
      [open]="confirmarExclusaoAberto()"
      title="Excluir Veículo"
      size="sm"
      (closed)="fecharExclusao()"
    >
      <p>Tem certeza que deseja excluir o veículo <strong>{{ nomeVeiculoExclusao() }}</strong>?</p>
      <p style="color: var(--ui-color-text-secondary); font-size: 0.875rem;">Esta ação não pode ser desfeita.</p>
      <div modal-footer class="modal-footer">
        <ui-button variant="ghost" (clicked)="fecharExclusao()">Cancelar</ui-button>
        <ui-button variant="danger" [loading]="salvando()" (clicked)="excluir()">Excluir</ui-button>
      </div>
    </ui-modal>
  `,
  styles: [`
    .veiculos-page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    .filtros {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
    .table-wrap { overflow-x: auto; }
    .veiculo-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .veiculo-table th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      color: var(--ui-color-text-secondary);
      border-bottom: 1px solid var(--ui-color-border);
      white-space: nowrap;
    }
    .veiculo-table td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--ui-color-border);
      vertical-align: middle;
    }
    .veiculo-table tbody tr:hover {
      background: var(--ui-color-bg-subtle);
    }
    .veiculo-table tbody tr.row-baixado {
      opacity: 0.65;
    }
    .placa-badge {
      font-family: monospace;
      font-weight: 700;
      font-size: 0.9rem;
      padding: 0.2rem 0.5rem;
      background: var(--ui-color-bg-subtle);
      border-radius: var(--ui-radius-sm);
      border: 1px solid var(--ui-color-border);
      letter-spacing: 0.05em;
    }
    .modelo-info {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .modelo-info strong { color: var(--ui-color-text-primary); }
    .modelo-info span   { font-size: 0.8rem; color: var(--ui-color-text-secondary); }
    .ano-km {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      font-size: 0.875rem;
    }
    .km-text { color: var(--ui-color-text-secondary); font-size: 0.8rem; }
    .mono-text {
      font-family: monospace;
      font-size: 0.8rem;
      color: var(--ui-color-text-secondary);
    }
    .flags { display: flex; gap: 0.25rem; flex-wrap: wrap; }
    .acoes { display: flex; gap: 0.25rem; }
    .pagination-wrap {
      display: flex;
      justify-content: center;
      padding: 1rem;
      border-top: 1px solid var(--ui-color-border);
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      padding: 0.5rem 0;
    }
    .form-grid .full-width { grid-column: 1 / -1; }
    .toggles-row {
      display: flex;
      gap: 2rem;
      align-items: center;
      padding: 0.5rem 0;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
    @media (max-width: 600px) {
      .form-grid { grid-template-columns: 1fr; }
      .filtros { flex-direction: column; align-items: stretch; }
      .toggles-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
    }
  `],
})
export class VeiculosListComponent implements OnInit {
  private svc        = inject(VeiculosService);
  private marcasSvc  = inject(MarcasService);
  private toast      = inject(ToastService);
  private auth       = inject(AuthService);

  // ── Estado da listagem ──────────────────────────────────────────────────────
  veiculos      = signal<Veiculo[]>([]);
  loading       = signal(false);
  totalElements = signal(0);
  totalPages    = signal(1);
  page          = signal(0);
  busca         = signal('');

  // ── Estado do modal ─────────────────────────────────────────────────────────
  modalAberto = signal(false);
  salvando    = signal(false);
  editando    = signal<Veiculo | null>(null);
  form        = signal<Partial<Veiculo>>(FORM_VAZIO());
  erros       = signal<Record<string, string>>({});

  // ── Modal exclusão ───────────────────────────────────────────────────────────
  confirmarExclusaoAberto = signal(false);
  veiculoParaExcluir      = signal<Veiculo | null>(null);

  // ── Computed helpers para template ─────────────────────────────────────────
  tituloModal         = computed(() => this.editando() ? 'Editar Veículo' : 'Novo Veículo');
  nomeVeiculoExclusao = computed(() => {
    const v = this.veiculoParaExcluir();
    return v ? v.modelo + ' (' + v.placa + ')' : '';
  });

  // Getters de campo do form (para [ngModel])
  formPlaca          = computed(() => this.form().placa         ?? '');
  formModelo         = computed(() => this.form().modelo        ?? '');
  formMarca          = computed(() => this.form().marca         ?? '');
  formCor            = computed(() => this.form().cor           ?? '');
  formKm             = computed(() => this.form().km);
  formChassi         = computed(() => this.form().chassi        ?? '');
  formRenavam        = computed(() => this.form().renavam       ?? '');
  formNumeroMotor    = computed(() => this.form().numeroMotor   ?? '');
  formPodeVenderMotor = computed(() => this.form().podeVenderMotor ?? false);
  formBaixado        = computed(() => this.form().baixado       ?? false);
  formDescricao      = computed(() => this.form().descricao     ?? '');

  // Getters de erros individuais
  erroPlaca   = computed(() => this.erros()['placa']   ?? '');
  erroModelo  = computed(() => this.erros()['modelo']  ?? '');
  erroMarca   = computed(() => this.erros()['marca']   ?? '');
  erroChassi  = computed(() => this.erros()['chassi']  ?? '');
  erroRenavam = computed(() => this.erros()['renavam'] ?? '');

  // ── Opções de select ────────────────────────────────────────────────────────
  anosOptions   = ANOS;
  marcasOptions = signal<{ value: string; label: string }[]>([]);

  // ── Keydown da placa — filtra caracteres ANTES de serem inseridos ───────────
  // keydown bubbles do <input> nativo para o host <ui-input>
  onPlacaKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // Deixa teclas de controle passarem
    if (event.key.length !== 1) return;

    const char   = event.key.toUpperCase();
    const target = event.target as HTMLInputElement;
    const s      = target.selectionStart ?? target.value.length;
    const e2     = target.selectionEnd   ?? target.value.length;

    // Simula o valor após inserção do char na posição do cursor
    const next = (target.value.slice(0, s) + char + target.value.slice(e2)).toUpperCase();

    // Padrões válidos parciais para ambos os formatos
    const ok =
      /^[A-Z]{1,3}$/.test(next)             ||  // primeiras 1-3 letras
      /^[A-Z]{3}[0-9]{1,4}$/.test(next)     ||  // ABC + 1-4 dígitos (antiga)
      /^[A-Z]{3}[0-9][A-Z]$/.test(next)     ||  // ABC1D — Mercosul posição 4
      /^[A-Z]{3}[0-9][A-Z][0-9]{1,2}$/.test(next); // ABC1D23 — Mercosul final

    if (!ok) event.preventDefault();
  }

  // ── Setters de campo do form ────────────────────────────────────────────────
  setPlaca(v: string) { this.patchForm({ placa: v.toUpperCase() }); }
  setModelo(v: string)           { this.patchForm({ modelo: v }); }
  setMarca(v: string)            { this.patchForm({ marca: v }); }
  setAno(v: number)              { this.patchForm({ anoFabricacao: v }); }
  setCor(v: string)              { this.patchForm({ cor: v }); }
  setKm(v: number)               { this.patchForm({ km: v }); }
  setChassi(v: string)           { this.patchForm({ chassi: v.toUpperCase() }); }
  setRenavam(v: string)          { this.patchForm({ renavam: v.replace(/\D/g, '') }); }
  setNumeroMotor(v: string)      { this.patchForm({ numeroMotor: v }); }
  setPodeVenderMotor(v: boolean) { this.patchForm({ podeVenderMotor: v }); }
  setBaixado(v: boolean)         { this.patchForm({ baixado: v }); }
  setDescricao(v: string)        { this.patchForm({ descricao: v }); }

  private patchForm(patch: Partial<Veiculo>) {
    this.form.set({ ...this.form(), ...patch });
  }

  // ── Helpers de exibição ─────────────────────────────────────────────────────
  formatKm(km?: number) {
    return km != null ? km.toLocaleString('pt-BR') + ' km' : '—';
  }

  ngOnInit() {
    this.carregar();
    this.marcasSvc.getAllAtivas().subscribe(list => {
      this.marcasOptions.set(list.map(m => ({ value: m.nome, label: m.nome })));
    });
  }

  carregar() {
    this.loading.set(true);
    this.svc.getAll({ busca: this.busca(), page: this.page() }).subscribe({
      next: res => {
        this.veiculos.set(res.content);
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erro ao carregar veículos.');
        this.loading.set(false);
      },
    });
  }

  onBusca(v: string) { this.busca.set(v); this.page.set(0); this.carregar(); }
  onPage(p: number)  { this.page.set(p);                    this.carregar(); }

  // ── Modal CRUD ───────────────────────────────────────────────────────────────
  abrirModal(v?: Veiculo) {
    this.erros.set({});
    this.editando.set(v ?? null);
    this.form.set(v ? { ...v } : FORM_VAZIO());
    this.modalAberto.set(true);
  }

  fecharModal() {
    this.modalAberto.set(false);
    this.editando.set(null);
  }

  fecharExclusao() { this.confirmarExclusaoAberto.set(false); }

  validar(): boolean {
    const f = this.form();
    const e: Record<string, string> = {};

    const placa = (f.placa?.trim() ?? '').replace('-', '');
    if (!placa) {
      e['placa'] = 'Placa é obrigatória';
    } else if (!/^[A-Z]{3}\d{4}$/.test(placa) && !/^[A-Z]{3}\d[A-Z]\d{2}$/.test(placa)) {
      e['placa'] = 'Placa inválida — use ABC1234 ou ABC1D23 (Mercosul)';
    }

    if (!f.modelo?.trim()) e['modelo'] = 'Modelo é obrigatório';
    if (!f.marca?.trim())  e['marca']  = 'Marca é obrigatória';

    if (f.chassi && f.chassi.trim()) {
      if (!validarChassi(f.chassi.trim())) {
        e['chassi'] = 'Chassi inválido (VIN: 17 chars, sem I/O/Q)';
      }
    }

    if (f.renavam && f.renavam.trim()) {
      if (!validarRenavam(f.renavam.trim())) {
        e['renavam'] = 'RENAVAM inválido (dígito verificador incorreto)';
      }
    }

    this.erros.set(e);
    return Object.keys(e).length === 0;
  }

  salvar() {
    if (!this.validar()) return;
    this.salvando.set(true);
    const payload = { ...this.form() };
    const user = this.auth.currentUser();
    if (!payload.responsavelId && user) {
      payload.responsavelId   = user.id;
      payload.responsavelNome = user.nome;
    }

    const editando = this.editando();
    const op = editando
      ? this.svc.update(editando.id!, payload)
      : this.svc.create(payload);

    op.subscribe({
      next: () => {
        this.toast.success(editando ? 'Veículo atualizado!' : 'Veículo cadastrado!');
        this.salvando.set(false);
        this.fecharModal();
        this.carregar();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Erro ao salvar veículo.');
        this.salvando.set(false);
      },
    });
  }

  confirmarExclusao(v: Veiculo) {
    this.veiculoParaExcluir.set(v);
    this.confirmarExclusaoAberto.set(true);
  }

  excluir() {
    const v = this.veiculoParaExcluir();
    if (!v?.id) return;
    this.salvando.set(true);
    this.svc.delete(v.id).subscribe({
      next: () => {
        this.toast.success('Veículo excluído com sucesso!');
        this.salvando.set(false);
        this.confirmarExclusaoAberto.set(false);
        this.carregar();
      },
      error: () => {
        this.toast.error('Erro ao excluir veículo.');
        this.salvando.set(false);
      },
    });
  }
}
