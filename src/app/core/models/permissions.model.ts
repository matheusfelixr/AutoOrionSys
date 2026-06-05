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
}
