import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CardComponent, CardHeaderComponent, CardBodyComponent,
  BadgeComponent, ButtonComponent, InputComponent, SelectComponent,
  ModalComponent, ToastService, LoadingComponent, ToggleComponent,
  PageHeaderComponent, SearchBarComponent, EmptyStateComponent,
  PaginationComponent, AuditInfoComponent, CanDirective,
  TabsComponent, TabComponent,
} from 'ui-lib';
import { VeiculosService } from '../../core/services/veiculos.service';
import { MarcasService } from '../../core/services/marcas.service';
import { CoresService } from '../../core/services/cores.service';
import { FotosService, FotoBackend } from '../../core/services/fotos.service';
import { Veiculo } from '../../core/models/veiculo.model';

const ANO_ATUAL = new Date().getFullYear();
const ANOS_FAB   = Array.from({ length: 40 }, (_, i) => {
  const ano = ANO_ATUAL - i;
  return { value: ano, label: String(ano) };
});
const ANOS_MOD   = Array.from({ length: 42 }, (_, i) => {
  const ano = ANO_ATUAL + 1 - i;   // permite ano modelo até atual+1
  return { value: ano, label: String(ano) };
});

const FORM_VAZIO = (): Partial<Veiculo> => ({
  placa: '', modelo: '', marca: '',
  anoFabricacao: ANO_ATUAL,
  anoModelo:     ANO_ATUAL + 1,
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
    TabsComponent, TabComponent,
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
                          <span>{{ v.anoFabricacao ?? '—' }}/{{ v.anoModelo ?? '—' }}</span>
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
      size="xl"
      (closed)="fecharModal()"
    >
      <ui-tabs activeTab="dados" (tabChange)="abaAtiva.set($event)">

        <!-- ── ABA DADOS ─────────────────────────────────────────────── -->
        <ui-tab tabId="dados" label="Dados" icon="📋">
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
              [required]="true"
              [options]="anosFabOptions"
              [ngModel]="formAnoFabricacao()"
              (ngModelChange)="setAnoFabricacao($event)"
              [errorMessage]="erroAnoFabricacao()"
            />
            <ui-select
              label="Ano Modelo"
              [required]="true"
              [options]="anosModOptions"
              [ngModel]="formAnoModelo()"
              (ngModelChange)="setAnoModelo($event)"
              [errorMessage]="erroAnoModelo()"
            />
            <ui-select
              label="Cor"
              [required]="true"
              placeholder="Selecione a cor..."
              [options]="coresOptions()"
              [ngModel]="formCor()"
              (ngModelChange)="setCor($event)"
              [errorMessage]="erroCor()"
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
        </ui-tab>

        <!-- ── ABA FOTOS ─────────────────────────────────────────────── -->
        <ui-tab tabId="fotos" label="Fotos" icon="📷">
          @if (!editando()) {
            <div class="midia-aviso">
              <ui-empty-state icon="💾" title="Salve o veículo primeiro"
                description="Adicione fotos depois de cadastrar o veículo." />
            </div>
          } @else {
            @if (carregandoMidias()) {
              <div class="loading-wrap"><ui-loading size="sm" /></div>
            } @else if (fotos().length === 0) {
              <ui-empty-state icon="📷" title="Sem fotos" description="Adicione a primeira foto abaixo." />
            } @else {
              <div class="fotos-grid">
                @for (f of fotos(); track f.id) {
                  <div class="foto-card">
                    <img [src]="f.dadosBase64" class="foto-thumb" [alt]="f.etapa ?? 'Foto'" />
                    @if (f.etapa) { <span class="foto-etapa">{{ f.etapa }}</span> }
                    <button class="foto-del" type="button" (click)="excluirMidia(f.id)" title="Excluir">🗑️</button>
                  </div>
                }
              </div>
            }
            <div class="upload-section">
              <div class="upload-row">
                <ui-select
                  label="Ângulo"
                  [options]="etapasOpts"
                  [ngModel]="etapaFotoSel()"
                  (ngModelChange)="etapaFotoSel.set($event)"
                  style="width:160px"
                />
                <input #fotoInput type="file" style="display:none" multiple accept="image/*"
                  (change)="onUploadFotos($event)" />
                <ui-button variant="secondary" [loading]="enviandoMidia()" (clicked)="fotoInput.click()">
                  📤 Adicionar Fotos
                </ui-button>
              </div>
            </div>
          }
        </ui-tab>

        <!-- ── ABA DOCUMENTOS ────────────────────────────────────────── -->
        <ui-tab tabId="documentos" label="Documentos" icon="📎">
          @if (!editando()) {
            <div class="midia-aviso">
              <ui-empty-state icon="💾" title="Salve o veículo primeiro"
                description="Adicione documentos depois de cadastrar o veículo." />
            </div>
          } @else {
            @if (carregandoMidias()) {
              <div class="loading-wrap"><ui-loading size="sm" /></div>
            } @else if (documentos().length === 0) {
              <ui-empty-state icon="📎" title="Sem documentos" description="Anexe o primeiro documento abaixo." />
            } @else {
              <div class="doc-list">
                @for (d of documentos(); track d.id) {
                  <div class="doc-item">
                    <span class="doc-icon">{{ mimeIcon(d.mimeType) }}</span>
                    <div class="doc-info">
                      <span class="doc-nome">{{ d.nomeArquivo }}</span>
                      <span class="doc-meta">{{ d.etapa ?? 'Documento' }} · {{ formatBytes(d.tamanhoBytes) }}</span>
                    </div>
                    <div class="doc-actions">
                      <a [href]="d.dadosBase64" [download]="d.nomeArquivo" class="doc-dl-btn" title="Download">⬇️</a>
                      <button class="foto-del" type="button" (click)="excluirMidia(d.id)" title="Excluir">🗑️</button>
                    </div>
                  </div>
                }
              </div>
            }
            <div class="upload-section">
              <div class="upload-row">
                <ui-select
                  label="Tipo"
                  [options]="tiposDocOpts"
                  [ngModel]="tipoDocSel()"
                  (ngModelChange)="tipoDocSel.set($event)"
                  style="width:180px"
                />
                <input #docInput type="file" style="display:none"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  (change)="onUploadDocumento($event)" />
                <ui-button variant="secondary" [loading]="enviandoMidia()" (clicked)="docInput.click()">
                  📎 Anexar Documento
                </ui-button>
              </div>
            </div>
          }
        </ui-tab>

        <!-- ── ABA REDE SOCIAL ───────────────────────────────────────── -->
        <ui-tab tabId="rede-social" label="Rede Social" icon="📱">
          @if (!editando()) {
            <div class="midia-aviso">
              <ui-empty-state icon="💾" title="Salve o veículo primeiro"
                description="Adicione a foto de destaque depois de cadastrar o veículo." />
            </div>
          } @else {
            <div class="rede-social-section">
              @if (redeSocial()) {
                <div class="rs-preview">
                  <img [src]="redeSocial()!.dadosBase64" class="rs-img" alt="Foto rede social" />
                  <div class="rs-caption">
                    <p class="rs-titulo">
                      {{ editando()!.anoFabricacao }}/{{ editando()!.anoModelo }}
                      {{ editando()!.marca }} {{ editando()!.modelo }}
                    </p>
                    <p class="rs-sub">{{ editando()!.cor }} · {{ formatKm(editando()!.km) }}</p>
                  </div>
                  <button class="rs-del-btn" type="button"
                    (click)="excluirMidia(redeSocial()!.id)">
                    🗑️ Remover foto
                  </button>
                </div>
              } @else {
                <ui-empty-state icon="📱" title="Sem foto de destaque"
                  description="Escolha uma foto para compartilhar nas redes sociais." />
              }
              <div class="upload-section">
                <input #rsInput type="file" style="display:none" accept="image/*"
                  (change)="onUploadRedeSocial($event)" />
                <ui-button variant="secondary" [loading]="enviandoMidia()" (clicked)="rsInput.click()">
                  📱 {{ redeSocial() ? 'Trocar Foto' : 'Adicionar Foto de Destaque' }}
                </ui-button>
              </div>
            </div>
          }
        </ui-tab>

      </ui-tabs>

      <div modal-footer class="modal-footer">
        @if (abaAtiva() === 'dados') {
          <ui-button variant="ghost" (clicked)="fecharModal()">Cancelar</ui-button>
          <ui-button variant="primary" [loading]="salvando()" (clicked)="salvar()">
            {{ editando() ? 'Salvar Alterações' : 'Cadastrar Veículo' }}
          </ui-button>
        } @else {
          <ui-button variant="ghost" (clicked)="fecharModal()">Fechar</ui-button>
        }
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
    /* ── Media tabs ────────────────────────────────────── */
    .midia-aviso { padding: 1rem 0; }
    .fotos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 0.75rem;
      max-height: 320px;
      overflow-y: auto;
      margin-bottom: 1rem;
    }
    .foto-card {
      position: relative;
      border-radius: var(--ui-radius-md);
      overflow: hidden;
      border: 1px solid var(--ui-color-border);
      aspect-ratio: 4/3;
      background: var(--ui-color-bg-subtle);
    }
    .foto-thumb {
      width: 100%; height: 100%;
      object-fit: cover; display: block;
    }
    .foto-etapa {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: rgba(0,0,0,0.6); color: #fff;
      font-size: 0.65rem; padding: 0.2rem 0.4rem;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .foto-del {
      position: absolute; top: 0.25rem; right: 0.25rem;
      background: rgba(0,0,0,0.55); border: none; border-radius: 4px;
      cursor: pointer; padding: 0.1rem 0.3rem; font-size: 0.75rem;
      opacity: 0; transition: opacity 0.15s;
    }
    .foto-card:hover .foto-del { opacity: 1; }
    .upload-section {
      padding-top: 0.75rem;
      border-top: 1px solid var(--ui-color-border);
      margin-top: 0.75rem;
    }
    .upload-row {
      display: flex; align-items: flex-end; gap: 1rem; flex-wrap: wrap;
    }
    .doc-list {
      display: flex; flex-direction: column; gap: 0.5rem;
      max-height: 280px; overflow-y: auto; margin-bottom: 1rem;
    }
    .doc-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.65rem 0.75rem;
      border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-md);
      background: var(--ui-color-bg-subtle);
    }
    .doc-icon { font-size: 1.4rem; flex-shrink: 0; }
    .doc-info {
      flex: 1; display: flex; flex-direction: column; gap: 0.1rem; overflow: hidden;
    }
    .doc-nome {
      font-size: 0.875rem; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .doc-meta { font-size: 0.75rem; color: var(--ui-color-text-secondary); }
    .doc-actions { display: flex; align-items: center; gap: 0.25rem; }
    .doc-dl-btn { text-decoration: none; font-size: 1rem; cursor: pointer; }
    .rede-social-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .rs-preview {
      display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    }
    .rs-img {
      width: 100%; max-height: 220px; object-fit: cover;
      border-radius: var(--ui-radius-lg);
      border: 1px solid var(--ui-color-border);
    }
    .rs-caption { text-align: center; }
    .rs-titulo { font-weight: 600; font-size: 0.95rem; margin: 0; }
    .rs-sub { font-size: 0.8rem; color: var(--ui-color-text-secondary); margin: 0.25rem 0 0; }
    .rs-del-btn {
      background: none; border: none; cursor: pointer;
      color: var(--ui-color-danger); font-size: 0.8rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VeiculosListComponent implements OnInit {
  private svc         = inject(VeiculosService);
  private marcasSvc   = inject(MarcasService);
  private coresSvc    = inject(CoresService);
  private fotosService = inject(FotosService);
  private toast       = inject(ToastService);

  // ── Lista ───────────────────────────────────────────────────────────────────
  veiculos      = signal<Veiculo[]>([]);
  loading       = signal(false);
  totalElements = signal(0);
  totalPages    = signal(1);
  page          = signal(0);
  busca         = signal('');

  // ── Modal CRUD ──────────────────────────────────────────────────────────────
  modalAberto = signal(false);
  salvando    = signal(false);
  editando    = signal<Veiculo | null>(null);
  form        = signal<Partial<Veiculo>>(FORM_VAZIO());
  erros       = signal<Record<string, string>>({});

  // ── Aba ativa no modal ──────────────────────────────────────────────────────
  abaAtiva = signal('dados');

  // ── Mídias ──────────────────────────────────────────────────────────────────
  fotos            = signal<FotoBackend[]>([]);
  documentos       = signal<FotoBackend[]>([]);
  redeSocial       = signal<FotoBackend | null>(null);
  carregandoMidias = signal(false);
  enviandoMidia    = signal(false);
  etapaFotoSel     = signal('Frente');
  tipoDocSel       = signal('CRLV');

  readonly etapasOpts = [
    { value: 'Frente',        label: 'Frente'        },
    { value: 'Traseira',      label: 'Traseira'      },
    { value: 'Lateral Esq.',  label: 'Lateral Esq.'  },
    { value: 'Lateral Dir.',  label: 'Lateral Dir.'  },
    { value: 'Interior',      label: 'Interior'      },
    { value: 'Motor',         label: 'Motor'         },
    { value: 'Painel',        label: 'Painel'        },
    { value: 'Outro',         label: 'Outro'         },
  ];

  readonly tiposDocOpts = [
    { value: 'CRLV',          label: 'CRLV'          },
    { value: 'Nota Fiscal',   label: 'Nota Fiscal'   },
    { value: 'Laudo',         label: 'Laudo'         },
    { value: 'Contrato',      label: 'Contrato'      },
    { value: 'Outros',        label: 'Outros'        },
  ];

  // ── Modal Exclusão ──────────────────────────────────────────────────────────
  confirmarExclusaoAberto = signal(false);
  veiculoParaExcluir      = signal<Veiculo | null>(null);

  // ── Computeds ───────────────────────────────────────────────────────────────
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
  formAnoFabricacao  = computed(() => this.form().anoFabricacao ?? ANO_ATUAL);
  formAnoModelo      = computed(() => this.form().anoModelo     ?? ANO_ATUAL + 1);
  formChassi         = computed(() => this.form().chassi        ?? '');
  formRenavam        = computed(() => this.form().renavam       ?? '');
  formNumeroMotor    = computed(() => this.form().numeroMotor   ?? '');
  formPodeVenderMotor = computed(() => this.form().podeVenderMotor ?? false);
  formBaixado        = computed(() => this.form().baixado       ?? false);
  formDescricao      = computed(() => this.form().descricao     ?? '');

  // Getters de erros individuais
  erroPlaca          = computed(() => this.erros()['placa']          ?? '');
  erroModelo         = computed(() => this.erros()['modelo']         ?? '');
  erroMarca          = computed(() => this.erros()['marca']          ?? '');
  erroCor            = computed(() => this.erros()['cor']            ?? '');
  erroChassi         = computed(() => this.erros()['chassi']         ?? '');
  erroRenavam        = computed(() => this.erros()['renavam']        ?? '');
  erroAnoFabricacao  = computed(() => this.erros()['anoFabricacao']  ?? '');
  erroAnoModelo      = computed(() => this.erros()['anoModelo']      ?? '');

  // ── Opções de select ────────────────────────────────────────────────────────
  anosFabOptions = ANOS_FAB;
  anosModOptions = ANOS_MOD;
  marcasOptions  = signal<{ value: string; label: string }[]>([]);
  coresOptions   = signal<{ value: string; label: string }[]>([]);

  // ── Keydown da placa — filtra caracteres ANTES de serem inseridos ───────────
  onPlacaKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length !== 1) return;

    const char   = event.key.toUpperCase();
    const target = event.target as HTMLInputElement;
    const s      = target.selectionStart ?? target.value.length;
    const e2     = target.selectionEnd   ?? target.value.length;

    const next = (target.value.slice(0, s) + char + target.value.slice(e2)).toUpperCase();

    const ok =
      /^[A-Z]{1,3}$/.test(next)             ||
      /^[A-Z]{3}[0-9]{1,4}$/.test(next)     ||
      /^[A-Z]{3}[0-9][A-Z]$/.test(next)     ||
      /^[A-Z]{3}[0-9][A-Z][0-9]{1,2}$/.test(next);

    if (!ok) event.preventDefault();
  }

  // ── Setters de campo do form ────────────────────────────────────────────────
  setPlaca(v: string)            { this.patchForm({ placa: v.toUpperCase() }); }
  setModelo(v: string)           { this.patchForm({ modelo: v }); }
  setMarca(v: string)            { this.patchForm({ marca: v }); }
  setCor(v: string)              { this.patchForm({ cor: v }); }
  setAnoFabricacao(v: number)    { this.patchForm({ anoFabricacao: v }); }
  setAnoModelo(v: number)        { this.patchForm({ anoModelo: v }); }
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

  mimeIcon(mime: string): string {
    if (mime.startsWith('image/'))       return '🖼️';
    if (mime === 'application/pdf')      return '📄';
    if (mime.includes('word'))           return '📝';
    if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
    return '📎';
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024)       return bytes + ' B';
    if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  ngOnInit() {
    this.carregar();
    this.marcasSvc.getAllAtivas().subscribe(list => {
      this.marcasOptions.set(list.map(m => ({ value: m.nome, label: m.nome })));
    });
    this.coresSvc.getAllAtivas().subscribe(list => {
      this.coresOptions.set(list.map(c => ({ value: c.nome, label: c.nome })));
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
    this.abaAtiva.set('dados');
    this.fotos.set([]);
    this.documentos.set([]);
    this.redeSocial.set(null);
    this.modalAberto.set(true);
    if (v?.id) {
      this.carregarMidias(v.id);
    }
  }

  fecharModal() {
    this.modalAberto.set(false);
    this.editando.set(null);
    this.fotos.set([]);
    this.documentos.set([]);
    this.redeSocial.set(null);
  }

  fecharExclusao() { this.confirmarExclusaoAberto.set(false); }

  // ── Mídias ───────────────────────────────────────────────────────────────────
  carregarMidias(veiculoId: string) {
    this.carregandoMidias.set(true);
    this.fotosService.list('veiculo', veiculoId).subscribe({
      next: res => {
        const todas = res.data ?? [];
        this.fotos.set(todas.filter(f => f.tipo === 'FOTO'));
        this.documentos.set(todas.filter(f => f.tipo === 'DOCUMENTO'));
        const rs = todas.find(f => f.tipo === 'FOTO_REDE_SOCIAL');
        this.redeSocial.set(rs ?? null);
        this.carregandoMidias.set(false);
      },
      error: () => this.carregandoMidias.set(false),
    });
  }

  onUploadFotos(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    const id = this.editando()?.id;
    if (!id) return;
    this.enviandoMidia.set(true);
    let pendentes = files.length;
    files.forEach(file => {
      this.fotosService.uploadArquivo(file, 'veiculo', id, 'FOTO', this.etapaFotoSel()).subscribe({
        next: res => {
          this.fotos.update(arr => [...arr, res.data]);
          pendentes--;
          if (pendentes === 0) this.enviandoMidia.set(false);
        },
        error: () => {
          pendentes--;
          this.toast.error('Erro ao enviar foto.');
          if (pendentes === 0) this.enviandoMidia.set(false);
        },
      });
    });
    input.value = '';
  }

  onUploadDocumento(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    const id = this.editando()?.id;
    if (!id) return;
    this.enviandoMidia.set(true);
    this.fotosService.uploadDocumento(file, 'veiculo', id, this.tipoDocSel()).subscribe({
      next: res => {
        this.documentos.update(arr => [...arr, res.data]);
        this.enviandoMidia.set(false);
      },
      error: () => {
        this.toast.error('Erro ao enviar documento.');
        this.enviandoMidia.set(false);
      },
    });
    input.value = '';
  }

  onUploadRedeSocial(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    const id = this.editando()?.id;
    if (!id) return;
    this.enviandoMidia.set(true);
    this.fotosService.uploadArquivo(file, 'veiculo', id, 'FOTO_REDE_SOCIAL').subscribe({
      next: res => {
        this.redeSocial.set(res.data);
        this.enviandoMidia.set(false);
      },
      error: () => {
        this.toast.error('Erro ao enviar foto de rede social.');
        this.enviandoMidia.set(false);
      },
    });
    input.value = '';
  }

  excluirMidia(id: string) {
    this.fotosService.delete(id).subscribe(() => {
      this.fotos.update(arr => arr.filter(f => f.id !== id));
      this.documentos.update(arr => arr.filter(d => d.id !== id));
      if (this.redeSocial()?.id === id) this.redeSocial.set(null);
    });
  }

  validar(): boolean {
    const f = this.form();
    const e: Record<string, string> = {};

    const placa = (f.placa?.trim() ?? '').replace('-', '');
    if (!placa) {
      e['placa'] = 'Placa é obrigatória';
    } else if (!/^[A-Z]{3}\d{4}$/.test(placa) && !/^[A-Z]{3}\d[A-Z]\d{2}$/.test(placa)) {
      e['placa'] = 'Placa inválida — use ABC1234 ou ABC1D23 (Mercosul)';
    }

    if (!f.modelo?.trim())         e['modelo']  = 'Modelo é obrigatório';
    if (!f.marca?.trim())          e['marca']   = 'Marca é obrigatória';
    if (!f.cor?.trim())            e['cor']     = 'Cor é obrigatória';
    if (!f.anoFabricacao)          e['anoFabricacao'] = 'Ano de fabricação é obrigatório';
    if (!f.anoModelo)              e['anoModelo']     = 'Ano modelo é obrigatório';

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

    const editando = this.editando();
    const op = editando
      ? this.svc.update(editando.id!, payload)
      : this.svc.create(payload);

    op.subscribe({
      next: (saved: any) => {
        this.toast.success(editando ? 'Veículo atualizado!' : 'Veículo cadastrado!');
        this.salvando.set(false);
        if (!editando && saved?.data?.id) {
          // Abre o mesmo veículo para edição (habilita abas de mídia)
          this.editando.set(saved.data);
        } else {
          this.fecharModal();
          this.carregar();
        }
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
