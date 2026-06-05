// =============================================================================
// VEICULO MODEL
// =============================================================================

export type StatusVeiculo = 'disponivel' | 'reservado' | 'vendido' | 'manutencao';

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  anoFabricacao: number;
  cor: string;
  status: StatusVeiculo;
  km: number;
  preco?: number;
  clienteNome?: string;
  responsavelId: string;
  responsavelNome: string;
  descricao?: string;
}
