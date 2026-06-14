// =============================================================================
// PERMISSIONS SERVICE
// Armazena e verifica as telas que o usuário logado pode acessar.
// =============================================================================

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { ScreenName, ScreenActions, ActionName } from '../models/permissions.model';
import { MOCK_PERMISSIONS, MOCK_ACTIONS } from '../data/mock-permissions';
import { MOCK_USUARIOS } from '../data/mock-data';
import { PerfilUsuario } from '../models/usuario.model';
import { UiPermissionsProvider } from 'ui-lib';
import { environment } from '../../../environments/environment';

const LS_KEY         = 'autoorion-demo-screens';
const LS_ACTIONS_KEY = 'autoorion-demo-actions';

@Injectable({ providedIn: 'root' })
export class PermissionsService implements UiPermissionsProvider {
  private http = inject(HttpClient);

  /** Telas permitidas para o usuário atual */
  private readonly _screens = signal<ScreenName[]>(this._loadFromStorage());

  /** Permissões granulares por tela */
  private readonly _actions = signal<ScreenActions>(this._loadActionsFromStorage());
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
      const actions = MOCK_ACTIONS[perfil]    ?? {};
      this._screens.set(screens);
      this._actions.set(actions);
      this._saveToStorage(screens);
      this._saveActionsToStorage(actions);
      return of(screens);
    }

    return this.http
      .get<{ screens: ScreenName[]; permissoes: ScreenActions }>(`${environment.apiUrl}/users/${userId}/permissions`)
      .pipe(
        tap(res => {
          const screens   = res.screens ?? [];
          const permissoes = res.permissoes ?? {};
          this._screens.set(screens);
          this._actions.set(permissoes);
          this._saveToStorage(screens);
          this._saveActionsToStorage(permissoes);
        }),
        map(res => res.screens ?? []),
        catchError(() => {
          this._screens.set(['home', 'perfil']);
          return of(['home', 'perfil'] as ScreenName[]);
        }),
      );
  }

  // ── Verificação ─────────────────────────────────────────────────────────────

  /**
   * Verifica acesso à tela (1 arg) ou permissão granular (2 args).
   *
   * Implementa `UiPermissionsProvider` da ui-lib — usado pela diretiva `*uiCan`.
   *
   * @example
   * can('usuarios')          // true se a tela está liberada
   * can('veiculos', 'criar') // true se a ação está permitida
   */
  can(screen: string, action?: string): boolean {
    if (action === undefined) {
      return this._screens().includes(screen as ScreenName);
    }
    const tela = this._actions()[screen];
    return Array.isArray(tela) && tela.includes(action as ActionName);
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

  /** Retorna as ações permitidas para uma tela. */
  actions(screen: string): ActionName[] {
    return this._actions()[screen] ?? [];
  }

  /** Leitura do mapa de ações (read-only). */
  readonly actionsMap = this._actions.asReadonly();

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** Limpa as permissões ao fazer logout. */
  clear(): void {
    this._screens.set([]);
    this._actions.set({});
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_ACTIONS_KEY);
  }

  /**
   * Seta permissões diretamente a partir da resposta do login.
   * Usado quando o backend retorna `screens[]` + `permissoes` no payload.
   */
  setFromLoginResponse(screens: string[], permissoes?: ScreenActions): void {
    this._screens.set(screens as ScreenName[]);
    this._saveToStorage(screens as ScreenName[]);
    if (permissoes) {
      this._actions.set(permissoes);
      this._saveActionsToStorage(permissoes);
    }
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

  private _saveActionsToStorage(actions: ScreenActions): void {
    localStorage.setItem(LS_ACTIONS_KEY, JSON.stringify(actions));
  }

  private _loadActionsFromStorage(): ScreenActions {
    try {
      const raw = localStorage.getItem(LS_ACTIONS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
}
