// =============================================================================
// MOCK DE PERMISSÕES POR PERFIL
// =============================================================================
// Em produção, o backend retorna `screens[]` no login.
// Este arquivo é o mock que simula essa resposta.
//
// Para adicionar uma nova tela:
//   1. Adicione o ScreenName em permissions.model.ts
//   2. Conceda para os perfis desejados aqui
//   3. Adicione o guard na rota em app.routes.ts
//   4. Adicione o item na sidebar com o mesmo `screen`
// =============================================================================

import { PerfilUsuario } from '../models/usuario.model';
import { ScreenName } from '../models/permissions.model';

/**
 * Mapa de permissões por perfil.
 * Substitua por chamada real: GET /api/auth/me/permissions
 */
export const MOCK_PERMISSIONS: Record<PerfilUsuario, ScreenName[]> = {
  admin: [
    'home',
    'usuarios',
    'perfis',
    'perfil',
    'config.telas',
    'config.menus',
    'notificacoes.admin',
    'parametros',
    'parametros.grupos',
  ],

  gerente: [
    'home',
    'usuarios',
    'perfis',
    'perfil',
    'notificacoes.admin',
    'parametros',
  ],

  tecnico: [
    'home',
    'perfil',
  ],

  visualizador: [
    'home',
    'perfil',
  ],
};
