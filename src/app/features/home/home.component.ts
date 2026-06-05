import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  template: `
    <div class="home-page">
      <div class="home-header">
        <h1>Bem-vindo, {{ firstName() }}!</h1>
        <p>Selecione um módulo para começar</p>
      </div>
      <div class="home-cards">
        <div class="module-card" (click)="nav('/usuarios')">
          <span class="module-card__icon">👥</span>
          <strong>Usuários</strong>
          <span>Gerenciar usuários e permissões</span>
        </div>
        <div class="module-card" (click)="nav('/perfil')">
          <span class="module-card__icon">👤</span>
          <strong>Meu Perfil</strong>
          <span>Editar dados e foto</span>
        </div>
        <div class="module-card" (click)="nav('/config/menus')">
          <span class="module-card__icon">⚙️</span>
          <strong>Configurações</strong>
          <span>Menus, telas e parâmetros</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-page {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 900px;
      margin: 0 auto;
    }
    .home-header h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--ui-color-text);
    }
    .home-header p {
      margin: 0.25rem 0 0;
      color: var(--ui-color-text-secondary);
      font-size: 1rem;
    }
    .home-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    .module-card {
      background: var(--ui-color-surface);
      border: 1.5px solid var(--ui-color-border);
      border-radius: var(--ui-radius-lg);
      padding: 1.5rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: border-color var(--ui-transition-fast), box-shadow var(--ui-transition-fast), transform 0.15s;
    }
    .module-card:hover {
      border-color: var(--ui-color-primary);
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
      transform: translateY(-2px);
    }
    .module-card__icon { font-size: 2rem; }
    .module-card strong { font-size: 1rem; font-weight: 600; color: var(--ui-color-text); }
    .module-card span { font-size: 0.875rem; color: var(--ui-color-text-secondary); }
    @media (max-width: 480px) {
      .home-page { padding: 1rem; }
      .home-cards { grid-template-columns: 1fr; }
    }
  `]
})
export class HomeComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  user      = this.auth.currentUser;
  firstName = computed(() => this.user()?.nome?.split(' ')[0] ?? '');

  nav(path: string): void { this.router.navigate([path]); }
}
