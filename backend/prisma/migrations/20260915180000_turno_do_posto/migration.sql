-- ============================================================
-- Turno passa a pertencer ao posto e a ter demanda por dia da semana;
-- funcionário passa a ter habilitações e dias da semana vetados; a
-- coluna booleana "coringa" sai.
--
-- Por quê: o motor de escala deixou de decidir "(pessoa, dia) ->
-- trabalha ou folga" e passou a decidir "(dia, turno) -> quem cobre".
-- Pra isso o posto precisa declarar a grade de horários dele — quais
-- turnos abre e de quanta gente precisa em cada um, por dia da semana.
-- Antes a grade era implícita ("o conjunto dos horários das pessoas que
-- trabalham aqui"), e por isso três coisas das escalas reais não tinham
-- como ser representadas:
--
--   - turno que existe no posto sem ser o horário de casa de ninguém
--     (o 10-18 do Luiz N na Matriz);
--   - domingo e feriado com meia equipe;
--   - "o Pereira nunca trabalha domingo".
--
-- Nenhum cadastro existente se perde: a migration deduz o posto de cada
-- turno a partir de quem o usa como padrão, dá demanda 1 todo dia pra
-- esses turnos, e converte cada coringa antigo em habilitação em todos
-- os turnos do posto dele.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Turno pertence a um posto
-- ------------------------------------------------------------
ALTER TABLE "turno" ADD COLUMN "id_posto" INTEGER;

ALTER TABLE "turno" ADD CONSTRAINT "turno_id_posto_fkey"
  FOREIGN KEY ("id_posto") REFERENCES "posto_trabalho"("id_posto")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Cada turno herda o posto de quem já o usa como turno padrão. Turnos
-- avulsos (os criados pelo "horário personalizado" da tela de Alocação)
-- ficam sem posto de propósito: não fazem parte da grade de nenhum.
UPDATE "turno" t
SET "id_posto" = origem."id_posto"
FROM (
  SELECT f."id_turno_padrao" AS "id_turno", MIN(f."id_posto") AS "id_posto"
  FROM "funcionario" f
  WHERE f."id_turno_padrao" IS NOT NULL AND f."id_posto" IS NOT NULL
  GROUP BY f."id_turno_padrao"
) origem
WHERE t."id_turno" = origem."id_turno";

-- ------------------------------------------------------------
-- 2. Demanda por dia da semana
-- ------------------------------------------------------------
CREATE TABLE "turno_demanda" (
  "id_turno_demanda" SERIAL NOT NULL,
  "id_turno" INTEGER NOT NULL,
  "dia_semana" INTEGER NOT NULL,
  "quantidade" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "turno_demanda_pkey" PRIMARY KEY ("id_turno_demanda")
);

CREATE UNIQUE INDEX "turno_demanda_id_turno_dia_semana_key"
  ON "turno_demanda"("id_turno", "dia_semana");

ALTER TABLE "turno_demanda" ADD CONSTRAINT "turno_demanda_id_turno_fkey"
  FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Todo turno que pertence a um posto começa pedindo uma pessoa em todos
-- os sete dias — que é exatamente o comportamento de antes. Reduzir a
-- demanda de domingo é uma escolha do gestor na tela de Turnos, não um
-- padrão que a migration impõe.
INSERT INTO "turno_demanda" ("id_turno", "dia_semana", "quantidade")
SELECT t."id_turno", dia, 1
FROM "turno" t
CROSS JOIN generate_series(0, 6) AS dia
WHERE t."id_posto" IS NOT NULL;

-- ------------------------------------------------------------
-- 3. Habilitações (em que turnos a pessoa PODE ser escalada)
-- ------------------------------------------------------------
CREATE TABLE "funcionario_turno" (
  "id_funcionario" INTEGER NOT NULL,
  "id_turno" INTEGER NOT NULL,

  CONSTRAINT "funcionario_turno_pkey" PRIMARY KEY ("id_funcionario", "id_turno")
);

ALTER TABLE "funcionario_turno" ADD CONSTRAINT "funcionario_turno_id_funcionario_fkey"
  FOREIGN KEY ("id_funcionario") REFERENCES "funcionario"("id_funcionario")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "funcionario_turno" ADD CONSTRAINT "funcionario_turno_id_turno_fkey"
  FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Coringa antigo (coringa = true) vira: sem turno padrão + habilitado
-- em todos os turnos do posto dele. É o que ele fazia na prática.
--
-- Um coringa cujo posto ainda não tem turno nenhum com id_posto (porque
-- nenhum titular de lá tinha turno padrão) sai daqui sem habilitação e
-- passa a contar como cadastro incompleto — a tela de Funcionários
-- aponta isso.
INSERT INTO "funcionario_turno" ("id_funcionario", "id_turno")
SELECT f."id_funcionario", t."id_turno"
FROM "funcionario" f
JOIN "turno" t ON t."id_posto" = f."id_posto"
WHERE f."coringa" = TRUE AND f."id_posto" IS NOT NULL;

-- ------------------------------------------------------------
-- 4. Dias da semana vetados por pessoa
-- ------------------------------------------------------------
ALTER TABLE "funcionario"
  ADD COLUMN "dias_semana_vetados" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- ------------------------------------------------------------
-- 5. A coluna "coringa" sai
--
-- Ela dizia a mesma coisa que a ausência de turno padrão, e manter duas
-- colunas com o mesmo significado é a receita pra uma delas ficar
-- desatualizada. Quem é coringa agora é quem não tem turno padrão e tem
-- habilitação; a API continua devolvendo o campo, calculado.
-- ------------------------------------------------------------
ALTER TABLE "funcionario" DROP COLUMN "coringa";
