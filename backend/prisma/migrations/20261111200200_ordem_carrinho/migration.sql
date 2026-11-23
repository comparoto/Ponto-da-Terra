-- Ordem dos itens na sacola salva
ALTER TABLE "ItemCarrinho" ADD COLUMN "posicao" INTEGER NOT NULL DEFAULT 0;
