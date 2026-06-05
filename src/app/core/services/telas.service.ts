// =============================================================================
// TELAS SERVICE
// Fonte de verdade para as telas cadastradas no sistema.
// Usado por:
//   - TelasComponent      → CRUD de telas
//   - PerfisComponent     → checklist de telas para associar a perfis
//   - ShellComponent      → construção dinâmica da sidebar
//
// Em produção: trocar mock por chamadas ao backend:
//   GET    /api/telas
//   POST   /api/telas
//   PUT    /api/telas/:id
//   DELETE /api/telas/:id
// =============================================================================

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { TelaSistema } from '../models/tela.model';
import { environment } from '../../../environments/environment';

/** Dados iniciais — substituídos pela resposta do backend em produção */
const MOCK_TELAS: TelaSistema[] = [
  // ── PRINCIPAL ─────────────────────────────────────────────────────
  { id: 't1',  screenName: 'home',           nome: 'Início',           descricao: 'Tela inicial do sistema',            menuId: 'mg1', parentScreenName: undefined, icone: '🏠', ordem: 1, ativo: true },
  // ── CADASTROS ─────────────────────────────────────────────────────
  { id: 't5',  screenName: 'usuarios-group', nome: 'Usuários',         descricao: 'Módulo de usuários (agrupador)',     menuId: 'mg2', parentScreenName: undefined, icone: '👥', ordem: 1, ativo: true },
  { id: 't6',  screenName: 'usuarios',       nome: 'Usuários',         descricao: 'Cadastro e gestão de usuários',      menuId: 'mg2', parentScreenName: 'usuarios-group', icone: undefined, ordem: 1, ativo: true },
  { id: 't7',  screenName: 'perfis',         nome: 'Perfis',           descricao: 'Perfis de acesso ao sistema',        menuId: 'mg2', parentScreenName: 'usuarios-group', icone: undefined, ordem: 2, ativo: true },
  // ── CONFIGURAÇÕES ─────────────────────────────────────────────────
  { id: 't9',  screenName: 'config-group',   nome: 'Telas',            descricao: 'Configurações de telas (agrupador)', menuId: 'mg3', parentScreenName: undefined, icone: '⚙️', ordem: 1, ativo: true },
  { id: 't10', screenName: 'config.telas',   nome: 'Telas do Sistema', descricao: 'Cadastro das telas do sistema',      menuId: 'mg3', parentScreenName: 'config-group', icone: undefined, ordem: 1, ativo: true },
  { id: 't11', screenName: 'config.menus',   nome: 'Menus',            descricao: 'Organização dos menus laterais',     menuId: 'mg3', parentScreenName: 'config-group', icone: undefined, ordem: 2, ativo: true },
  // ── CONTA ─────────────────────────────────────────────────────────
  { id: 't12', screenName: 'perfil',              nome: 'Perfil',                  descricao: 'Dados pessoais do usuário logado',                    menuId: 'mg4', parentScreenName: undefined,           icone: '🧑',     ordem: 1, ativo: true },
  { id: 't13', screenName: 'sair',               nome: 'Sair',                    descricao: 'Sair do sistema',                                     menuId: 'mg4', parentScreenName: undefined,           icone: '🚪',     ordem: 2, ativo: true },
  // ── NOTIFICAÇÕES ──────────────────────────────────────────────────
  { id: 't14', screenName: 'notificacoes-group', nome: 'Notificações',            descricao: 'Módulo de notificações (agrupador)',                   menuId: 'mg1', parentScreenName: undefined,           icone: '🔔',     ordem: 3, ativo: true },
  { id: 't15', screenName: 'notificacoes',       nome: 'Minhas Notificações',     descricao: 'Notificações do usuário logado',                       menuId: 'mg1', parentScreenName: 'notificacoes-group', icone: undefined, ordem: 1, ativo: true },
  { id: 't16', screenName: 'notificacoes.admin', nome: 'Gerenciar Notificações',  descricao: 'Criar e gerenciar notificações do sistema',            menuId: 'mg1', parentScreenName: 'notificacoes-group', icone: undefined, ordem: 2, ativo: true },
  // ── PARÂMETROS ────────────────────────────────────────────────────
  { id: 't17', screenName: 'parametros-group',  nome: 'Parâmetros',              descricao: 'Módulo de parâmetros (agrupador)',                     menuId: 'mg3', parentScreenName: undefined,              icone: '🔧',     ordem: 2, ativo: true },
  { id: 't18', screenName: 'parametros',        nome: 'Parâmetros',              descricao: 'Configurações parametrizáveis do sistema',             menuId: 'mg3', parentScreenName: 'parametros-group',    icone: undefined, ordem: 1, ativo: true },
  { id: 't19', screenName: 'parametros.grupos', nome: 'Grupos',                  descricao: 'Grupos de parâmetros',                                 menuId: 'mg3', parentScreenName: 'parametros-group',    icone: undefined, ordem: 2, ativo: true },
];

