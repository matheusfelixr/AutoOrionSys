import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent, InputComponent, CheckboxComponent } from 'ui-lib';
import { AuthService } from '../../core/services/auth.service';

const DEMO_ACCOUNTS = [
  { email: 'ana.souza@flexsys.com.br', perfil: 'admin' },
  { email: 'carlos.mendes@flexsys.com.br', perfil: 'gerente' },
  { email: 'ricardo.alves@flexsys.com.br', perfil: 'tecnico' },
  { email: 'camila.santos@flexsys.com.br', perfil: 'visualizador' },
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, ButtonComponent, InputComponent, CheckboxComponent],
  template: `
    <div class="login-page">
      <!-- Left Branding Panel -->
      <div class="login-brand">
        <div class="brand-content">
          <div class="brand-logo">
            <span class="brand-icon">🚗</span>
            <span class="brand-title">FlexSys</span>
          </div>
          <p class="brand-tagline">Gestão de Veículos Inteligente</p>
          <ul class="brand-features">
            <li>✓ Controle de frota em tempo real</li>
            <li>✓ Registro fotográfico de veículos</li>
            <li>✓ Gestão de clientes e recursos</li>
            <li>✓ Relatórios e dashboards avançados</li>
          </ul>
        </div>
      </div>

      <!-- Right Login Panel -->
      <div class="login-panel">
        <div class="login-card">
          <div class="login-header">
            <h1 class="login-title">Bem-vindo de volta</h1>
            <p class="login-subtitle">Entre com suas credenciais para acessar o sistema de gestão de veículos.</p>
          </div>

          <div class="login-form">
            <ui-input
              label="E-mail"
              type="email"
              placeholder="seu@flexsys.com.br"
              [required]="true"
              [(ngModel)]="email"
              [errorMessage]="erroEmail()"
            />
            <ui-input
              label="Senha"
              type="password"
              [showPasswordToggle]="true"
              placeholder="••••••••"
              [required]="true"
              [(ngModel)]="senha"
              [errorMessage]="erroSenha()"
            />
            <div class="form-row">
              <ui-checkbox label="Lembrar-me" [(ngModel)]="lembrar" />
            </div>

            @if (erro()) {
              <div class="error-message">
                <span class="error-icon">⚠️</span>
                {{ erro() }}
              </div>
            }

            <ui-button
              variant="primary"
              [fullWidth]="true"
              [loading]="loading()"
              [disabled]="loading()"
              (clicked)="entrar()"
            >
              {{ loading() ? 'Entrando...' : 'Entrar' }}
            </ui-button>
          </div>

          <!-- Demo accounts section -->
          <div class="demo-section">
            <button class="demo-toggle" (click)="showDemoAccounts.set(!showDemoAccounts())">
              <span>Contas de demonstração</span>
              <span class="demo-chevron" [class.open]="showDemoAccounts()">▼</span>
            </button>
            @if (showDemoAccounts()) {
              <div class="demo-accounts">
                <p class="demo-hint">Qualquer senha funciona para estas contas:</p>
                <table class="demo-table">
                  <thead>
                    <tr>
                      <th>E-mail</th>
                      <th>Perfil</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (account of demoAccounts; track account.email) {
                      <tr (click)="fillDemo(account.email)" class="demo-row">
                        <td>{{ account.email }}</td>
                        <td><span class="perfil-badge perfil-{{ account.perfil }}">{{ account.perfil }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex;
      min-height: 100vh;
      background: var(--ui-color-bg-subtle);
    }

    /* Left branding panel */
    .login-brand {
      flex: 1;
      background: var(--ui-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--ui-space-8);
      color: white;
    }

    @media (max-width: 768px) {
      .login-brand {
        display: none;
      }
    }

    .brand-content {
      max-width: 400px;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: var(--ui-space-3);
      margin-bottom: var(--ui-space-4);
    }

    .brand-icon {
      font-size: 2.5rem;
    }

    .brand-title {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .brand-tagline {
      font-size: var(--ui-font-size-lg);
      opacity: 0.9;
      margin: 0 0 var(--ui-space-8) 0;
      font-weight: 500;
    }

    .brand-features {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--ui-space-4);
    }

    .brand-features li {
      font-size: var(--ui-font-size-base);
      opacity: 0.88;
      display: flex;
      align-items: center;
      gap: var(--ui-space-3);
    }

    /* Right login panel */
    .login-panel {
      width: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--ui-space-8) var(--ui-space-6);
      background: var(--ui-color-bg-base);
    }

    @media (max-width: 768px) {
      .login-panel {
        width: 100%;
        padding: var(--ui-space-6) var(--ui-space-4);
      }
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      gap: var(--ui-space-6);
    }

    .login-header {
      display: flex;
      flex-direction: column;
      gap: var(--ui-space-2);
    }

    .login-title {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--ui-color-text-primary);
      letter-spacing: -0.5px;
    }

    .login-subtitle {
      margin: 0;
      font-size: var(--ui-font-size-sm);
      color: var(--ui-color-text-secondary);
      line-height: 1.5;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: var(--ui-space-4);
    }

    .form-row {
      display: flex;
      align-items: center;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--ui-space-2);
      padding: var(--ui-space-3) var(--ui-space-4);
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--ui-radius-md);
      color: #dc2626;
      font-size: var(--ui-font-size-sm);
    }

    .error-icon {
      flex-shrink: 0;
    }

    /* Demo accounts section */
    .demo-section {
      border-top: 1px solid var(--ui-color-border);
      padding-top: var(--ui-space-4);
    }

    .demo-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      background: none;
      border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-md);
      padding: var(--ui-space-3) var(--ui-space-4);
      font-size: var(--ui-font-size-sm);
      color: var(--ui-color-text-secondary);
      cursor: pointer;
      transition: var(--ui-transition-fast);
      font-family: var(--ui-font-family);
    }

    .demo-toggle:hover {
      background: var(--ui-color-bg-subtle);
      color: var(--ui-color-text-primary);
    }

    .demo-chevron {
      font-size: 0.7rem;
      transition: transform var(--ui-transition-fast);
      display: inline-block;
    }

    .demo-chevron.open {
      transform: rotate(180deg);
    }

    .demo-accounts {
      margin-top: var(--ui-space-3);
    }

    .demo-hint {
      margin: 0 0 var(--ui-space-3) 0;
      font-size: var(--ui-font-size-xs);
      color: var(--ui-color-text-muted);
    }

    .demo-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--ui-font-size-xs);
    }

    .demo-table th {
      text-align: left;
      padding: var(--ui-space-2) var(--ui-space-3);
      color: var(--ui-color-text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--ui-color-border);
    }

    .demo-table td {
      padding: var(--ui-space-2) var(--ui-space-3);
      color: var(--ui-color-text-secondary);
      border-bottom: 1px solid var(--ui-color-border);
    }

    .demo-row {
      cursor: pointer;
      transition: background var(--ui-transition-fast);
    }

    .demo-row:hover {
      background: var(--ui-color-bg-subtle);
    }

    .demo-row:hover td {
      color: var(--ui-color-text-primary);
    }

    .perfil-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .perfil-admin { background: rgba(139, 92, 246, 0.12); color: #7c3aed; }
    .perfil-gerente { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
    .perfil-tecnico { background: rgba(16, 185, 129, 0.12); color: #059669; }
    .perfil-visualizador { background: rgba(107, 114, 128, 0.12); color: #4b5563; }
  `],
})
export class LoginComponent {
  email = '';
  senha = '';
  lembrar = false;
  erro = signal('');
  erroEmail = signal('');
  erroSenha = signal('');
  loading = signal(false);
  showDemoAccounts = signal(false);
  demoAccounts = DEMO_ACCOUNTS;

  private auth = inject(AuthService);
  private router = inject(Router);

  fillDemo(email: string): void {
    this.email = email;
    this.senha = 'flexsys123';
    this.showDemoAccounts.set(false);
  }

  entrar(): void {
    // Valida campos
    this.erroEmail.set('');
    this.erroSenha.set('');

    let valid = true;
    if (!this.email.trim()) {
      this.erroEmail.set('E-mail é obrigatório');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.erroEmail.set('E-mail inválido');
      valid = false;
    }
    if (!this.senha.trim()) {
      this.erroSenha.set('Senha é obrigatória');
      valid = false;
    }
    if (!valid) return;

    this.erro.set('');
    this.loading.set(true);

    this.auth.login(this.email, this.senha).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err: Error) => {
        this.erro.set(err.message || 'E-mail ou senha inválidos.');
        this.loading.set(false);
      },
    });
  }
}
