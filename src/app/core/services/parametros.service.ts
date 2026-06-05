// =============================================================================
// PARÃ‚METROS SERVICE
// CRUD de grupos e parÃ¢metros do sistema.
// Em produÃ§Ã£o: substituir mock por chamadas HTTP reais.
// =============================================================================

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { GrupoParametro, Parametro } from '../models/parametro.model';
import { environment } from '../../../environments/environment';

const MOCK_GRUPOS: GrupoParametro[] = [
  { id: 'gp1', nome: 'Geral',        descricao: 'ConfiguraÃ§Ãµes gerais do sistema',       ordem: 1, ativo: true },
  { id: 'gp2', nome: 'Financeiro',   descricao: 'ConfiguraÃ§Ãµes financeiras e contÃ¡beis', ordem: 2, ativo: true },
  { id: 'gp3', nome: 'Obras',        descricao: 'ConfiguraÃ§Ãµes para gestÃ£o de obras',    ordem: 3, ativo: true },
  { id: 'gp4', nome: 'NotificaÃ§Ãµes', descricao: 'ConfiguraÃ§Ãµes do sistema de alertas',   ordem: 4, ativo: true },
  { id: 'gp5', nome: 'SeguranÃ§a',    descricao: 'PolÃ­ticas de acesso e sessÃ£o',          ordem: 5, ativo: true },
];

