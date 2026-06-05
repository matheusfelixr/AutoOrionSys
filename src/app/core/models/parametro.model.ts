// =============================================================================
// PARÂMETROS DO SISTEMA
// Configurações globais parametrizáveis do sistema.
// Gerenciadas via Configurações → Parâmetros.
//
// Convenção de nomenclatura: camelCase com prefixo 'prm'
// Ex: prmArredondamento, prmMoeda, prmProgressoAlerta
// =============================================================================

export type TipoParametro = 'texto' | 'numero' | 'booleano' | 'lista';

export interface GrupoParametro {
  id: string;
  nome: string;
  descricao: string;
  ordem: number;
  ativo: boolean;
}

export interface Parametro {
  id: string;
  /** Identificador único no sistema. Ex: prmArredondamento */
  nome: string;
  descricao: string;
  grupoId: string;
  valor: string;
  /** Tipo do valor — define o editor usado na UI */
  tipo: TipoParametro;
  /** Opções disponíveis para tipo 'lista' */
  opcoes?: string[];
  ativo: boolean;
}
