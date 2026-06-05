// =============================================================================
// TELA DO SISTEMA — Model
// Representa uma tela/funcionalidade do sistema que pode ser
// associada a perfis de acesso. É a fonte de verdade para o
// controle de permissões por tela.
// =============================================================================

export interface TelaSistema {
  id: string;
  /** Identificador único usado no sistema de permissões (ex: 'usuarios', 'obras.diario') */
  screenName: string;
  nome: string;
  descricao: string;
  /** ID do MenuGrupo ao qual esta tela pertence */
  menuId: string;
  /** Se definido, esta tela é filha de outro item (ex: 'obras-group') */
  parentScreenName?: string;
  /** Ícone apenas para itens de nível superior (sem parentScreenName) */
  icone?: string;
  ordem: number;
  ativo: boolean;
}

export const MODULOS_DISPONIVEIS = ['Principal', 'Cadastros', 'Configurações', 'Conta'] as const;
export type Modulo = typeof MODULOS_DISPONIVEIS[number];
