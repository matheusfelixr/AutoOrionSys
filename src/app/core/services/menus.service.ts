import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { MenuGrupo } from '../models/menu.model';
import { environment } from '../../../environments/environment';

const MOCK_MENUS: MenuGrupo[] = [
  { id: 'mg1', nome: 'Principal',     icone: '📋', ordem: 1, ativo: true },
  { id: 'mg2', nome: 'Cadastros',     icone: '📂', ordem: 2, ativo: true },
  { id: 'mg3', nome: 'Configurações', icone: '⚙️', ordem: 3, ativo: true },
  { id: 'mg4', nome: 'Conta',         icone: '👤', ordem: 4, ativo: true },
];

@Injectable({ providedIn: 'root' })
export class MenusService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/menus`;

  private readonly _menus = signal<MenuGrupo[]>([...MOCK_MENUS]);
  readonly menus = this._menus.asReadonly();

  getAll(): Observable<MenuGrupo[]> {
    if (environment.useMockData) {
      return of(this._menus()).pipe(tap(d => this._menus.set(d)));
    }
    return this.http.get<{ data: MenuGrupo[] }>(this.API).pipe(
      tap(resp => this._menus.set(resp.data ?? [])),
      map(resp => resp.data ?? []),
      catchError(() => of(this._menus())),
    );
  }

  create(data: Omit<MenuGrupo, 'id'>): Observable<MenuGrupo> {
    const novo: MenuGrupo = { id: 'mg-' + Date.now(), ...data };
    this._menus.update(list => [...list, novo]);
    return of(novo);
  }

  update(id: string, data: Partial<MenuGrupo>): Observable<MenuGrupo> {
    const updated = { ...this._menus().find(g => g.id === id)!, ...data };
    this._menus.update(list => list.map(g => g.id === id ? updated : g));
    return of(updated);
  }

  delete(id: string): Observable<void> {
    this._menus.update(list => list.filter(g => g.id !== id));
    return of(void 0);
  }

  reorder(id: string, direction: 'up' | 'down'): void {
    const list = [...this._menus()].sort((a, b) => a.ordem - b.ordem);
    const idx  = list.findIndex(g => g.id === id);
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return;
    const tmp = list[idx].ordem;
    list[idx] = { ...list[idx], ordem: list[swap].ordem };
    list[swap] = { ...list[swap], ordem: tmp };
    this._menus.set(list);
  }
}
