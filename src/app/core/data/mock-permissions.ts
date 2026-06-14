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
import { ScreenName, ScreenActions } from '../models/permissions.model';

/**
 * Mapa de permissões por perfil.
 * Substitua por chamada real: GET /api/auth/me/permissions
 */
export const MOCK_PERMISSIONS: Record<PerfilUsuario, ScreenName[]> = {
  admin: [
    'home', 'veiculos', 'marcas', 'usuarios', 'perfis', 'perfil',
    'config.telas', 'config.menus', 'notificacoes.admin', 'parametros', 'parametros.grupos', 'cores',
  ],
  gerente: [
    'home', 'veiculos', 'marcas', 'cores', 'usuarios', 'perfis', 'perfil',
    'notificacoes.admin', 'parametros',
  ],
  tecnico: [
    'home', 'veiculos', 'perfil',
  ],
  visualizador: [
    'home', 'veiculos', 'perfil',
  ],
};

/**
 * Permissões granulares por perfil (mock).
 * Espelha o campo `permissoes` do PerfilAcesso no banco.
 */
export const MOCK_ACTIONS: Record<PerfilUsuario, ScreenActions> = {
  admin: {
    veiculos:          ['ver', 'criar', 'editar', 'excluir'],
    marcas:            ['ver', 'criar', 'editar', 'excluir'],
    cores:             ['ver', 'criar', 'editar', 'excluir'],
    usuarios:          ['ver', 'criar', 'editar', 'excluir'],
    perfis:            ['ver', 'criar', 'editar', 'excluir'],
    parametros:        ['ver', 'criar', 'editar', 'excluir'],
    'notificacoes.admin': ['ver', 'criar', 'excluir'],
  },
  gerente: {
    veiculos:          ['ver', 'criar', 'editar', 'excluir'],
    marcas:            ['ver', 'criar', 'editar'],
    cores:             ['ver', 'criar', 'editar'],
    usuarios:          ['ver', 'editar'],
    perfis:            ['ver'],
    parametros:        ['ver'],
    'notificacoes.admin': ['ver', 'criar'],
  },
  tecnico: {
    veiculos:          ['ver', 'criar', 'editar'],
    marcas:            ['ver'],
    cores:             ['ver'],
  },
  visualizador: {
    veiculos:          ['ver'],
    marcas:            ['ver'],
    cores:             ['ver'],
  },
};
