import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

// ============================================================
// RNDoc01 — validação do dígito verificador do CPF
//
// No documento esta regra está implementada como trigger no Postgres
// (fn_valida_cpf). Aqui ela é replicada na borda da API para que o
// cliente receba 400 com mensagem clara, em vez de 500 vindo do banco.
// As duas camadas devem coexistir: a trigger garante integridade mesmo
// se alguém inserir dados por fora da aplicação (pgAdmin, script, seed).
// ============================================================

/**
 * Verifica se um CPF é matematicamente consistente (módulo 11).
 *
 * Atenção ao que isto NÃO faz: não consulta a Receita Federal. Um CPF
 * pode passar aqui e não pertencer a ninguém. É um detector de erro de
 * digitação, não prova de existência.
 *
 * @param cpf 11 dígitos, sem pontos ou traço.
 */
export function ehCpfValido(cpf: string): boolean {
  // Formato antes de tudo: 11 caracteres, todos dígitos.
  if (!/^\d{11}$/.test(cpf)) return false;

  // Rejeita 00000000000, 11111111111, etc. Eles PASSAM no módulo 11 por
  // coincidência matemática, mas não são CPFs válidos. O documento
  // também lista esses casos explicitamente em fn_valida_cpf.
  // A regex lê: "um dígito, seguido do mesmo dígito 10 vezes".
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (i: number) => Number(cpf[i]);

  // 1º dígito verificador: pesos 10, 9, 8 ... 2 sobre os 9 primeiros.
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += digito(i) * (10 - i);
  }
  let resto = soma % 11;
  const dv1 = resto < 2 ? 0 : 11 - resto;
  if (dv1 !== digito(9)) return false;

  // 2º dígito verificador: pesos 11, 10, 9 ... 2 sobre os 10 primeiros.
  // Repare que agora o próprio dv1 entra na conta — é o que amarra os
  // dois dígitos e torna difícil errar os dois de forma compensada.
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += digito(i) * (11 - i);
  }
  resto = soma % 11;
  const dv2 = resto < 2 ? 0 : 11 - resto;

  return dv2 === digito(10);
}

/**
 * Decorator de validação para usar nos DTOs: `@IsCpf()`.
 *
 * O class-validator não traz validação de CPF pronta, então registramos
 * a nossa. O `registerDecorator` é a API oficial para isso: a gente
 * entrega um objeto com `validate` (retorna true/false) e
 * `defaultMessage` (o texto do erro 400 quando validate der false).
 *
 * Por que uma função que retorna uma função? Porque é assim que
 * decorator com parâmetro funciona em TypeScript. `@IsCpf()` é uma
 * CHAMADA: ela executa e devolve o decorator de verdade, que o
 * TypeScript então aplica sobre a propriedade. Por isso tem os
 * parênteses — sem eles você estaria passando a função, não o resultado.
 */
export function IsCpf(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCpf',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        // `value` chega como unknown porque o cliente pode mandar
        // qualquer coisa no JSON — número, array, null. Conferimos o
        // tipo antes de tratar como string.
        validate(value: unknown): boolean {
          return typeof value === 'string' && ehCpfValido(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} não é um CPF válido: o dígito verificador não confere.`;
        },
      },
    });
  };
}
