import { Injectable } from '@angular/core';

export interface RelatorioColunas {
  header: string;
  field: string;
  format?: (val: any) => string;
}

@Injectable({ providedIn: 'root' })
export class RelatorioService {

  /** Exporta para CSV e faz download */
  exportarCSV(dados: Record<string, any>[], colunas: RelatorioColunas[], nomeArquivo: string): void {
    const header = colunas.map(c => c.header).join(';');
    const linhas = dados.map(row =>
      colunas.map(c => {
        const val = row[c.field] ?? '';
        const formatted = c.format ? c.format(val) : String(val);
        return `"${formatted.replace(/"/g, '""')}"`;
      }).join(';')
    );
    const csv = [header, ...linhas].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nomeArquivo}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Abre janela de impressão com tabela formatada */
  imprimirTabela(
    titulo: string,
    subtitulo: string,
    dados: Record<string, any>[],
    colunas: RelatorioColunas[]
  ): void {
    const linhas = dados.map(row =>
      `<tr>${colunas.map(c => {
        const val = row[c.field] ?? '';
        const formatted = c.format ? c.format(val) : String(val);
        return `<td>${formatted}</td>`;
      }).join('')}</tr>`
    ).join('');

    const html = `
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>${titulo}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        p { color: #666; margin: 0 0 16px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #2B6CB0; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
        td { padding: 7px 10px; border-bottom: 1px solid #E2E8F0; font-size: 11px; }
        tr:nth-child(even) td { background: #F7FAFC; }
        @media print { @page { margin: 1cm; } }
      </style>
      </head><body>
      <h1>${titulo}</h1>
      <p>${subtitulo} — Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      <table>
        <thead><tr>${colunas.map(c => `<th>${c.header}</th>`).join('')}</tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  }
}
