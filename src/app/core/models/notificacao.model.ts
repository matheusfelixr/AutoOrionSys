export type NotificacaoTipo = 'info' | 'sucesso' | 'aviso' | 'erro';
export type NotificacaoDestinatario = 'todos' | 'perfil' | 'usuario';

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: NotificacaoTipo;
  destinatario: NotificacaoDestinatario;
  perfilAlvo?: string;    // used when destinatario === 'perfil'
  usuarioAlvo?: string;   // used when destinatario === 'usuario' (userId)
  link?: string;          // optional navigation path e.g. '/obras'
  criadaEm: Date;
  criadaPor: string;      // userId of creator
  expiresAt?: Date;
  ativa: boolean;
}

// Per-user read status — stored separately
export interface NotificacaoLeitura {
  notificacaoId: string;
  usuarioId: string;
  lidaEm: Date;
}
