-- ============================================================
-- Validação de CPF e CNPJ no banco (RNDoc01 e RNDoc02).
--
-- Por que existe, se os DTOs já validam: as duas camadas têm alvos
-- diferentes. O DTO devolve 400 com mensagem clara para quem usa a
-- API; a trigger garante que nem um INSERT direto no pgAdmin, um seed
-- ou um script de importação consigam gravar documento inválido. Uma
-- protege a experiência, a outra protege o dado.
--
-- IMPORTANTE — o CNPJ mudou. Desde 2026 o CNPJ é ALFANUMÉRICO: as 12
-- primeiras posições podem ser letra maiúscula ou dígito, e só os 2
-- dígitos verificadores continuam numéricos. O cálculo passou a usar o
-- valor ASCII de cada caractere menos 48 ('0' = 0, '9' = 9, 'A' = 17).
-- A versão só-numérica que circula na maioria dos exemplos REJEITA um
-- CNPJ alfanumérico válido.
-- ============================================================

-- ------------------------------------------------------------
-- CPF — módulo 11 sobre 11 dígitos
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_cpf(p_cpf CHAR(11))
RETURNS BOOLEAN AS $$
DECLARE
  v_soma INT; v_resto INT; v_dig1 INT; v_dig2 INT; i INT;
BEGIN
  IF p_cpf IS NULL THEN RETURN FALSE; END IF;

  -- 11 dígitos, nada além disso
  IF p_cpf !~ '^[0-9]{11}$' THEN RETURN FALSE; END IF;

  -- 00000000000, 11111111111... passam no módulo 11 por coincidência
  -- matemática, mas não são CPFs. Barrados na mão.
  IF p_cpf ~ '^([0-9])\1{10}$' THEN RETURN FALSE; END IF;

  -- 1º dígito: pesos 10..2 sobre as 9 primeiras posições
  v_soma := 0;
  FOR i IN 1..9 LOOP
    v_soma := v_soma + CAST(SUBSTRING(p_cpf, i, 1) AS INT) * (11 - i);
  END LOOP;
  v_resto := v_soma % 11;
  v_dig1 := CASE WHEN v_resto < 2 THEN 0 ELSE 11 - v_resto END;

  -- 2º dígito: pesos 11..2 sobre as 10 primeiras (o 1º dígito entra na
  -- conta — é o que amarra os dois e dificulta um erro compensado)
  v_soma := 0;
  FOR i IN 1..10 LOOP
    v_soma := v_soma + CAST(SUBSTRING(p_cpf, i, 1) AS INT) * (12 - i);
  END LOOP;
  v_resto := v_soma % 11;
  v_dig2 := CASE WHEN v_resto < 2 THEN 0 ELSE 11 - v_resto END;

  RETURN CAST(SUBSTRING(p_cpf, 10, 1) AS INT) = v_dig1
     AND CAST(SUBSTRING(p_cpf, 11, 1) AS INT) = v_dig2;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION fn_trigger_valida_cpf()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT fn_valida_cpf(NEW.cpf) THEN
    RAISE EXCEPTION 'CPF % invalido: digito verificador nao confere.', NEW.cpf
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_valida_cpf ON funcionario;
CREATE TRIGGER trg_valida_cpf
BEFORE INSERT OR UPDATE OF cpf ON funcionario
FOR EACH ROW EXECUTE FUNCTION fn_trigger_valida_cpf();

-- ------------------------------------------------------------
-- CNPJ alfanumérico — módulo 11 sobre o valor ASCII menos 48
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_cnpj(p_cnpj CHAR(14))
RETURNS BOOLEAN AS $$
DECLARE
  -- Pesos da Receita. O 1º dígito usa os pesos adiantados em um
  -- (posições 2..13), o 2º usa os pesos alinhados (posições 1..12).
  v_pesos INT[] := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
  v_soma1 INT := 0; v_soma2 INT := 0;
  v_valor INT; v_dig1 INT; v_dig2 INT; i INT;
BEGIN
  IF p_cnpj IS NULL THEN RETURN FALSE; END IF;

  -- 12 posições alfanuméricas MAIÚSCULAS + 2 dígitos verificadores
  IF p_cnpj !~ '^[A-Z0-9]{12}[0-9]{2}$' THEN RETURN FALSE; END IF;

  -- Só zeros fecha a conta (soma 0 -> "00") mas não é CNPJ.
  IF p_cnpj = '00000000000000' THEN RETURN FALSE; END IF;

  FOR i IN 1..12 LOOP
    -- ASCII do caractere menos 48: '0' vira 0, '9' vira 9, 'A' vira 17
    v_valor := ASCII(SUBSTRING(p_cnpj, i, 1)) - 48;
    v_soma1 := v_soma1 + v_valor * v_pesos[i + 1];
    v_soma2 := v_soma2 + v_valor * v_pesos[i];
  END LOOP;

  v_dig1 := CASE WHEN v_soma1 % 11 < 2 THEN 0 ELSE 11 - (v_soma1 % 11) END;

  -- O 2º dígito depende do 1º: ele entra na soma com o último peso.
  v_soma2 := v_soma2 + v_dig1 * v_pesos[13];
  v_dig2 := CASE WHEN v_soma2 % 11 < 2 THEN 0 ELSE 11 - (v_soma2 % 11) END;

  RETURN CAST(SUBSTRING(p_cnpj, 13, 1) AS INT) = v_dig1
     AND CAST(SUBSTRING(p_cnpj, 14, 1) AS INT) = v_dig2;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION fn_trigger_valida_cnpj()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT fn_valida_cnpj(NEW.cnpj) THEN
    RAISE EXCEPTION 'CNPJ % invalido: digito verificador nao confere.', NEW.cnpj
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_valida_cnpj ON empresa;
CREATE TRIGGER trg_valida_cnpj
BEFORE INSERT OR UPDATE OF cnpj ON empresa
FOR EACH ROW EXECUTE FUNCTION fn_trigger_valida_cnpj();
