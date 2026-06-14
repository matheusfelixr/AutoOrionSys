import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map, throwError } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { MOCK_USUARIOS } from '../data/mock-data';
import { PermissionsService } from './permissions.service';
import { ScreenActions } from '../models/permissions.model';
import { environment } from '../../../environments/environment';

/** Payload interno dentro do ApiResponse wrapper */
interface LoginPayload {
  token: string;
  refreshToken?: string;
  screens: string[];
  permissoes?: ScreenActions;
  user: {
    id: string;
    nome: string;
    email: string;
    cargo: string;
    perfil: string;
    status: string;
    telefone?: string;
    avatarUrl?: string;
  };
}

/** Formato retornado pelo backend — envelope ApiResponse<LoginPayload> */
interface LoginResponse {
  success: boolean;
  data: LoginPayload;
  message: string;
}

const LS_USER_KEY    = 'autoorion-demo-user';
const LS_TOKEN_KEY   = 'autoorion-jwt-token';
const LS_REFRESH_KEY = 'autoorion-refresh-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http  = inject(HttpClient);
  private perms = inject(PermissionsService);

  currentUser = signal<Usuario | null>(this._loadUser());

  // ── Login ─────────────────────────────────────────────────────────────────

  /**
   * Realiza login.
   * - useMockData: true  → busca no array mock local (sem HTTP)
   * - useMockData: false → chama POST /api/auth/login no backend
   *
   * Sempre retorna Observable<boolean> para manter API consistente.
   */
  login(email: string, senha: string): Observable<boolean> {
    if (environment.useMockData) {
      return this._mockLogin(email);
    }
    return this._httpLogin(email, senha);
  }

  logout(): void {
    const token = localStorage.getItem(LS_TOKEN_KEY);
    if (token) {
      // Fire-and-forget: call backend logout (don't wait for response)
      this.http.post(`${environment.apiUrl}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({ error: () => {} });
    }

    this.currentUser.set(null);
    this.perms.clear();
    localStorage.removeItem(LS_USER_KEY);
    localStorage.removeItem(LS_TOKEN_KEY);
    localStorage.removeItem(LS_REFRESH_KEY);
    localStorage.removeItem('autoorion-user-data');
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  /**
   * Atualiza o próprio perfil via PUT /api/auth/me.
   * Qualquer usuário pode chamar — não requer ADMIN/GERENTE.
   */
  updateMe(body: Record<string, unknown>): Observable<boolean> {
    return this.http.put<{ data: { avatarUrl?: string; nome?: string } }>(
      `${environment.apiUrl}/auth/me`, body
    ).pipe(
      map(() => true),
      catchError(() => throwError(() => new Error('Erro ao atualizar perfil')))
    );
  }

  /**
   * Valida a sessão no startup — chama GET /api/auth/me.
   * Se retornar erro (401/403), limpa a sessão.
   * Chamado pelo ShellComponent ao inicializar.
   */
  validateSession(): Observable<boolean> {
    const token = this.getToken();
    if (!token) return of(false);

    return this.http.get<{ data: unknown }>(`${environment.apiUrl}/auth/me`).pipe(
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }

  /** Atualiza o avatarUrl do usuário logado (ex: após salvar foto no perfil) */
  updateCurrentUserAvatar(avatarUrl: string): void {
    const current = this.currentUser();
    if (!current) return;
    const updated = { ...current, avatarUrl };
    this.currentUser.set(updated);
    localStorage.setItem('autoorion-user-data', JSON.stringify(updated));
  }

  getToken(): string | null {
    return localStorage.getItem(LS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(LS_REFRESH_KEY);
  }

  refreshAccessToken(): Observable<string> {
    const refreshToken = localStorage.getItem(LS_REFRESH_KEY);
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    return this.http.post<{ data: { token: string; refreshToken: string } }>(
      `${environment.apiUrl}/auth/refresh`,
      { refreshToken }
    ).pipe(
      tap(resp => {
        localStorage.setItem(LS_TOKEN_KEY, resp.data.token);
        if (resp.data.refreshToken) {
          localStorage.setItem(LS_REFRESH_KEY, resp.data.refreshToken);
        }
      }),
      map(resp => resp.data.token),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _mockLogin(email: string): Observable<boolean> {
    const user = MOCK_USUARIOS.find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );
    if (user) {
      this.currentUser.set(user);
      localStorage.setItem(LS_USER_KEY, user.id);
      this.perms.clear();
      this.perms.load(user.id).subscribe();
      return of(true);
    }
    return of(false);
  }

  private _httpLogin(email: string, senha: string): Observable<boolean> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, senha })
      .pipe(
        tap(response => {
          // Backend retorna ApiResponse<LoginPayload> — dados estão em response.data
          const payload = response.data;

          // Salva token JWT e refresh token
          localStorage.setItem(LS_TOKEN_KEY, payload.token);
          localStorage.setItem(LS_REFRESH_KEY, payload.refreshToken ?? '');

          // Converte UserInfo → Usuario
          const usuario: Usuario = {
            id:           payload.user.id,
            nome:         payload.user.nome,
            email:        payload.user.email,
            cargo:        payload.user.cargo,
            perfil:       payload.user.perfil as any,
            status:       payload.user.status as any,
            telefone:     payload.user.telefone,
            avatarUrl:    payload.user.avatarUrl,
            dataCadastro: new Date(),
            ultimoAcesso: new Date(),
          };

          this.currentUser.set(usuario);
          localStorage.setItem(LS_USER_KEY, usuario.id);
          localStorage.setItem('autoorion-user-data', JSON.stringify(usuario));

          // Seta permissões (telas + ações granulares) diretamente da resposta
          this.perms.setFromLoginResponse(payload.screens, payload.permissoes);
        }),
        map(() => true),
        catchError(err => {
          const msg = err?.error?.message ?? 'Erro ao fazer login';
          throw new Error(msg);
        }),
      );
  }

  private _loadUser(): Usuario | null {
    try {
      const id = localStorage.getItem(LS_USER_KEY);
      if (!id) return null;

      if (environment.useMockData) {
        return MOCK_USUARIOS.find(u => u.id === id) ?? null;
      }

      // Em modo real: recria usuário mínimo do localStorage para manter sessão
      // Os dados completos virão do próximo reload (ou do token JWT)
      const storedUser = localStorage.getItem('autoorion-user-data');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  }
}
