import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { CapturedPhoto } from 'ui-lib';
import { environment } from '../../../environments/environment';

export type TipoMidia = 'FOTO' | 'DOCUMENTO' | 'FOTO_REDE_SOCIAL';

export interface FotoBackend {
  id: string;
  dadosBase64: string;
  mimeType: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  entidadeTipo: string;
  entidadeId: string;
  tipo: TipoMidia;
  descricao?: string;
  etapa?: string;
  ordem?: number;
  criadoPor?: string;
  criadoEm?: string;
}

@Injectable({ providedIn: 'root' })
export class FotosService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/fotos`;

  /** Converte CapturedPhoto (câmera/galeria) para base64 e salva */
  uploadFoto(
    photo: CapturedPhoto,
    entidadeTipo: string,
    entidadeId: string,
    tipo: TipoMidia = 'FOTO'
  ): Observable<{ data: FotoBackend }> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        const body = {
          dadosBase64:  reader.result as string,
          mimeType:     photo.file.type || 'image/jpeg',
          nomeArquivo:  photo.file.name,
          tamanhoBytes: photo.file.size,
          entidadeTipo,
          entidadeId,
          tipo,
          descricao: photo.description,
          etapa:     photo.stage,
        };
        this.http.post<{ data: FotoBackend }>(this.API, body)
          .subscribe({ next: v => { observer.next(v); observer.complete(); }, error: e => observer.error(e) });
      };
      reader.readAsDataURL(photo.file);
    });
  }

  /** Converte qualquer File para base64 e salva com o tipo especificado */
  uploadArquivo(
    file: File,
    entidadeTipo: string,
    entidadeId: string,
    tipo: TipoMidia,
    etapa?: string
  ): Observable<{ data: FotoBackend }> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        const body = {
          dadosBase64:  reader.result as string,
          mimeType:     file.type || 'application/octet-stream',
          nomeArquivo:  file.name,
          tamanhoBytes: file.size,
          entidadeTipo,
          entidadeId,
          tipo,
          etapa,
        };
        this.http.post<{ data: FotoBackend }>(this.API, body)
          .subscribe({ next: v => { observer.next(v); observer.complete(); }, error: e => observer.error(e) });
      };
      reader.readAsDataURL(file);
    });
  }

  /** Converte File genérico (documento) para base64 e salva */
  uploadDocumento(
    file: File,
    entidadeTipo: string,
    entidadeId: string,
    etapa?: string
  ): Observable<{ data: FotoBackend }> {
    return this.uploadArquivo(file, entidadeTipo, entidadeId, 'DOCUMENTO', etapa);
  }

  /** Lista todas as mídias de uma entidade (ou filtra por tipo) */
  list(
    entidadeTipo: string,
    entidadeId: string,
    tipoMidia?: TipoMidia
  ): Observable<{ data: FotoBackend[] }> {
    let url = `${this.API}?entidadeTipo=${entidadeTipo}&entidadeId=${entidadeId}`;
    if (tipoMidia) url += `&tipoMidia=${tipoMidia}`;
    return this.http.get<{ data: FotoBackend[] }>(url)
      .pipe(catchError(() => of({ data: [] })));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`)
      .pipe(catchError(() => of(void 0)));
  }
}
