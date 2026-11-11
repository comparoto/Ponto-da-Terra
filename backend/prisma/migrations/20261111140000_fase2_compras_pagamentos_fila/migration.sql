-- Fase 2: Compra (checkout com um pagamento e um pedido por artesão), pagamentos simulados
-- (PIX, cartão, boleto) e eventoId nas notificações (processamento único pelo worker).

-- CreateEnum
CREATE TYPE "StatusCompra" AS ENUM ('AGUARDANDO_PAGAMENTO', 'PAGA', 'CANCELADA');

-- DropForeignKey
ALTER TABLE "Pagamento" DROP CONSTRAINT "Pagamento_pedidoId_fkey";

-- DropIndex
DROP INDEX "Pagamento_pedidoId_key";

-- DropIndex
DROP INDEX "Pedido_codigoCompra_idx";

-- AlterTable
ALTER TABLE "Endereco" ADD COLUMN     "bairro" TEXT;

-- AlterTable
ALTER TABLE "NotificacaoLog" ADD COLUMN     "eventoId" TEXT;

-- AlterTable
ALTER TABLE "Pagamento" DROP COLUMN "linkBoletoOuPixCopiaCola",
DROP COLUMN "pedidoId",
ADD COLUMN     "cartaoFinal" TEXT,
ADD COLUMN     "compraId" TEXT NOT NULL,
ADD COLUMN     "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "linhaDigitavel" TEXT,
ADD COLUMN     "motivoRecusa" TEXT,
ADD COLUMN     "pixCopiaECola" TEXT,
ADD COLUMN     "pixQrCode" TEXT;

-- AlterTable
ALTER TABLE "Pedido" DROP COLUMN "codigoCompra",
DROP COLUMN "reservaExpiraEm",
ADD COLUMN     "compraId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "consumidorId" TEXT NOT NULL,
    "enderecoId" TEXT NOT NULL,
    "valorProdutos" DECIMAL(10,2) NOT NULL,
    "valorFrete" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "status" "StatusCompra" NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    "reservaExpiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Compra_codigo_key" ON "Compra"("codigo");

-- CreateIndex
CREATE INDEX "Compra_consumidorId_idx" ON "Compra"("consumidorId");

-- CreateIndex
CREATE INDEX "Compra_status_reservaExpiraEm_idx" ON "Compra"("status", "reservaExpiraEm");

-- CreateIndex
CREATE UNIQUE INDEX "NotificacaoLog_eventoId_key" ON "NotificacaoLog"("eventoId");

-- CreateIndex
CREATE INDEX "NotificacaoLog_usuarioId_lida_idx" ON "NotificacaoLog"("usuarioId", "lida");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_compraId_key" ON "Pagamento"("compraId");

-- CreateIndex
CREATE INDEX "Pedido_compraId_idx" ON "Pedido"("compraId");

-- CreateIndex
CREATE INDEX "Pedido_status_dataPedido_idx" ON "Pedido"("status", "dataPedido");

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_consumidorId_fkey" FOREIGN KEY ("consumidorId") REFERENCES "Consumidor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_enderecoId_fkey" FOREIGN KEY ("enderecoId") REFERENCES "Endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

