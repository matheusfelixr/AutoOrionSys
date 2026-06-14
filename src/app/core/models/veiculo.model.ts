export interface Veiculo {
  id?: string;
  placa: string;
  modelo: string;
  marca: string;
  anoFabricacao?: number;
  cor?: string;
  km?: number;
  chassi?: string;
  renavam?: string;
  numeroMotor?: string;
  podeVenderMotor?: boolean;
  baixado?: boolean;
  responsavelId?: string;
  responsavelNome?: string;
  descricao?: string;
  ativo?: boolean;
  criadoEm?: string;
  criadoPor?: string;
  atualizadoEm?: string;
  atualizadoPor?: string;
}
