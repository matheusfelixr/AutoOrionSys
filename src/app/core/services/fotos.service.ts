import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { CapturedPhoto } from 'ui-lib';
import { environment } from '../../../environments/environment';

export interface FotoBackend {
  id: string;
  dadosBase64: string;
  mimeType: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  entidadeTipo: string;
  entidadeId: string;
  descricao: string;
  etapa?: string;
  criadoPor?: string;
  criadoEm: string;
}

@Injectable({ providedIn: 'root' })
export class FotosService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/fotos`;

  /**
   * Converte um CapturedPhoto (File) para base64 e envia ao backend.
   * Retorna o id da foto salva.
   */
  upload(photo: CapturedPhoto, entidadeTipo: string, entidadeId: string): Observable<{ data: FotoBackend }> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const body = {
          dadosBase64:  base64,
          mimeType:     photo.file.type || 'image/jpeg',
          nomeArquivo:  photo.file.name,
          tamanhoBytes: photo.file.size,
          entidadeTipo,
          entidadeId,
          descricao:    photo.description,
          etapa:        photo.stage,
        };
        this.http.post<{ data: FotoBackend }>(this.API, body)
          .subscribe({ next: v => { observer.next(v); observer.complete(); }, error: e => observer.error(e) });
      };
      reader.readAsDataURL(photo.file);
    });
  }

  /** Lista fotos de uma entidade */
  list(entidadeTipo: string, entidadeId: string): Observable<{ data: FotoBackend[] }> {
    return this.http.get<{ data: FotoBackend[] }>(
      `${this.API}?tipo=${entidadeTipo}&entidadeId=${entidadeId}`
    ).pipe(catchError(() => of({ data: [] })));
  }

  /** Exclui uma foto */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`)
      .pipe(catchError(() => of(void 0)));
  }
}
