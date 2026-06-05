export type PerfilUsuario = 'admin' | 'gerente' | 'tecnico' | 'visualizador';
export type StatusUsuario = 'ativo' | 'inativo';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  perfil: PerfilUsuario;
  status: StatusUsuario;
  telefone?: string;
  avatarUrl?: string;
  dataCadastro: Date;
  ultimoAcesso?: Date;
}