const MOCK_PARAMETROS: Parametro[] = [
  // â”€â”€ Geral â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 'p01', nome: 'prmNomeSistema',     descricao: 'Nome exibido no sistema',              grupoId: 'gp1', valor: 'autoorion Demo',    tipo: 'texto',    ativo: true },
  { id: 'p02', nome: 'prmVersao',          descricao: 'VersÃ£o atual do sistema',              grupoId: 'gp1', valor: '1.0.0',            tipo: 'texto',    ativo: true },
  { id: 'p03', nome: 'prmFusoHorario',     descricao: 'Fuso horÃ¡rio padrÃ£o',                 grupoId: 'gp1', valor: 'America/Sao_Paulo', tipo: 'lista',   opcoes: ['America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'UTC'], ativo: true },
  { id: 'p04', nome: 'prmLinhasPorPagina', descricao: 'Registros por pÃ¡gina nas listagens',  grupoId: 'gp1', valor: '10',               tipo: 'lista',    opcoes: ['5', '10', '20', '50', '100'], ativo: true },
  // â”€â”€ Financeiro â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 'p05', nome: 'prmMoeda',              descricao: 'Moeda padrÃ£o do sistema',               grupoId: 'gp2', valor: 'BRL',  tipo: 'lista',    opcoes: ['BRL', 'USD', 'EUR'], ativo: true },
  { id: 'p06', nome: 'prmArredondamento',     descricao: 'Casas decimais para valores financeiros', grupoId: 'gp2', valor: '2',  tipo: 'numero',   ativo: true },
  { id: 'p07', nome: 'prmExibirSimboloMoeda', descricao: 'Exibir sÃ­mbolo da moeda nos valores',   grupoId: 'gp2', valor: 'true', tipo: 'booleano', ativo: true },
  { id: 'p08', nome: 'prmPrecisaoCalculo',    descricao: 'PrecisÃ£o decimal em cÃ¡lculos internos', grupoId: 'gp2', valor: '4',   tipo: 'numero',   ativo: true },
  // â”€â”€ Obras â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 'p09', nome: 'prmProgressoAlerta',     descricao: '% de progresso que dispara alerta de prazo',      grupoId: 'gp3', valor: '80',  tipo: 'numero',   ativo: true },
  { id: 'p10', nome: 'prmDiasAvisoVencimento', descricao: 'Dias de antecedÃªncia para avisos de prazo',       grupoId: 'gp3', valor: '30',  tipo: 'numero',   ativo: true },
  { id: 'p11', nome: 'prmEtapasPadrao',        descricao: 'Etapas padrÃ£o para novas obras (separadas por vÃ­rgula)', grupoId: 'gp3', valor: 'FundaÃ§Ã£o,Estrutura,Alvenaria,Cobertura,Acabamento', tipo: 'texto', ativo: true },
  { id: 'p12', nome: 'prmDiarioObrigatorio',   descricao: 'Exigir diÃ¡rio fotogrÃ¡fico para concluir obra',    grupoId: 'gp3', valor: 'false', tipo: 'booleano', ativo: true },
  // â”€â”€ NotificaÃ§Ãµes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 'p13', nome: 'prmNotifAtivadas',     descricao: 'Ativar sistema de notificaÃ§Ãµes',         grupoId: 'gp4', valor: 'true',  tipo: 'booleano', ativo: true },
  { id: 'p14', nome: 'prmRetencaoNotif',     descricao: 'Dias de retenÃ§Ã£o de notificaÃ§Ãµes lidas', grupoId: 'gp4', valor: '90',    tipo: 'numero',   ativo: true },
  { id: 'p15', nome: 'prmNotifEmailAtivado', descricao: 'Enviar notificaÃ§Ãµes por e-mail',         grupoId: 'gp4', valor: 'false', tipo: 'booleano', ativo: true },
  { id: 'p16', nome: 'prmMaxNotifDropdown',  descricao: 'MÃ¡ximo de notificaÃ§Ãµes no dropdown',     grupoId: 'gp4', valor: '5',     tipo: 'numero',   ativo: true },
  // â”€â”€ SeguranÃ§a â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: 'p17', nome: 'prmTempoSessao',        descricao: 'Tempo de inatividade para expirar sessÃ£o (minutos)', grupoId: 'gp5', valor: '60', tipo: 'numero',   ativo: true },
  { id: 'p18', nome: 'prmTentativasLogin',    descricao: 'Tentativas de login antes de bloquear',              grupoId: 'gp5', valor: '5',  tipo: 'numero',   ativo: true },
  { id: 'p19', nome: 'prmSenhaMinCaracteres', descricao: 'MÃ­nimo de caracteres na senha',                      grupoId: 'gp5', valor: '8',  tipo: 'numero',   ativo: true },
  { id: 'p20', nome: 'prmLogAtividades',      descricao: 'Registrar log de atividades dos usuÃ¡rios',           grupoId: 'gp5', valor: 'true', tipo: 'booleano', ativo: true },
];

@Injectable({ providedIn: 'root' })
export class ParametrosService {
  private http = inject(HttpClient);
  private readonly API_GRUPOS = `${environment.apiUrl}/parametros/grupos`;
  private readonly API_PARAMS = `${environment.apiUrl}/parametros`;

  private readonly _grupos    = signal<GrupoParametro[]>([...MOCK_GRUPOS]);
  private readonly _parametros = signal<Parametro[]>([...MOCK_PARAMETROS]);

  /** Signal pÃºblico (somente leitura) */
  readonly grupos    = this._grupos.asReadonly();
  readonly parametros = this._parametros.asReadonly();

  // â”€â”€ Grupos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getGrupos(): Observable<GrupoParametro[]> {
    if (environment.useMockData) {
      return of([...MOCK_GRUPOS]).pipe(tap(d => this._grupos.set(d)));
    }
    return this.http.get<GrupoParametro[]>(this.API_GRUPOS).pipe(
      tap(d => this._grupos.set(d)),
      catchError(() => of(this._grupos())),
    );
  }

  createGrupo(data: Omit<GrupoParametro, 'id'>): Observable<GrupoParametro> {
    const novo: GrupoParametro = { id: 'gp-' + Date.now(), ...data };
    if (environment.useMockData) {
      this._grupos.update(list => [...list, novo]);
      return of(novo);
    }
    return this.http.post<GrupoParametro>(this.API_GRUPOS, data).pipe(
      tap(criado => this._grupos.update(list => [...list, criado])),
      catchError(() => { this._grupos.update(l => [...l, novo]); return of(novo); }),
    );
  }

  updateGrupo(id: string, data: Partial<GrupoParametro>): Observable<GrupoParametro> {
    const atual   = this._grupos().find(g => g.id === id)!;
    const updated = { ...atual, ...data };
    if (environment.useMockData) {
      this._grupos.update(list => list.map(g => g.id === id ? updated : g));
      return of(updated);
    }
    return this.http.put<GrupoParametro>(`${this.API_GRUPOS}/${id}`, data).pipe(
      tap(res => this._grupos.update(list => list.map(g => g.id === id ? res : g))),
      catchError(() => { this._grupos.update(l => l.map(g => g.id === id ? updated : g)); return of(updated); }),
    );
  }

  deleteGrupo(id: string): Observable<void> {
    if (environment.useMockData) {
      this._grupos.update(list => list.filter(g => g.id !== id));
      return of(void 0);
    }
    return this.http.delete<void>(`${this.API_GRUPOS}/${id}`).pipe(
      tap(() => this._grupos.update(list => list.filter(g => g.id !== id))),
      catchError(() => { this._grupos.update(l => l.filter(g => g.id !== id)); return of(void 0); }),
    );
  }

  reorderGrupo(id: string, dir: 'up' | 'down'): void {
    const sorted = [...this._grupos()].sort((a, b) => a.ordem - b.ordem);
    const idx    = sorted.findIndex(g => g.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const tmp = sorted[idx].ordem;
    sorted[idx]    = { ...sorted[idx],    ordem: sorted[swapIdx].ordem };
    sorted[swapIdx] = { ...sorted[swapIdx], ordem: tmp };
    this._grupos.set(sorted);
  }

  // â”€â”€ ParÃ¢metros â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getParametros(): Observable<Parametro[]> {
    if (environment.useMockData) {
      return of([...MOCK_PARAMETROS]).pipe(tap(d => this._parametros.set(d)));
    }
    return this.http.get<Parametro[]>(this.API_PARAMS).pipe(
      tap(d => this._parametros.set(d)),
      catchError(() => of(this._parametros())),
    );
  }

  getParametrosByGrupo(grupoId: string): Parametro[] {
    return this._parametros().filter(p => p.grupoId === grupoId);
  }

  updateValor(id: string, valor: string): Observable<Parametro> {
    const atual   = this._parametros().find(p => p.id === id)!;
    const updated = { ...atual, valor };
    if (environment.useMockData) {
      this._parametros.update(list => list.map(p => p.id === id ? updated : p));
      return of(updated);
    }
    return this.http.patch<Parametro>(`${this.API_PARAMS}/${id}/valor`, { valor }).pipe(
      tap(res => this._parametros.update(list => list.map(p => p.id === id ? res : p))),
      catchError(() => { this._parametros.update(l => l.map(p => p.id === id ? updated : p)); return of(updated); }),
    );
  }

  createParametro(data: Omit<Parametro, 'id'>): Observable<Parametro> {
    const novo: Parametro = { id: 'p-' + Date.now(), ...data };
    if (environment.useMockData) {
      this._parametros.update(list => [...list, novo]);
      return of(novo);
    }
    return this.http.post<Parametro>(this.API_PARAMS, data).pipe(
      tap(criado => this._parametros.update(list => [...list, criado])),
      catchError(() => { this._parametros.update(l => [...l, novo]); return of(novo); }),
    );
  }

  updateParametro(id: string, data: Partial<Parametro>): Observable<Parametro> {
    const atual   = this._parametros().find(p => p.id === id)!;
    const updated = { ...atual, ...data };
    if (environment.useMockData) {
      this._parametros.update(list => list.map(p => p.id === id ? updated : p));
      return of(updated);
    }
    return this.http.put<Parametro>(`${this.API_PARAMS}/${id}`, data).pipe(
      tap(res => this._parametros.update(list => list.map(p => p.id === id ? res : p))),
      catchError(() => { this._parametros.update(l => l.map(p => p.id === id ? updated : p)); return of(updated); }),
    );
  }

  deleteParametro(id: string): Observable<void> {
    if (environment.useMockData) {
      this._parametros.update(list => list.filter(p => p.id !== id));
      return of(void 0);
    }
    return this.http.delete<void>(`${this.API_PARAMS}/${id}`).pipe(
      tap(() => this._parametros.update(list => list.filter(p => p.id !== id))),
      catchError(() => { this._parametros.update(l => l.filter(p => p.id !== id)); return of(void 0); }),
    );
  }
}
