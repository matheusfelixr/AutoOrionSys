import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map, throwError } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { MOCK_USUARIOS } from '../data/mock-data';
import { environment } from '../../../environments/environment';

/** Parâmetros de busca paginada — enviados ao backend */
interface UsuarioPageParams {
  busca?: string;
  perfil?: string;
  status?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

interface ApiPage<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/usuarios`;

  private readonly _usuarios = signal<Usuario[]>(environment.useMockData ? [...MOCK_USUARIOS] : []);
  readonly usuarios = this._usuarios.asReadonly();

  getAll(params: UsuarioPageParams = {}): Observable<Usuario[]> {
    if (environment.useMockData) {
      return of([...MOCK_USUARIOS]).pipe(tap(d => this._usuarios.set(d)));
    }

    const query = new URLSearchParams({
      page:    String(params.page    ?? 0),
      size:    String(params.size    ?? 100),
      sortBy:  params.sortBy  ?? 'nome',
      sortDir: params.sortDir ?? 'asc',
      busca:   params.busca   ?? '',
      perfil:  params.perfil  ?? '',
      status:  params.status  ?? '',
    });

    return this.http
      .get<ApiPage<Usuario>>(`${this.API}?${query}`)
      .pipe(
        tap(resp => this._usuarios.set(resp.data ?? [])),
        map(resp => resp.data ?? []),
        catchError(() => of(this._usuarios())),
      );
  }

  filteredUsuarios(busca: string, perfil: string, status: string): Usuario[] {
    const buscaLower = busca.toLowerCase();
    return this._usuarios().filter(u => {
      const matchBusca = !busca || u.nome.toLowerCase().includes(buscaLower) || u.email.toLowerCase().includes(buscaLower) || u.cargo.toLowerCase().includes(buscaLower);
      const matchPerfil = !perfil || u.perfil === perfil;
      const matchStatus = !status || u.status === status;
      return matchBusca && matchPerfil && matchStatus;
    });
  }

  getById(id: string): Usuario | undefined {
    return this._usuarios().find(u => u.id === id);
  }

  create(data: Partial<Usuario>): Observable<Usuario> {
    const payload = { ...data, senha: 'flexsys123' };
    if (environment.useMockData) {
      const novo: Usuario = { id: `u-${Date.now()}`, nome: data.nome ?? '', email: data.email ?? '',
        cargo: data.cargo ?? '', perfil: data.perfil ?? 'visualizador', status: data.status ?? 'ativo',
        telefone: data.telefone, dataCadastro: new Date() };
      this._usuarios.update(list => [...list, novo]);
      return of(novo);
    }
    return this.http.post<{data: Usuario}>(`${this.API}`, payload).pipe(
      tap(resp => this._usuarios.update(list => [...list, resp.data])),
      map(resp => resp.data),
      catchError(() => throwError(() => new Error('Erro ao criar usuário'))),
    );
  }

  update(id: string, data: Partial<Usuario>): Observable<Usuario> {
    const atual = this._usuarios().find(u => u.id === id)!;
    const updated = { ...atual, ...data };
    if (environment.useMockData) {
      this._usuarios.update(list => list.map(u => u.id === id ? updated : u));
      return of(updated);
    }
    return this.http.put<{data: Usuario}>(`${this.API}/${id}`, data).pipe(
      tap(resp => this._usuarios.update(list => list.map(u => u.id === id ? resp.data : u))),
      map(resp => resp.data),
      catchError(() => throwError(() => new Error('Erro ao atualizar usuário'))),
    );
  }

  delete(id: string): Observable<void> {
    if (environment.useMockData) {
      this._usuarios.update(list => list.filter(u => u.id !== id));
      return of(void 0);
    }
    return this.http.delete<void>(`${this.API}/${id}`).pipe(
      tap(() => this._usuarios.update(list => list.filter(u => u.id !== id))),
      catchError(() => throwError(() => new Error('Erro ao excluir usuário'))),
    );
  }
}
