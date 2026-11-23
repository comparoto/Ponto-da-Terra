-- HU8: aprovação do cadastro de novos artesãos · registro do aceite dos Termos de Uso

-- CreateEnum
CREATE TYPE "StatusCadastroArtesao" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- AlterTable
ALTER TABLE "Artesao" ADD COLUMN     "motivoCadastro" TEXT,
ADD COLUMN     "statusCadastro" "StatusCadastroArtesao" NOT NULL DEFAULT 'PENDENTE';

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "termosAceitosEm" TIMESTAMP(3);


-- Artesãos que já existiam continuam públicos: só os novos cadastros passam pela aprovação
UPDATE "Artesao" SET "statusCadastro" = 'APROVADO';