@Injectable({ providedIn: 'root' })
export class TelasService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/telas`;

  private readonly _telas = signal<TelaSistema[]>([...MOCK_TELAS]);

  /** Signal público (somente leitura) com todas as telas cadastradas */
  readonly telas = this._telas.asReadonly();

  /** Telas ativas — usadas no checklist de Perfis */
  telasAtivas(): TelaSistema[] {
    return this._telas().filter(t => t.ativo);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  getAll(): Observable<TelaSistema[]> {
    if (environment.useMockData) {
      return of([...MOCK_TELAS]).pipe(tap(d => this._telas.set(d)));
    }
    // Backend retorna ApiResponse<List<TelaSistema>> — desempacota o campo data[]
    return this.http.get<{ data: TelaSistema[] }>(this.API).pipe(
      tap(resp => this._telas.set(resp.data ?? [])),
      map(resp => resp.data ?? []),
      catchError(() => of(this._telas())),
    );
  }

  create(data: Omit<TelaSistema, 'id'>): Observable<TelaSistema> {
    const nova: TelaSistema = { id: 't-' + Date.now(), ...data };
    if (environment.useMockData) {
      this._telas.update(list => [...list, nova]);
      return of(nova);
    }
    return this.http.post<TelaSistema>(this.API, data).pipe(
      tap(criada => this._telas.update(list => [...list, criada])),
      catchError(() => { this._telas.update(l => [...l, nova]); return of(nova); }),
    );
  }

  update(id: string, data: Partial<TelaSistema>): Observable<TelaSistema> {
    const atual = this._telas().find(t => t.id === id)!;
    const updated = { ...atual, ...data };
    if (environment.useMockData) {
      this._telas.update(list => list.map(t => t.id === id ? updated : t));
      return of(updated);
    }
    return this.http.put<TelaSistema>(`${this.API}/${id}`, data).pipe(
      tap(res => this._telas.update(list => list.map(t => t.id === id ? res : t))),
      catchError(() => { this._telas.update(l => l.map(t => t.id === id ? updated : t)); return of(updated); }),
    );
  }

  delete(id: string): Observable<void> {
    if (environment.useMockData) {
      this._telas.update(list => list.filter(t => t.id !== id));
      return of(void 0);
    }
    return this.http.delete<void>(`${this.API}/${id}`).pipe(
      tap(() => this._telas.update(list => list.filter(t => t.id !== id))),
      catchError(() => { this._telas.update(l => l.filter(t => t.id !== id)); return of(void 0); }),
    );
  }

  /** Retorna telas pertencentes a um menu (incluindo agrupadores e filhos) */
  telasByMenu(menuId: string): TelaSistema[] {
    return this._telas().filter(t => t.menuId === menuId && t.ativo);
  }

  /** Retorna telas que são filhas de um item pai específico */
  telasByParent(parentScreenName: string): TelaSistema[] {
    return this._telas().filter(t => t.parentScreenName === parentScreenName && t.ativo);
  }
}
