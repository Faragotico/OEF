-- AlterTable
ALTER TABLE "empresa" ADD COLUMN     "bairro" VARCHAR(80),
ADD COLUMN     "cep" CHAR(8),
ADD COLUMN     "cidade" VARCHAR(80),
ADD COLUMN     "complemento" VARCHAR(100),
ADD COLUMN     "logradouro" VARCHAR(150),
ADD COLUMN     "numero" VARCHAR(10),
ADD COLUMN     "uf" CHAR(2);
