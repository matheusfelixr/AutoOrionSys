import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Marca } from '../models/marca.model';
import { environment } from '../../../environments/environment';

export interface MarcasPage {
  content: Marca[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface MarcasFiltros {
  busca?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

@Injectable({ providedIn: 'root' })
export class MarcasService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/marcas`;

  getAll(filtros: MarcasFiltros = {}): Observable<MarcasPage> {
    let params = new HttpParams()
      .set('busca',   filtros.busca   ?? '')
      .set('page',    filtros.page    ?? 0)
      .set('size',    filtros.size    ?? 15)
      .set('sortBy',  filtros.sortBy  ?? 'nome')
      .set('sortDir', filtros.sortDir ?? 'asc');

    return this.http.get<any>(this.base, { params }).pipe(
      map(r => ({
        content:       Array.isArray(r.data) ? r.data : (r.data?.content ?? []),
        totalElements: r.total      ?? r.data?.totalElements ?? 0,
        totalPages:    r.totalPages ?? r.data?.totalPages    ?? 1,
        number:        r.page       ?? r.data?.number        ?? 0,
        size:          r.pageSize   ?? r.data?.size          ?? 15,
      } as MarcasPage))
    );
  }

  /** Todas as marcas ativas sem paginação — para selects. */
  getAllAtivas(): Observable<Marca[]> {
    return this.http.get<any>(`${this.base}/all`).pipe(
      map(r => Array.isArray(r.data) ? r.data : [])
    );
  }

  getById(id: string): Observable<Marca> {
    return this.http.get<any>(`${this.base}/${id}`).pipe(map(r => r.data ?? r));
  }

  create(marca: Partial<Marca>): Observable<Marca> {
    return this.http.post<any>(this.base, marca).pipe(map(r => r.data ?? r));
  }

  update(id: string, marca: Partial<Marca>): Observable<Marca> {
    return this.http.put<any>(`${this.base}/${id}`, marca).pipe(map(r => r.data ?? r));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<any>(`${this.base}/${id}`).pipe(map(() => void 0));
  }
}
