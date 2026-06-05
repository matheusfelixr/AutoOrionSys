import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, BehaviorSubject, filter, take, timeout } from 'rxjs';
import { ToastService } from 'ui-lib';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast  = inject(ToastService);
  const auth   = inject(AuthService);

  return next(req).pipe(
    timeout(30000),
    catchError((error) => {
      // Timeout error
      if (error?.name === 'TimeoutError') {
        toast.error('A requisição demorou muito. Verifique sua conexão e tente novamente.');
        return throwError(() => error);
      }

      if (!(error instanceof HttpErrorResponse)) {
        toast.error('Ocorreu um erro inesperado. Tente novamente.');
        return throwError(() => error);
      }

      const apiMessage: string | undefined = error.error?.message;
      const apiErrors: { field: string; message: string }[] | undefined = error.error?.errors;

      // 401 — refresh token logic
      if (error.status === 401) {
        if (req.url.includes('/auth/')) {
          clearSession(auth, router, toast);
          return throwError(() => error);
        }
        const refreshToken = auth.getRefreshToken();
        if (!refreshToken) {
          clearSession(auth, router, toast);
          return throwError(() => error);
        }
        if (isRefreshing) {
          return refreshSubject.pipe(
            filter(t => t !== null),
            take(1),
            switchMap(newToken => next(addToken(req, newToken!)))
          );
        }
        isRefreshing = true;
        refreshSubject.next(null);
        return auth.refreshAccessToken().pipe(
          switchMap(newToken => {
            isRefreshing = false;
            refreshSubject.next(newToken);
            return next(addToken(req, newToken));
          }),
          catchError(refreshErr => {
            isRefreshing = false;
            clearSession(auth, router, toast);
            return throwError(() => refreshErr);
          })
        );
      }

      // Other errors
      switch (error.status) {
        case 0:
          if (!navigator.onLine) {
            toast.error('Sem conexão com a internet. Verifique sua rede.');
          } else {
            toast.error('Não foi possível conectar ao servidor. Tente novamente em instantes.');
          }
          break;
        case 400:
        case 422:
          if (apiErrors?.length) {
            apiErrors.forEach(e => toast.error(`${e.field}: ${e.message}`));
          } else {
            toast.error(apiMessage ?? 'Dados inválidos. Verifique os campos e tente novamente.');
          }
          break;
        case 403:
          toast.error(apiMessage ?? 'Você não tem permissão para realizar esta ação.');
          break;
        case 404:
          toast.error(apiMessage ?? 'O recurso solicitado não foi encontrado.');
          break;
        case 409:
          toast.error(apiMessage ?? 'Conflito: este registro já existe.');
          break;
        case 429:
          toast.error('Muitas requisições. Aguarde alguns segundos e tente novamente.');
          break;
        case 500:
          toast.error(apiMessage ?? 'Erro interno do servidor. Nossa equipe foi notificada.');
          break;
        case 502:
        case 503:
        case 504:
          toast.error('Serviço temporariamente indisponível. Tente novamente em instantes.');
          break;
        default:
          if (apiMessage) {
            toast.error(apiMessage);
          } else if (error.status > 0) {
            toast.error(`Erro ${error.status}: algo deu errado. Tente novamente.`);
          }
      }

      return throwError(() => error);
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function clearSession(auth: AuthService, router: Router, toast: ToastService): void {
  auth.logout();
  if (!router.url.includes('/login')) {
    toast.warning('Sessão expirada. Faça login novamente.');
    router.navigate(['/login']);
  }
}
