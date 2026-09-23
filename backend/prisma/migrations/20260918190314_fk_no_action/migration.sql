-- DropForeignKey
ALTER TABLE "alocacao" DROP CONSTRAINT "alocacao_id_funcionario_fkey";

-- DropForeignKey
ALTER TABLE "alocacao" DROP CONSTRAINT "alocacao_id_turno_fkey";

-- DropForeignKey
ALTER TABLE "ausencia" DROP CONSTRAINT "ausencia_id_funcionario_fkey";

-- DropForeignKey
ALTER TABLE "escala" DROP CONSTRAINT "escala_id_posto_fkey";

-- DropForeignKey
ALTER TABLE "escala" DROP CONSTRAINT "escala_id_regra_fkey";

-- DropForeignKey
ALTER TABLE "posto_trabalho" DROP CONSTRAINT "posto_trabalho_id_empresa_fkey";

-- AddForeignKey
ALTER TABLE "posto_trabalho" ADD CONSTRAINT "posto_trabalho_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id_empresa") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escala" ADD CONSTRAINT "escala_id_posto_fkey" FOREIGN KEY ("id_posto") REFERENCES "posto_trabalho"("id_posto") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escala" ADD CONSTRAINT "escala_id_regra_fkey" FOREIGN KEY ("id_regra") REFERENCES "regra"("id_regra") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacao" ADD CONSTRAINT "alocacao_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "funcionario"("id_funcionario") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacao" ADD CONSTRAINT "alocacao_id_turno_fkey" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ausencia" ADD CONSTRAINT "ausencia_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "funcionario"("id_funcionario") ON DELETE NO ACTION ON UPDATE CASCADE;
