import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'autoorion-jwt-token';

/**
 * Interceptor que adiciona o JWT token em todas as requisiÃ§Ãµes Ã  API.
 * Rotas pÃºblicas (ex: /api/auth/login) nÃ£o precisam de token â€”
 * o backend permite essas rotas sem autenticaÃ§Ã£o.
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
