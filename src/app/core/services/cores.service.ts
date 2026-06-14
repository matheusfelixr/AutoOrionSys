import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Cor } from '../models/cor.model';
import { environment } from '../../../environments/environment';

export interface CoresPage {
  content: Cor[];
  totalElements: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class CoresService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/cores`;

  getAll(filtros: { busca?: string; page?: number; size?: number } = {}): Observable<CoresPage> {
    if (environment.useMockData) {
      return of({ content: [], totalElements: 0, totalPages: 1, page: 0, pageSize: 20 });
    }
    let params = new HttpParams()
      .set('busca',  filtros.busca  ?? '')
      .set('page',   String(filtros.page  ?? 0))
      .set('size',   String(filtros.size  ?? 20));
    return this.http.get<any>(this.base, { params }).pipe(
      map(r => ({
        content:       r.data ?? [],
        totalElements: r.total ?? 0,
        totalPages:    r.totalPages ?? 1,
        page:          r.page ?? 0,
        pageSize:      r.pageSize ?? 20,
      }))
    );
  }

  getAllAtivas(): Observable<Cor[]> {
    if (environment.useMockData) return of([]);
    return this.http.get<any>(`${this.base}/all`).pipe(map(r => r.data ?? []));
  }

  getById(id: string): Observable<Cor> {
    return this.http.get<any>(`${this.base}/${id}`).pipe(map(r => r.data));
  }

  create(cor: Partial<Cor>): Observable<Cor> {
    return this.http.post<any>(this.base, cor).pipe(map(r => r.data));
  }

  update(id: string, cor: Partial<Cor>): Observable<Cor> {
    return this.http.put<any>(`${this.base}/${id}`, cor).pipe(map(r => r.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
