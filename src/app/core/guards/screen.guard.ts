// =============================================================================
// SCREEN GUARD
// Protege rotas verificando se o usuário tem permissão para a tela.
// Redireciona silenciosamente para o dashboard se não tiver acesso.
// =============================================================================

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ScreenName } from '../models/permissions.model';
import { PermissionsService } from '../services/permissions.service';

/**
 * Guard baseado em nome de tela.
 *
 * @example
 * // Em app.routes.ts:
 * {
 *   path: 'usuarios',
 *   canActivate: [authGuard, screenGuard('usuarios')],
 *   loadComponent: ...
 * }
 */
export function screenGuard(screen: ScreenName): CanActivateFn {
  return () => {
    const perms  = inject(PermissionsService);
    const router = inject(Router);

    if (perms.can(screen)) return true;

    // Sem acesso: redireciona ao dashboard sem query param —
    // o item nem aparece no menu, então não precisa de banner de erro.
    return router.createUrlTree(['/dashboard']);
  };
}
