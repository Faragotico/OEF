-- CreateTable
CREATE TABLE "empresa" (
    "id_empresa" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "contato" TEXT,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id_empresa")
);

-- CreateTable
CREATE TABLE "posto_trabalho" (
    "id_posto" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "localizacao" TEXT,
    "id_empresa" INTEGER NOT NULL,

    CONSTRAINT "posto_trabalho_pkey" PRIMARY KEY ("id_posto")
);

-- CreateTable
CREATE TABLE "funcionario" (
    "id_funcionario" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT,
    "cargo" TEXT NOT NULL,
    "carga_horaria_semanal" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "funcionario_pkey" PRIMARY KEY ("id_funcionario")
);

-- CreateTable
CREATE TABLE "regra" (
    "id_regra" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "regra_pkey" PRIMARY KEY ("id_regra")
);

-- CreateTable
CREATE TABLE "turno" (
    "id_turno" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fim" TIME NOT NULL,

    CONSTRAINT "turno_pkey" PRIMARY KEY ("id_turno")
);

-- CreateTable
CREATE TABLE "escala" (
    "id_escala" SERIAL NOT NULL,
    "data_inic" DATE NOT NULL,
    "data_fim" DATE NOT NULL,
    "id_posto" INTEGER NOT NULL,
    "id_regra" INTEGER NOT NULL,

    CONSTRAINT "escala_pkey" PRIMARY KEY ("id_escala")
);

-- CreateTable
CREATE TABLE "alocacao" (
    "id_alocacao" SERIAL NOT NULL,
    "data" DATE NOT NULL,
    "eh_substituido" BOOLEAN NOT NULL DEFAULT false,
    "id_funcionario" INTEGER NOT NULL,
    "id_escala" INTEGER NOT NULL,
    "id_turno" INTEGER NOT NULL,

    CONSTRAINT "alocacao_pkey" PRIMARY KEY ("id_alocacao")
);

-- CreateTable
CREATE TABLE "ausencia" (
    "id_ausencia" SERIAL NOT NULL,
    "data_inic" DATE NOT NULL,
    "data_fim" DATE NOT NULL,
    "motivo" TEXT NOT NULL,
    "compensacao" TEXT,
    "id_funcionario" INTEGER NOT NULL,

    CONSTRAINT "ausencia_pkey" PRIMARY KEY ("id_ausencia")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_cnpj_key" ON "empresa"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "funcionario_cpf_key" ON "funcionario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "alocacao_id_funcionario_data_id_turno_key" ON "alocacao"("id_funcionario", "data", "id_turno");

-- AddForeignKey
ALTER TABLE "posto_trabalho" ADD CONSTRAINT "posto_trabalho_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa"("id_empresa") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escala" ADD CONSTRAINT "escala_id_posto_fkey" FOREIGN KEY ("id_posto") REFERENCES "posto_trabalho"("id_posto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escala" ADD CONSTRAINT "escala_id_regra_fkey" FOREIGN KEY ("id_regra") REFERENCES "regra"("id_regra") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacao" ADD CONSTRAINT "alocacao_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "funcionario"("id_funcionario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacao" ADD CONSTRAINT "alocacao_id_escala_fkey" FOREIGN KEY ("id_escala") REFERENCES "escala"("id_escala") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacao" ADD CONSTRAINT "alocacao_id_turno_fkey" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ausencia" ADD CONSTRAINT "ausencia_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "funcionario"("id_funcionario") ON DELETE CASCADE ON UPDATE CASCADE;
