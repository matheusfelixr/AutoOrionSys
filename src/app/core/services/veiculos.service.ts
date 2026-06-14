import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Veiculo } from '../models/veiculo.model';
import { environment } from '../../../environments/environment';

export interface VeiculosPage {
  content: Veiculo[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface VeiculosFiltros {
  busca?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

@Injectable({ providedIn: 'root' })
export class VeiculosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/veiculos`;

  getAll(filtros: VeiculosFiltros = {}): Observable<VeiculosPage> {
    let params = new HttpParams()
      .set('busca',   filtros.busca   ?? '')
      .set('page',    filtros.page    ?? 0)
      .set('size',    filtros.size    ?? 10)
      .set('sortBy',  filtros.sortBy  ?? 'modelo')
      .set('sortDir', filtros.sortDir ?? 'asc');

    return this.http.get<any>(this.base, { params }).pipe(
      map(r => ({
        content:       Array.isArray(r.data) ? r.data : (r.data?.content ?? []),
        totalElements: r.total      ?? r.data?.totalElements ?? 0,
        totalPages:    r.totalPages ?? r.data?.totalPages    ?? 1,
        number:        r.page       ?? r.data?.number        ?? 0,
        size:          r.pageSize   ?? r.data?.size          ?? 10,
      } as VeiculosPage))
    );
  }

  getById(id: string): Observable<Veiculo> {
    return this.http.get<any>(`${this.base}/${id}`).pipe(map(r => r.data ?? r));
  }

  create(veiculo: Partial<Veiculo>): Observable<Veiculo> {
    return this.http.post<any>(this.base, veiculo).pipe(map(r => r.data ?? r));
  }

  update(id: string, veiculo: Partial<Veiculo>): Observable<Veiculo> {
    return this.http.put<any>(`${this.base}/${id}`, veiculo).pipe(map(r => r.data ?? r));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<any>(`${this.base}/${id}`).pipe(map(() => void 0));
  }
}
