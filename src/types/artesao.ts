export interface Artesao {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  imagemUrl: string;
  biografia?: string;
  especialidade?: string;
  nomeAtelie?: string;
  poloRegional?: string;
  fotoAtelieUrl?: string;
  tecnicasPrincipais?: string[];
  avaliacaoMedia?: number;
}
