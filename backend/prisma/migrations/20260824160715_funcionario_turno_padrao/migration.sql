-- AlterTable
ALTER TABLE "funcionario" ADD COLUMN     "id_turno_padrao" INTEGER;

-- AddForeignKey
ALTER TABLE "funcionario" ADD CONSTRAINT "funcionario_id_turno_padrao_fkey" FOREIGN KEY ("id_turno_padrao") REFERENCES "turno"("id_turno") ON DELETE SET NULL ON UPDATE CASCADE;
