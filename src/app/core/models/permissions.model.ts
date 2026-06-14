// =============================================================================
// PERMISSIONS MODEL
// Catálogo de telas do sistema com seus identificadores únicos.
// O backend retorna quais `ScreenName[]` cada usuário pode acessar.
// =============================================================================

/**
 * Nome único de cada tela do sistema.
 * Usado como contrato entre front-end e back-end.
 *
 * Convenção de nomenclatura:
 *   - Módulo principal:     'home', 'usuarios'
 *   - Sub-tela de módulo:   'config.telas', 'config.menus'
 *   - Configurações:        'config.empresa', 'config.integracao'
 */
export type ScreenName =
  | 'home'
  | 'veiculos'
  | 'marcas'
  | 'usuarios'
  | 'perfis'
  | 'perfil'
  | 'config.telas'
  | 'config.menus'
  | 'notificacoes.admin'
  | 'parametros'
  | 'parametros.grupos';

// Futuramente, adicionar aqui novas telas:
//   | 'relatorios'
//   | 'financeiro'
//   | 'config.empresa'

/**
 * Ações possíveis dentro de uma tela.
 * 'ver'     → acessa a tela/listagem
 * 'criar'   → vê/usa o botão de novo cadastro
 * 'editar'  → vê/usa o botão de edição
 * 'excluir' → vê/usa o botão de exclusão
 */
export type ActionName = 'ver' | 'criar' | 'editar' | 'excluir';

/**
 * Mapa de permissões granulares por tela.
 * Ex: { veiculos: ['ver','criar','editar'], marcas: ['ver'] }
 */
export type ScreenActions = Partial<Record<string, ActionName[]>>;

/**
 * Resposta do backend após login.
 * Em produção, vem junto com o token JWT.
 */
export interface AuthResponse {
  user: {
    id: string;
    nome: string;
    email: string;
  };
  token: string;
  screens: ScreenName[];
  permissoes?: ScreenActions;
}
