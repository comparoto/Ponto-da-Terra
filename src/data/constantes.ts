// Listas fixas usadas pelas telas. Os dados de artesãos e peças vêm da API (backend/), não mais de mocks.

export const ESTADOS_BRASILEIROS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const AREAS_ARTESANATO = [
  'Cerâmica e barro',
  'Escultura e madeira',
  'Renda e têxtil',
  'Cestaria e palha',
  'Xilogravura',
  'Joalheria e acessórios',
  'Pintura e artes visuais',
  'Outro',
] as const;

export const DESTAQUES = [
  { titulo: 'Feito à mão', texto: 'Peças criadas por artesãos que mantêm vivas técnicas e saberes tradicionais.' },
  { titulo: 'De Pernambuco', texto: 'Conheça histórias e trabalhos de diferentes regiões do nosso estado.' },
  { titulo: 'Compra consciente', texto: 'Descubra criações autorais e encontre uma peça com significado.' },
] as const;

