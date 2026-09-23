-- Vínculo Funcionário -> Posto de trabalho.
-- Nulável de propósito: os cadastros que já existem continuam válidos e
-- o gestor preenche o posto de cada funcionário na tela de edição. É
-- esta coluna que a geração automática usa pra montar a escala com a
-- equipe do posto escolhido, em vez de considerar todos os
-- funcionários ativos do sistema.

-- AlterTable
ALTER TABLE "funcionario" ADD COLUMN     "id_posto" INTEGER;

-- AddForeignKey
ALTER TABLE "funcionario" ADD CONSTRAINT "funcionario_id_posto_fkey" FOREIGN KEY ("id_posto") REFERENCES "posto_trabalho"("id_posto") ON DELETE SET NULL ON UPDATE CASCADE;
