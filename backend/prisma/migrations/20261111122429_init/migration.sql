-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('ADMIN', 'ARTESAO', 'CONSUMIDOR');

-- CreateEnum
CREATE TYPE "StatusUsuario" AS ENUM ('ATIVO', 'INATIVO', 'SUSPENSO');

-- CreateEnum
CREATE TYPE "StatusProduto" AS ENUM ('PENDENTE', 'ATIVO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('CRIADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_PRODUCAO', 'DESPACHADO', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('PIX', 'CARTAO', 'BOLETO');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('NOVO_PEDIDO', 'PRODUTO_APROVADO', 'PRODUTO_REJEITADO', 'NOVA_MENSAGEM', 'PEDIDO_ATUALIZADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "telefone" TEXT,
    "tipo" "TipoUsuario" NOT NULL,
    "status" "StatusUsuario" NOT NULL DEFAULT 'ATIVO',
    "motivoSuspensao" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consumidor" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "enderecoPadraoId" TEXT,
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consumidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Administrador" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nivelAcesso" TEXT NOT NULL DEFAULT 'PADRAO',

    CONSTRAINT "Administrador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artesao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nomeAtelie" TEXT,
    "biografia" TEXT,
    "tecnicasPrincipais" TEXT[],
    "especialidade" TEXT,
    "poloRegional" TEXT,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PE',
    "cepOrigem" TEXT,
    "fotoPerfilUrl" TEXT,
    "fotoAtelieUrl" TEXT,
    "aceitaEncomenda" BOOLEAN NOT NULL DEFAULT false,
    "avaliacaoMedia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artesao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endereco" (
    "id" TEXT NOT NULL,
    "consumidorId" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "rua" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "Endereco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaProduto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "CategoriaProduto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL,
    "artesaoId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tecnica" TEXT NOT NULL,
    "poloOrigem" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "materiaisUtilizados" TEXT,
    "dimensoes" TEXT,
    "prontaEntrega" BOOLEAN NOT NULL DEFAULT true,
    "tempoProducaoDias" INTEGER,
    "imagensUrls" TEXT[],
    "avaliacaoMedia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatusProduto" NOT NULL DEFAULT 'PENDENTE',
    "justificativaCuradoria" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estoque" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidadeDisponivel" INTEGER NOT NULL DEFAULT 0,
    "versao" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrinho" (
    "id" TEXT NOT NULL,
    "consumidorId" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrinho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCarrinho" (
    "id" TEXT NOT NULL,
    "carrinhoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "ItemCarrinho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "codigoCompra" TEXT NOT NULL,
    "consumidorId" TEXT NOT NULL,
    "artesaoId" TEXT NOT NULL,
    "dataPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorProdutos" DECIMAL(10,2) NOT NULL,
    "valorFrete" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'CRIADO',
    "reservaExpiraEm" TIMESTAMP(3),

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "artesaoId" TEXT NOT NULL,
    "tituloProduto" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoUnitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoStatusPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "status" "StatusPedido" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" TEXT,

    CONSTRAINT "HistoricoStatusPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntervencaoPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "nota" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntervencaoPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "metodo" "MetodoPagamento" NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "codigoTransacao" TEXT NOT NULL,
    "linkBoletoOuPixCopiaCola" TEXT,
    "expiraEm" TIMESTAMP(3),
    "dataProcessamento" TIMESTAMP(3),

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrega" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "enderecoId" TEXT NOT NULL,
    "codigoRastreio" TEXT,
    "transportadora" TEXT DEFAULT 'Correios',
    "dataPostagem" TIMESTAMP(3),
    "dataPrevista" TIMESTAMP(3),

    CONSTRAINT "Entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL,
    "consumidorId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "dataAvaliacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorito" (
    "id" TEXT NOT NULL,
    "consumidorId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,

    CONSTRAINT "Favorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemContato" (
    "id" TEXT NOT NULL,
    "consumidorId" TEXT NOT NULL,
    "artesaoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "dataEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemContato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificacaoLog" (
    "id" TEXT NOT NULL,
    "artesaoId" TEXT,
    "usuarioId" TEXT,
    "pedidoId" TEXT,
    "tipoEvento" "TipoEvento" NOT NULL,
    "payload" JSONB,
    "enviadoComSucesso" BOOLEAN NOT NULL DEFAULT false,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "dataEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacaoLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistFormalizacao" (
    "id" TEXT NOT NULL,
    "artesaoId" TEXT NOT NULL,
    "itensConcluidos" JSONB NOT NULL DEFAULT '[]',
    "percentualConclusao" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistFormalizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoOutbox" (
    "id" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "payload" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicadoEm" TIMESTAMP(3),

    CONSTRAINT "EventoOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Consumidor_usuarioId_key" ON "Consumidor"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Administrador_usuarioId_key" ON "Administrador"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Artesao_usuarioId_key" ON "Artesao"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaProduto_nome_key" ON "CategoriaProduto"("nome");

-- CreateIndex
CREATE INDEX "Produto_status_categoriaId_idx" ON "Produto"("status", "categoriaId");

-- CreateIndex
CREATE INDEX "Produto_status_tecnica_poloOrigem_idx" ON "Produto"("status", "tecnica", "poloOrigem");

-- CreateIndex
CREATE INDEX "Produto_artesaoId_idx" ON "Produto"("artesaoId");

-- CreateIndex
CREATE UNIQUE INDEX "Estoque_produtoId_key" ON "Estoque"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "Carrinho_consumidorId_key" ON "Carrinho"("consumidorId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCarrinho_carrinhoId_produtoId_key" ON "ItemCarrinho"("carrinhoId", "produtoId");

-- CreateIndex
CREATE INDEX "Pedido_consumidorId_idx" ON "Pedido"("consumidorId");

-- CreateIndex
CREATE INDEX "Pedido_artesaoId_status_idx" ON "Pedido"("artesaoId", "status");

-- CreateIndex
CREATE INDEX "Pedido_codigoCompra_idx" ON "Pedido"("codigoCompra");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_pedidoId_key" ON "Pagamento"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_codigoTransacao_key" ON "Pagamento"("codigoTransacao");

-- CreateIndex
CREATE UNIQUE INDEX "Entrega_pedidoId_key" ON "Entrega"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_consumidorId_produtoId_key" ON "Avaliacao"("consumidorId", "produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorito_consumidorId_produtoId_key" ON "Favorito"("consumidorId", "produtoId");

-- CreateIndex
CREATE INDEX "NotificacaoLog_artesaoId_lida_idx" ON "NotificacaoLog"("artesaoId", "lida");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistFormalizacao_artesaoId_key" ON "ChecklistFormalizacao"("artesaoId");

-- CreateIndex
CREATE INDEX "EventoOutbox_publicadoEm_idx" ON "EventoOutbox"("publicadoEm");

-- AddForeignKey
ALTER TABLE "Consumidor" ADD CONSTRAINT "Consumidor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Administrador" ADD CONSTRAINT "Administrador_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artesao" ADD CONSTRAINT "Artesao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endereco" ADD CONSTRAINT "Endereco_consumidorId_fkey" FOREIGN KEY ("consumidorId") REFERENCES "Consumidor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_artesaoId_fkey" FOREIGN KEY ("artesaoId") REFERENCES "Artesao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaProduto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estoque" ADD CONSTRAINT "Estoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carrinho" ADD CONSTRAINT "Carrinho_consumidorId_fkey" FOREIGN KEY ("consumidorId") REFERENCES "Consumidor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCarrinho" ADD CONSTRAINT "ItemCarrinho_carrinhoId_fkey" FOREIGN KEY ("carrinhoId") REFERENCES "Carrinho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCarrinho" ADD CONSTRAINT "ItemCarrinho_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_consumidorId_fkey" FOREIGN KEY ("consumidorId") REFERENCES "Consumidor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_artesaoId_fkey" FOREIGN KEY ("artesaoId") REFERENCES "Artesao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_artesaoId_fkey" FOREIGN KEY ("artesaoId") REFERENCES "Artesao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoStatusPedido" ADD CONSTRAINT "HistoricoStatusPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntervencaoPedido" ADD CONSTRAINT "IntervencaoPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_enderecoId_fkey" FOREIGN KEY ("enderecoId") REFERENCES "Endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_consumidorId_fkey" FOREIGN KEY ("consumidorId") REFERENCES "Consumidor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_consumidorId_fkey" FOREIGN KEY ("consumidorId") REFERENCES "Consumidor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemContato" ADD CONSTRAINT "MensagemContato_consumidorId_fkey" FOREIGN KEY ("consumidorId") REFERENCES "Consumidor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemContato" ADD CONSTRAINT "MensagemContato_artesaoId_fkey" FOREIGN KEY ("artesaoId") REFERENCES "Artesao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemContato" ADD CONSTRAINT "MensagemContato_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacaoLog" ADD CONSTRAINT "NotificacaoLog_artesaoId_fkey" FOREIGN KEY ("artesaoId") REFERENCES "Artesao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacaoLog" ADD CONSTRAINT "NotificacaoLog_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistFormalizacao" ADD CONSTRAINT "ChecklistFormalizacao_artesaoId_fkey" FOREIGN KEY ("artesaoId") REFERENCES "Artesao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Restrições de integridade (não geradas pelo Prisma) ───
-- RN17: o estoque nunca pode ficar negativo (segunda barreira contra overselling)
ALTER TABLE "Estoque" ADD CONSTRAINT "estoque_nao_negativo" CHECK ("quantidadeDisponivel" >= 0);
-- RN30: nota de avaliação entre 1 e 5
ALTER TABLE "Avaliacao" ADD CONSTRAINT "avaliacao_nota_1_a_5" CHECK ("nota" BETWEEN 1 AND 5);
-- RN08: preço maior que zero
ALTER TABLE "Produto" ADD CONSTRAINT "produto_preco_positivo" CHECK ("preco" > 0);
-- Quantidades positivas
ALTER TABLE "ItemCarrinho" ADD CONSTRAINT "item_carrinho_qtd_positiva" CHECK ("quantidade" > 0);
ALTER TABLE "ItemPedido" ADD CONSTRAINT "item_pedido_qtd_positiva" CHECK ("quantidade" > 0);
