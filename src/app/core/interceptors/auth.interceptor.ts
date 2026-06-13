import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'autoorion-jwt-token';

/**
 * Interceptor que adiciona o JWT token em todas as requisições à API.
 * Rotas públicas (ex: /api/auth/login) não precisam de token —
 * o backend permite essas rotas sem autenticação.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token && req.url.includes('/api/')) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq);
  }

  return next(req);
};
