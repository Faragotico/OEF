/*
  Warnings:

  - You are about to drop the column `localizacao` on the `posto_trabalho` table. All the data in the column will be lost.
  - Added the required column `local` to the `posto_trabalho` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "posto_trabalho" DROP COLUMN "localizacao",
ADD COLUMN     "local" TEXT NOT NULL;
