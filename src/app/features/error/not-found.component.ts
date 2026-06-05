import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from 'ui-lib';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <div class="error-page">
      <span class="error-code">404</span>
      <h1>Página não encontrada</h1>
      <p>A página que você procura não existe ou foi movida.</p>
      <ui-button variant="primary" (clicked)="goHome()">Voltar ao início</ui-button>
    </div>
  `,
  styles: [`
    .error-page {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 60vh; gap: 1rem; text-align: center; padding: 2rem;
    }
    .error-code { font-size: 6rem; font-weight: 900; color: var(--ui-color-primary); line-height: 1; }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    p { margin: 0; color: var(--ui-color-text-secondary); }
  `]
})
export class NotFoundComponent {
  private router = inject(Router);
  goHome(): void { this.router.navigate(['/']); }
}
