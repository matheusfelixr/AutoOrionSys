import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PerfilUsuario } from '../models/usuario.model';

/**
 * Guard que restringe acesso por perfil de usuário.
 *
 * Uso nas rotas:
 *   canActivate: [authGuard, perfilGuard(['admin', 'gerente'])]
 */
export function perfilGuard(perfisPermitidos: PerfilUsuario[]): CanActivateFn {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    const user = auth.currentUser();
    if (!user) return router.createUrlTree(['/login']);

    if (perfisPermitidos.includes(user.perfil)) return true;

    // Redireciona para dashboard com aviso via query param
    return router.createUrlTree(['/dashboard'], {
      queryParams: { acesso: 'negado' },
    });
  };
}
