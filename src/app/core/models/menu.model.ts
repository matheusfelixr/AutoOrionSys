// =============================================================================
// MENU MODEL
// Define os grupos de seção do menu lateral do sistema.
// Gerenciado via Configurações → Menus.
//
// A sidebar é construída dinamicamente a partir de MenuGrupo + TelaSistema:
//   MenuGrupo  → label da seção  (ex: "CADASTROS")
//     TelaSistema (parentScreenName === undefined) → item pai com ícone
//       TelaSistema (parentScreenName === 'obras-group') → item filho
// =============================================================================

export interface MenuGrupo {
  id: string;
  nome: string;   // label do grupo no sidebar (ex: 'Principal', 'Cadastros')
  icone: string;  // ícone decorativo do cabeçalho da seção
  ordem: number;
  ativo: boolean;
}
