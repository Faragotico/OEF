-- Cargo deixa de ser texto livre em funcionario e vira tabela própria.
-- Os cargos já digitados são preservados: cada nome distinto vira uma
-- linha de "cargo" e o funcionário passa a apontar para ela.

-- CreateTable
CREATE TABLE "cargo" (
    "id_cargo" SERIAL NOT NULL,
    "nome" VARCHAR(80) NOT NULL,

    CONSTRAINT "cargo_pkey" PRIMARY KEY ("id_cargo")
);

-- CreateIndex
CREATE UNIQUE INDEX "cargo_nome_key" ON "cargo"("nome");

-- Copia os cargos existentes. TRIM + INITCAP juntam variações de
-- espaço e maiúscula ("porteiro ", "PORTEIRO") num cargo só.
INSERT INTO "cargo" ("nome")
SELECT DISTINCT INITCAP(TRIM("cargo"))
FROM "funcionario"
WHERE "cargo" IS NOT NULL AND TRIM("cargo") <> '';

-- AlterTable
ALTER TABLE "funcionario" ADD COLUMN "id_cargo" INTEGER;

UPDATE "funcionario" f
SET "id_cargo" = c."id_cargo"
FROM "cargo" c
WHERE c."nome" = INITCAP(TRIM(f."cargo"));

ALTER TABLE "funcionario" DROP COLUMN "cargo";

-- AddForeignKey
ALTER TABLE "funcionario" ADD CONSTRAINT "funcionario_id_cargo_fkey" FOREIGN KEY ("id_cargo") REFERENCES "cargo"("id_cargo") ON DELETE NO ACTION ON UPDATE CASCADE;
