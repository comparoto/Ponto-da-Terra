import { MetodoPagamento, StatusCadastroArtesao, StatusCompra, StatusPagamento, StatusPedido, StatusUsuario, TipoUsuario } from '@prisma/client';
import { z } from '../shared/zod';

/**
 * Formato das respostas da API (o que o Swagger mostra e o que os testes de contrato conferem).
 *
 * Descrevem o JSON que sai pela rede: datas chegam como texto ISO e valores em reais como número.
 * Os enums vêm direto do Prisma, então acompanham o banco automaticamente.
 * `tests/contrato-respostas.test.ts` chama as rotas de verdade e compara a resposta com estes
 * schemas, inclusive campos a mais ou a menos, para a documentação não se afastar do código.
 */

const data = () => z.string().datetime();
const dataOuNulo = () => z.string().datetime().nullable();
const texto = () => z.string().nullable();

// ───────────── Usuários e cadastros (admin) ─────────────

export const usuarioAdminResposta = z
  .object({
    id: z.string().uuid(),
    nome: z.string(),
    email: z.string(),
    tipo: z.nativeEnum(TipoUsuario),
    status: z.nativeEnum(StatusUsuario),
    motivoSuspensao: texto(),
    dataCadastro: data(),
    artesaoId: z.string().uuid().nullable(),
    produtosAtivos: z.number().int(),
    statusCadastro: z.nativeEnum(StatusCadastroArtesao).nullable(),
  })
  .openapi('UsuarioAdmin');

export const cadastroArtesaoResposta = z
  .object({
    artesaoId: z.string().uuid(),
    usuarioId: z.string().uuid(),
    nome: z.string(),
    email: z.string(),
    cidade: z.string(),
    estado: z.string(),
    especialidade: texto(),
    biografia: texto(),
    statusCadastro: z.nativeEnum(StatusCadastroArtesao),
    motivoCadastro: texto(),
    pecasCadastradas: z.number().int(),
    dataCadastro: data(),
  })
  .openapi('CadastroArtesao');

const contagemPorStatus = z.record(z.string(), z.number().int());
const pecaMaisVendida = z.object({ produtoId: z.string().uuid(), titulo: z.string(), quantidade: z.number().int() });

export const metricasAdminResposta = z
  .object({
    periodo: z.object({ de: data(), ate: data() }),
    receitaBruta: z.number(),
    pedidosPagos: z.number().int(),
    pedidosConcluidos: z.number().int(),
    novosArtesaos: z.number().int(),
    ticketMedio: z.number(),
    artesaosMaisAtivos: z.array(z.object({ artesaoId: z.string().uuid(), nome: z.string(), receita: z.number(), pedidos: z.number().int() })),
    pecasMaisVendidas: z.array(pecaMaisVendida),
    termosMaisBuscados: z.array(z.object({ termo: z.string(), buscas: z.number().int() })),
    pedidosPorStatus: contagemPorStatus,
    receitaPorDia: z.array(z.object({ dia: data(), receita: z.number(), pedidos: z.number().int() })),
    geradoEmMs: z.number().int(),
  })
  .openapi('MetricasAdmin');

// ───────────── Painel do artesão ─────────────

export const indicadoresArtesaoResposta = z
  .object({
    periodo: z.object({ de: data(), ate: data() }),
    faturamentoTotal: z.number(),
    pedidosPagos: z.number().int(),
    pedidosConcluidos: z.number().int(),
    taxaConclusao: z.number(),
    faturamentoPorMes: z.array(z.object({ mes: z.string(), receita: z.number(), pedidos: z.number().int() })),
    pecasMaisVendidas: z.array(pecaMaisVendida),
    pedidosPorPolo: z.array(z.object({ polo: z.string(), pedidos: z.number().int(), receita: z.number() })),
    mensagem: texto(),
  })
  .openapi('IndicadoresArtesao');

export const checklistResposta = z
  .object({
    itensDisponiveis: z.array(z.string()),
    itensConcluidos: z.array(z.string()),
    percentualConclusao: z.number().int(),
    atualizadoEm: dataOuNulo(),
  })
  .openapi('ChecklistProgresso');

// ───────────── Avaliações e mensagens ─────────────

export const avaliacaoCriadaResposta = z
  .object({
    avaliacao: z.object({
      id: z.string().uuid(),
      consumidorId: z.string().uuid(),
      produtoId: z.string().uuid(),
      nota: z.number().int(),
      comentario: texto(),
      dataAvaliacao: data(),
    }),
    mediaProduto: z.number(),
    totalAvaliacoes: z.number().int(),
    mediaArtesao: z.number(),
  })
  .openapi('AvaliacaoCriada');

export const avaliacoesProdutoResposta = z
  .object({
    media: z.number(),
    total: z.number().int(),
    avaliacoes: z.array(z.object({ id: z.string().uuid(), nota: z.number().int(), comentario: texto(), data: data(), autor: z.string() })),
  })
  .openapi('AvaliacoesDoProduto');

