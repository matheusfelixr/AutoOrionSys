import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ToastService } from 'ui-lib';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private toast = inject(ToastService);

  handleError(error: unknown): void {
    // Don't handle HttpErrorResponse — already handled by interceptor
    if ((error as any)?.name === 'HttpErrorResponse') return;

    const message = (error as Error)?.message ?? String(error);

    // Ignore Angular internal errors that don't affect the user
    if (message.includes('ExpressionChangedAfterItHasBeenCheckedError')) return;
    if (message.includes('NG0100')) return;

    console.error('[GlobalErrorHandler]', error);

    // Show user-friendly message for unexpected errors
    this.toast.error('Ocorreu um erro inesperado. Recarregue a página se o problema persistir.');
  }
}
