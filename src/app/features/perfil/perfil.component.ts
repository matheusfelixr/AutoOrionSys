import { Component, inject, computed, signal, effect, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CardComponent,
  CardHeaderComponent,
  CardBodyComponent,
  AvatarComponent,
  BadgeComponent,
  ButtonComponent,
  InputComponent,
  AlertComponent,
  TabsComponent,
  TabComponent,
  PhotoCaptureComponent,
  ToastService,
  CapturedPhoto,
} from 'ui-lib';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FotosService } from '../../core/services/fotos.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    FormsModule,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    InputComponent,
    AlertComponent,
    TabsComponent,
    TabComponent,
    PhotoCaptureComponent,
  ],
  template: `
    <div class="page">
      <h2>Meu Perfil</h2>

      @if (user(); as u) {
        <ui-tabs>
          <!-- Tab 1: Dados Pessoais -->
          <ui-tab label="Dados Pessoais">
            <div class="tab-content">
              <!-- Profile Header -->
              <div class="perfil-header">
                <ui-avatar [name]="u.nome" [src]="fotoPerfil()?.previewUrl ?? u.avatarUrl" size="xl" />
                <div class="perfil-info">
                  <h3>{{ u.nome }}</h3>
                  <span class="cargo-text">{{ u.cargo }}</span>
                  <div class="perfil-badges">
                    <ui-badge variant="primary">{{ u.perfil }}</ui-badge>
                    <ui-badge [variant]="u.status === 'ativo' ? 'success' : 'neutral'">{{ u.status }}</ui-badge>
                  </div>
                </div>
              </div>

              <!-- Edit Form -->
              <div class="form-grid">
                <ui-input label="Nome completo" [required]="true" [(ngModel)]="editForm.nome" placeholder="Nome completo" [errorMessage]="perfilErrors['nome'] || ''" />
                <ui-input label="E-mail" [required]="true" [(ngModel)]="editForm.email" placeholder="email@exemplo.com" [errorMessage]="perfilErrors['email'] || ''" />
                <ui-input label="Cargo" [required]="true" [(ngModel)]="editForm.cargo" placeholder="Cargo na empresa" [errorMessage]="perfilErrors['cargo'] || ''" />
                <ui-input label="Telefone" [(ngModel)]="editForm.telefone" placeholder="(00) 00000-0000" />
              </div>

              <div class="form-actions">
                <ui-button variant="secondary" (clicked)="sair()">Sair do Sistema</ui-button>
                <ui-button variant="primary" [loading]="saving()" (clicked)="salvarPerfil()">Salvar Dados</ui-button>
              </div>
            </div>
          </ui-tab>

          <!-- Tab 2: Foto do Perfil -->
          <ui-tab label="Foto do Perfil">
            <div class="tab-content">
              <div class="photo-section">
                <p class="photo-hint">Use a câmera ou faça upload da sua foto de perfil</p>
                <ui-photo-capture
                  titulo="Foto do Perfil"
                  [maxPhotos]="1"
                  [etapas]="[]"
                  (photosChange)="onFotoChange($event)"
                />
                @if (fotoPerfil()) {
                  <ui-alert variant="success" title="Foto capturada!">
                    Sua foto foi registrada.
                  </ui-alert>
                  <div style="margin-top:1rem;display:flex;align-items:center;gap:1rem;">
                    <ui-avatar [name]="u.nome" [src]="fotoPerfil()!.previewUrl" size="xl" />
                    <span class="photo-hint">Prévia do avatar — clique em Salvar Dados para confirmar</span>
                  </div>
                }
              </div>
            </div>
          </ui-tab>

          <!-- Tab 3: Segurança -->
          <ui-tab label="Segurança">
            <div class="tab-content">
              <ui-alert variant="info" title="Ambiente de demonstração">
                Alterações de senha são simuladas nesta versão.
              </ui-alert>
              <div class="security-form">
                <ui-input label="Senha atual" type="password" [(ngModel)]="senhaForm.atual" placeholder="••••••••" />
                <ui-input label="Nova senha" type="password" [(ngModel)]="senhaForm.nova" placeholder="••••••••" />
                <ui-input label="Confirmar nova senha" type="password" [(ngModel)]="senhaForm.confirmar" placeholder="••••••••" />
                <div class="form-actions">
                  <ui-button variant="primary" [loading]="changingPassword()" (clicked)="alterarSenha()">
                    Alterar Senha
                  </ui-button>
                </div>
              </div>
            </div>
          </ui-tab>
        </ui-tabs>
      }
    </div>
  `,
  styles: [`
    .page { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;  }
    .page h2 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .tab-content { padding: 1.5rem 0; display: flex; flex-direction: column; gap: 1.5rem; }
    .perfil-header { display: flex; flex-direction: row; gap: 1.5rem; align-items: center; }
    .perfil-info { display: flex; flex-direction: column; gap: 0.5rem; }
    .perfil-info h3 { margin: 0; font-size: 1.25rem; font-weight: 700; }
    .cargo-text { font-size: 0.875rem; color: var(--ui-color-text-secondary, #666); }
    .perfil-badges { display: flex; flex-direction: row; gap: 0.5rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-actions { display: flex; flex-direction: row; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; }
    .photo-section { display: flex; flex-direction: column; gap: 1rem; }
    .photo-hint { font-size: var(--ui-font-size-sm, 0.875rem); color: var(--ui-color-text-secondary, #666); margin: 0; }
    .security-form { display: flex; flex-direction: column; gap: 1rem; max-width: 400px; }

    @media (max-width: 600px) {
      .page { padding: 1rem; }
      .form-grid { grid-template-columns: 1fr; }
      .perfil-header { flex-direction: column; align-items: flex-start; }
      .form-actions { flex-direction: column-reverse; }
      .form-actions > * { width: 100%; }
    }
  `],
})
export class PerfilComponent implements OnInit {
  private authService     = inject(AuthService);
  private fotosService    = inject(FotosService);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);
  private toast = inject(ToastService);

  user = computed(() => this.authService.currentUser());

  saving = signal(false);
  fotoPerfil = signal<CapturedPhoto | null>(null);
  changingPassword = signal(false);
  perfilErrors: Record<string, string> = {};

  editForm = {
    nome: '',
    email: '',
    cargo: '',
    telefone: '',
  };

  senhaForm = {
    atual: '',
    nova: '',
    confirmar: '',
  };

  ngOnInit(): void {
    const u = this.authService.currentUser();
    if (u) {
      this.editForm.nome = u.nome;
      this.editForm.email = u.email;
      this.editForm.cargo = u.cargo;
      this.editForm.telefone = u.telefone ?? '';
    }
  }

  private validatePerfilForm(): boolean {
    this.perfilErrors = {};
    if (!this.editForm.nome?.trim())  this.perfilErrors['nome']  = 'Nome é obrigatório';
    if (!this.editForm.email?.trim()) this.perfilErrors['email'] = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.editForm.email))
      this.perfilErrors['email'] = 'E-mail inválido';
    if (!this.editForm.cargo?.trim()) this.perfilErrors['cargo'] = 'Cargo é obrigatório';
    return Object.keys(this.perfilErrors).length === 0;
  }

  salvarPerfil(): void {
    if (!this.validatePerfilForm()) return;
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.saving.set(true);

    const payload: Record<string, unknown> = {
      nome:     this.editForm.nome,
      email:    this.editForm.email,
      cargo:    this.editForm.cargo,
      telefone: this.editForm.telefone,
    };

    // Inclui foto se houver uma capturada
    if (this.fotoPerfil()) {
      payload['avatarUrl'] = this.fotoPerfil()!.previewUrl;
    }

    if (environment.useMockData) {
      // Modo mock: atualiza apenas localmente
      setTimeout(() => {
        this.saving.set(false);
        if (this.fotoPerfil()) {
          this.authService.updateCurrentUserAvatar(this.fotoPerfil()!.previewUrl);
        }
        this.toast.success('Perfil atualizado com sucesso!');
      }, 400);
      return;
    }

    // Usa /api/auth/me — qualquer usuário pode atualizar o próprio perfil sem precisar de ADMIN
    this.authService.updateMe(payload).subscribe({
      next: () => {
        this.saving.set(false);
        if (payload['avatarUrl']) {
          this.authService.updateCurrentUserAvatar(payload['avatarUrl'] as string);
        }
        this.toast.success('Perfil atualizado com sucesso!');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Erro ao salvar perfil. Tente novamente.');
      },
    });
  }

  onFotoChange(photos: CapturedPhoto[]): void {
    const photo = photos.length > 0 ? photos[0] : null;
    if (!photo) { this.fotoPerfil.set(null); return; }

    // Converte blob URL → data URL para evitar ERR_FILE_NOT_FOUND
    const reader = new FileReader();
    reader.onload = () => {
      const photoComDataUrl = { ...photo, previewUrl: reader.result as string };
      this.fotoPerfil.set(photoComDataUrl);

      // Atualiza topbar imediatamente com a prévia
      this.authService.updateCurrentUserAvatar(reader.result as string);

      const userId = this.authService.currentUser()?.id;
      if (userId && !environment.useMockData) {
        this.fotosService.uploadFoto(photo, 'usuario', userId).subscribe({
          next: () => {}, // foto salva — toast aparece no salvarPerfil
          error: () => {},
        });
      }
    };
    reader.readAsDataURL(photo.file);
  }

  alterarSenha(): void {
    this.changingPassword.set(true);
    setTimeout(() => {
      this.changingPassword.set(false);
      this.senhaForm = { atual: '', nova: '', confirmar: '' };
      this.toast.success('Senha alterada! (demonstração)');
    }, 800);
  }

  sair(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
