// =============================================================================
// PERMISSIONS SERVICE
// Armazena e verifica as telas que o usuário logado pode acessar.
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

  /** Telas permitidas para o usuário atual */
  private readonly _screens = signal<ScreenName[]>(this._loadFromStorage());
  readonly screens = this._screens.asReadonly();

  // ── Carregamento ────────────────────────────────────────────────────────────

  /**
   * Carrega permissões após o login.
   * Em produção: GET /api/users/{id}/permissions
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
          // Fallback: sem permissões em caso de erro
          this._screens.set(['home', 'perfil']);
          return of(['home', 'perfil'] as ScreenName[]);
        }),
      );
  }

  // ── Verificação ─────────────────────────────────────────────────────────────

  /**
   * Retorna `true` se o usuário tem acesso à tela informada.
   *
   * @example
   * permissionsService.can('usuarios') // true para admin/gerente
   */
  can(screen: ScreenName): boolean {
    return this._screens().includes(screen);
  }

  /**
   * Retorna `true` se o usuário tem acesso a TODAS as telas informadas.
   */
  canAll(...screens: ScreenName[]): boolean {
    return screens.every(s => this.can(s));
  }

  /**
   * Retorna `true` se o usuário tem acesso a QUALQUER uma das telas.
   */
  canAny(...screens: ScreenName[]): boolean {
    return screens.some(s => this.can(s));
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** Limpa as permissões ao fazer logout. */
  clear(): void {
    this._screens.set([]);
    localStorage.removeItem(LS_KEY);
  }

  /**
   * Seta permissões diretamente a partir da resposta do login.
   * Usado quando o backend retorna `screens[]` no payload do JWT response.
   */
  setFromLoginResponse(screens: string[]): void {
    this._screens.set(screens as ScreenName[]);
    this._saveToStorage(screens as ScreenName[]);
  }

  // ── Storage ─────────────────────────────────────────────────────────────────

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
