// =============================================================================
// PERMISSIONS SERVICE
// Armazena e verifica as telas que o usuÃ¡rio logado pode acessar.
// =============================================================================

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { ScreenName } from '../models/permissions.model';
import { MOCK_PERMISSIONS } from '../data/mock-permissions';
import { MOCK_USUARIOS } from '../data/mock-data';
import { PerfilUsuario } from '../models/usuario.model';
import { environment } from '../../../environments/environment';

const LS_KEY = 'autoorion-demo-screens';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private http = inject(HttpClient);

  /** Telas permitidas para o usuÃ¡rio atual */
  private readonly _screens = signal<ScreenName[]>(this._loadFromStorage());
  readonly screens = this._screens.asReadonly();

  // â”€â”€ Carregamento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Carrega permissÃµes apÃ³s o login.
   * Em produÃ§Ã£o: GET /api/users/{id}/permissions
   * Em mock: retorna as telas definidas em MOCK_PERMISSIONS pelo perfil.
   */
  load(userId: string): Observable<ScreenName[]> {
    if (environment.useMockData) {
      const user   = MOCK_USUARIOS.find(u => u.id === userId);
      const perfil = (user?.perfil ?? 'visualizador') as PerfilUsuario;
      const screens = MOCK_PERMISSIONS[perfil] ?? [];
      this._screens.set(screens);
      this._saveToStorage(screens);
      return of(screens);
    }

    return this.http
      .get<ScreenName[]>(`${environment.apiUrl}/users/${userId}/permissions`)
      .pipe(
        tap(screens => {
          this._screens.set(screens);
          this._saveToStorage(screens);
        }),
        catchError(() => {
          // Fallback: sem permissÃµes em caso de erro
          this._screens.set(['home', 'perfil']);
          return of(['home', 'perfil'] as ScreenName[]);
        }),
      );
  }

  // â”€â”€ VerificaÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Retorna `true` se o usuÃ¡rio tem acesso Ã  tela informada.
   *
   * @example
   * permissionsService.can('usuarios') // true para admin/gerente
   */
  can(screen: ScreenName): boolean {
    return this._screens().includes(screen);
  }

  /**
   * Retorna `true` se o usuÃ¡rio tem acesso a TODAS as telas informadas.
   */
  canAll(...screens: ScreenName[]): boolean {
    return screens.every(s => this.can(s));
  }

  /**
   * Retorna `true` se o usuÃ¡rio tem acesso a QUALQUER uma das telas.
   */
  canAny(...screens: ScreenName[]): boolean {
    return screens.some(s => this.can(s));
  }

  // â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Limpa as permissÃµes ao fazer logout. */
  clear(): void {
    this._screens.set([]);
    localStorage.removeItem(LS_KEY);
  }

  /**
   * Seta permissÃµes diretamente a partir da resposta do login.
   * Usado quando o backend retorna `screens[]` no payload do JWT response.
   */
  setFromLoginResponse(screens: string[]): void {
    this._screens.set(screens as ScreenName[]);
    this._saveToStorage(screens as ScreenName[]);
  }

  // â”€â”€ Storage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private _saveToStorage(screens: ScreenName[]): void {
    localStorage.setItem(LS_KEY, JSON.stringify(screens));
  }

  private _loadFromStorage(): ScreenName[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
