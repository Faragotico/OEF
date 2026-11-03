/*
  Warnings:

  - You are about to drop the column `bairro` on the `empresa` table. All the data in the column will be lost.
  - You are about to drop the column `cep` on the `empresa` table. All the data in the column will be lost.
  - You are about to drop the column `complemento` on the `empresa` table. All the data in the column will be lost.
  - You are about to drop the column `numero` on the `empresa` table. All the data in the column will be lost.
  - You are about to drop the column `uf` on the `empresa` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "empresa" DROP COLUMN "bairro",
DROP COLUMN "cep",
DROP COLUMN "complemento",
DROP COLUMN "numero",
DROP COLUMN "uf";
