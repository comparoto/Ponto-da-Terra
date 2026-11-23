/**
 * Conteúdo da Central de Orientação ao Artesão (HU15).
 *
 * ⚠ ATENÇÃO EQUIPE: estas informações são um ponto de partida e PRECISAM ser conferidas
 * nos canais oficiais (ADEPE, Programa do Artesanato Brasileiro, Portal do Empreendedor,
 * SEFAZ-PE) antes da entrega final. Endereços, horários e regras mudam com frequência,
 * por isso aqui não há endereços físicos inventados: cada polo indica onde procurar.
 */

export type Trilha = { id: string; titulo: string; passos: string[] };

export const TRILHAS: Trilha[] = [
  {
    id: 'carteira',
    titulo: 'Carteira Nacional do Artesão (SICAB / PAB)',
    passos: [
      'A Carteira Nacional do Artesão é emitida no âmbito do Programa do Artesanato Brasileiro (PAB), a partir do cadastro no SICAB (Sistema de Informações Cadastrais do Artesanato Brasileiro).',
      'Em Pernambuco, o atendimento é feito pela coordenação estadual do artesanato. Procure o posto de atendimento do seu polo (veja abaixo) para saber as datas de cadastramento.',
      'Leve documento de identidade com foto, CPF e comprovante de residência, além de peças ou fotos do seu processo produtivo.',
      'Normalmente há uma avaliação da sua técnica (a "prova de habilidade"), em que você demonstra como produz a peça.',
      'Com a carteira, você pode participar de feiras e programas oficiais de apoio ao artesanato.',
    ],
  },
  {
    id: 'mei',
    titulo: 'Formalização como MEI (Microempreendedor Individual)',
    passos: [
      'A formalização como MEI é gratuita e feita on-line pelo Portal do Empreendedor, com uma conta gov.br.',
      'Escolha a ocupação que corresponde ao seu trabalho artesanal e informe o endereço do ateliê.',
      'Depois de formalizado, você passa a ter CNPJ e pode emitir nota fiscal.',
      'O MEI paga uma contribuição mensal fixa (DAS) e tem um limite de faturamento anual: confira os valores atualizados no Portal do Empreendedor.',
    ],
  },
  {
    id: 'fiscal',
    titulo: 'ICMS e emissão de nota fiscal',
    passos: [
      'As regras de ICMS para a venda de artesanato podem ter tratamento diferenciado: consulte a SEFAZ-PE ou um contador antes de vender em escala.',
      'Como MEI, você emite nota fiscal de serviço/produto conforme as regras do seu município e do estado.',
      'Guarde os comprovantes das suas vendas feitas pela plataforma: eles ajudam na declaração anual do MEI.',
    ],
  },
];

export type PoloOrientacao = { polo: string; cidades: string[]; ondeProcurar: string };

export const POLOS: PoloOrientacao[] = [
  {
    polo: 'Região Metropolitana do Recife',
    cidades: ['Recife', 'Olinda', 'Jaboatão dos Guararapes', 'Paulista'],
    ondeProcurar: 'Coordenação estadual do artesanato (ADEPE) e Centro de Artesanato de Pernambuco, no Recife.',
  },
  {
    polo: 'Agreste',
    cidades: ['Caruaru', 'Bezerros', 'Pesqueira', 'Garanhuns'],
    ondeProcurar: 'Centro de Artesanato de Pernambuco em Bezerros e secretarias municipais de cultura/turismo (ex.: Caruaru).',
  },
  {
    polo: 'Zona da Mata',
    cidades: ['Goiana', 'Tracunhaém', 'Nazaré da Mata', 'Vitória de Santo Antão'],
    ondeProcurar: 'Secretaria municipal de cultura/turismo da sua cidade, que encaminha para o cadastramento estadual.',
  },
  {
    polo: 'Sertão',
    cidades: ['Petrolina', 'Serra Talhada', 'Arcoverde', 'Triunfo'],
    ondeProcurar: 'Secretaria municipal de cultura/turismo da sua cidade e as ações itinerantes de cadastramento do estado.',
  },
];

export const LINKS_OFICIAIS = [
  { rotulo: 'Portal do Empreendedor (formalização como MEI)', url: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor' },
  { rotulo: 'ADEPE — Agência de Desenvolvimento Econômico de Pernambuco', url: 'https://www.adepe.pe.gov.br' },
];

/** Os ids precisam ser os mesmos aceitos pela API (backend: ITENS_CHECKLIST). */
export const ITENS_CHECKLIST: { id: string; rotulo: string }[] = [
  { id: 'rg', rotulo: 'Documento de identidade com foto (RG ou CNH)' },
  { id: 'cpf', rotulo: 'CPF' },
  { id: 'comprovante-residencia', rotulo: 'Comprovante de residência atualizado' },
  { id: 'fotos-processo', rotulo: 'Fotos do seu processo produtivo' },
  { id: 'pecas-amostra', rotulo: 'Peças (ou fotos) para a avaliação de habilidade' },
  { id: 'conta-gov-br', rotulo: 'Conta gov.br criada (necessária para o MEI)' },
];