export const mensagemEnviadaResposta = z.object({ id: z.string().uuid(), dataEnvio: data() }).openapi('MensagemEnviada');

export const mensagemRecebidaResposta = z
  .object({
    id: z.string().uuid(),
    mensagem: z.string(),
    dataEnvio: data(),
    produto: z.object({ id: z.string().uuid(), titulo: z.string() }),
    comprador: z.object({ nome: z.string(), email: z.string() }),
  })
  .openapi('MensagemRecebida');

// ───────────── Compras e pedidos ─────────────

const enderecoResposta = z.object({
  cep: z.string(),
  rua: z.string(),
  numero: z.string(),
  complemento: texto(),
  bairro: texto(),
  cidade: z.string(),
  estado: z.string(),
});

export const compraResposta = z
  .object({
    codigo: z.string(),
    /** Hora do servidor, para a contagem regressiva do PIX não depender do relógio do aparelho */
    agoraServidor: data(),
    status: z.nativeEnum(StatusCompra),
    criadoEm: data(),
    reservaExpiraEm: data(),
    valorProdutos: z.number(),
    valorFrete: z.number(),
    valorTotal: z.number(),
    endereco: enderecoResposta,
    pagamento: z
      .object({
        metodo: z.nativeEnum(MetodoPagamento),
        status: z.nativeEnum(StatusPagamento),
        parcelas: z.number().int(),
        valorParcela: z.number(),
        codigoTransacao: z.string(),
        expiraEm: dataOuNulo(),
        pixCopiaECola: texto(),
        pixQrCode: texto(),
        linhaDigitavel: texto(),
        boletoUrl: texto(),
        cartaoFinal: texto(),
        motivoRecusa: texto(),
      })
      .nullable(),
    pedidos: z.array(
      z.object({
        id: z.string().uuid(),
        status: z.nativeEnum(StatusPedido),
        artesao: z.object({ id: z.string().uuid(), nome: z.string() }),
        valorProdutos: z.number(),
        valorFrete: z.number(),
        valorTotal: z.number(),
        itens: z.array(z.object({ produtoId: z.string().uuid(), titulo: z.string(), quantidade: z.number().int(), precoUnitario: z.number() })),
      }),
    ),
  })
  .openapi('Compra');

/** Pedido: `comprador` aparece só para artesão e admin; `avaliado` só para o comprador; `intervencoes` só para o admin. */
export const pedidoResposta = z
  .object({
    id: z.string().uuid(),
    codigoCompra: z.string(),
    status: z.nativeEnum(StatusPedido),
    dataPedido: data(),
    valorProdutos: z.number(),
    valorFrete: z.number(),
    valorTotal: z.number(),
    atrasado: z.boolean(),
    diasEmAberto: z.number().int(),
    artesao: z.object({ id: z.string().uuid(), nome: z.string(), cidade: z.string(), estado: z.string() }),
    comprador: z.object({ nome: z.string(), email: z.string() }).optional(),
    pagamento: z.object({ metodo: z.nativeEnum(MetodoPagamento), status: z.nativeEnum(StatusPagamento), parcelas: z.number().int() }).nullable(),
    itens: z.array(
      z.object({
        produtoId: z.string().uuid(),
        titulo: z.string(),
        quantidade: z.number().int(),
        precoUnitario: z.number(),
        subtotal: z.number(),
        imagemUrl: texto(),
        avaliado: z.boolean().optional(),
      }),
    ),
    entrega: z
      .object({
        codigoRastreio: texto(),
        transportadora: texto(),
        urlRastreio: texto(),
        dataPostagem: dataOuNulo(),
        dataPrevista: dataOuNulo(),
        endereco: enderecoResposta,
      })
      .nullable(),
    linhaDoTempo: z.array(z.object({ etapa: z.string(), status: z.nativeEnum(StatusPedido), data: dataOuNulo(), concluida: z.boolean(), atual: z.boolean() })),
    historico: z.array(z.object({ status: z.nativeEnum(StatusPedido), criadoEm: data() })),
    intervencoes: z.array(z.object({ id: z.string().uuid(), nota: z.string(), adminId: z.string().uuid(), criadoEm: data() })).optional(),
  })
  .openapi('Pedido');

// ───────────── Fila ─────────────

/** O evento processado devolve a notificação gerada ou o resultado da otimização de uma foto. */
export const eventoProcessadoResposta = z
  .union([
    z.object({ notificacaoId: z.string().uuid(), reenviado: z.boolean() }),
    z.object({ processada: z.boolean(), url: z.string().optional(), bytesAntes: z.number().int().optional(), bytesDepois: z.number().int().optional() }),
  ])
  .openapi('EventoProcessado');

/** Conteúdo livre de uma notificação (muda conforme o tipo do evento): um objeto JSON qualquer. */
export const payloadNotificacao = z.record(z.string(), z.unknown());

/** Campo de arquivo em formulário multipart (foto enviada) */
export const arquivoBinario = z.string().openapi({ type: 'string', format: 'binary' });
