/*
  Warnings:

  - You are about to alter the column `motivo` on the `ausencia` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `compensacao` on the `ausencia` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `nome` on the `empresa` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `cnpj` on the `empresa` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(14)`.
  - You are about to alter the column `contato` on the `empresa` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `nome` on the `funcionario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `cpf` on the `funcionario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(11)`.
  - You are about to alter the column `telefone` on the `funcionario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `cargo` on the `funcionario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(80)`.
  - You are about to alter the column `nome` on the `posto_trabalho` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `local` on the `posto_trabalho` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(150)`.
  - You are about to alter the column `descricao` on the `regra` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `tipo` on the `regra` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `valor` on the `regra` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to drop the column `hora_inicio` on the `turno` table. All the data in the column will be lost.
  - You are about to alter the column `descricao` on the `turno` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - A unique constraint covering the columns `[tipo,valor]` on the table `regra` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hora_inic` to the `turno` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ausencia" DROP CONSTRAINT "ausencia_id_funcionario_fkey";

-- AlterTable
ALTER TABLE "ausencia" ALTER COLUMN "motivo" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "compensacao" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "empresa" ALTER COLUMN "nome" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "cnpj" SET DATA TYPE CHAR(14),
ALTER COLUMN "contato" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "funcionario" ALTER COLUMN "nome" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "cpf" SET DATA TYPE CHAR(11),
ALTER COLUMN "telefone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "cargo" SET DATA TYPE VARCHAR(80);

-- AlterTable
ALTER TABLE "posto_trabalho" ALTER COLUMN "nome" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "local" SET DATA TYPE VARCHAR(150);

-- AlterTable
ALTER TABLE "regra" ALTER COLUMN "descricao" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "tipo" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "valor" SET DATA TYPE VARCHAR(50);

-- AlterTable
-- EDITADO MANUALMENTE: o Prisma não detecta renomeação de coluna. Ele havia
-- gerado DROP COLUMN "hora_inicio" + ADD COLUMN "hora_inic" TIME NOT NULL,
-- que apagaria os horários existentes e falharia por não haver valor default
-- para as linhas já gravadas. RENAME COLUMN faz a mesma mudança de nome
-- preservando os dados. O tipo TIME é mantido pela renomeação.
ALTER TABLE "turno" RENAME COLUMN "hora_inicio" TO "hora_inic";

-- RENAME COLUMN não pode ser combinado com ALTER COLUMN no mesmo comando,
-- por isso as alterações de descricao ficam num ALTER TABLE separado.
ALTER TABLE "turno" ALTER COLUMN "descricao" DROP NOT NULL,
ALTER COLUMN "descricao" SET DATA TYPE VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "regra_tipo_valor_key" ON "regra"("tipo", "valor");

-- AddForeignKey
ALTER TABLE "ausencia" ADD CONSTRAINT "ausencia_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "funcionario"("id_funcionario") ON DELETE RESTRICT ON UPDATE CASCADE;
