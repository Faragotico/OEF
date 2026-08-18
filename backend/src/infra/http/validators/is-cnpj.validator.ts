import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

// (a "tabela ASCII").
// O '0' vale 48. Guardamos esse 48 aqui pra usar.
const VALOR_BASE = '0'.charCodeAt(0); // = 48

// "Pesos": cada posição do CNPJ é multiplicada por um desses números.
// É uma lista fixa definida pela Receita. Não precisa decorar, só usar.
const PESOS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Pega as 12 primeiras posições e calcula os 2 dígitos verificadores.
 * Devolve os dois como texto, ex: "35".
 */
function calculaDv(base12: string): string {
  // duas somas: uma pro 1º dígito, outra pro 2º.
  let somaDv1 = 0;
  let somaDv2 = 0;

  // Percorremos as 12 posições.
  for (let i = 0; i < 12; i++) {
    // 1) Pega o número ASCII do caractere na posição i e tira 48.
    //    Assim: '0' (48) vira 0, '9' (57) vira 9, 'A' (65) vira 17...
    //    Ex: na posição 2 temos 'A' -> 65 - 48 = 17.
    const valor = base12.charCodeAt(i) - VALOR_BASE;

    // 2) Multiplica esse valor pelo peso daquela casa e vai somando.
    //    O 1º dígito usa os pesos "adiantados em um" (PESOS[i+1]);
    //    o 2º usa os pesos "certinhos" (PESOS[i]). É só assim que a
    //    Receita definiu — os dois dígitos usam pesos ligeiramente
    //    diferentes de propósito.
    somaDv1 += valor * PESOS[i + 1];
    somaDv2 += valor * PESOS[i];
  }

  // - soma % 11 é o RESTO da divisão da soma por 11 (o que sobra).
  // - Se esse resto for 0 ou 1, o dígito é 0 (regra especial).
  // - Senão, o dígito é 11 menos o resto.
  const dv1 = somaDv1 % 11 < 2 ? 0 : 11 - (somaDv1 % 11);

  // O 2º dígito depende do 1º: jogamos o dv1 (multiplicado pelo último
  // peso) dentro da soma dele antes de fechar a conta.
  somaDv2 += dv1 * PESOS[12];
  const dv2 = somaDv2 % 11 < 2 ? 0 : 11 - (somaDv2 % 11);

  // Junta os dois números num texto. Ex: dv1=3 e dv2=5 -> "35".
  return `${dv1}${dv2}`;
}

/**
 * Diz se um CNPJ inteiro (14 posições) é válido ou não.
 * Espera o CNPJ limpo: sem ponto/barra/traço e com letras MAIÚSCULAS.
 * (Quem garante essa limpeza é o DTO, antes de chegar aqui.)
 */
export function ehCnpjValido(cnpj: string): boolean {
  // Primeiro conferimos o FORMATO com uma "regex" (um molde de texto):
  //   [A-Z\d]{12}  = 12 posições, cada uma letra maiúscula OU número
  //   \d{2}        = mais 2 números no final
  // Se não encaixar nesse molde, já reprova.
  if (!/^[A-Z\d]{12}\d{2}$/.test(cnpj)) return false;

  // Caso especial: o CNPJ só de zeros passaria na conta (soma 0 -> "00"),
  // mas não é válido. Então barramos ele na mão.
  if (cnpj === '00000000000000') return false;

  // Separa o CNPJ em duas partes:
  const dvInformado = cnpj.slice(12); // os 2 últimos que VIERAM no CNPJ
  const dvCalculado = calculaDv(cnpj.slice(0, 12)); // os 2 que a conta DEU

  // Se os que vieram são iguais aos que a conta deu, o CNPJ é válido.
  return dvInformado === dvCalculado;
}

export function IsCnpj(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCnpj',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        // Roda quando alguém manda um CNPJ. Confere se é texto e chama
        // a nossa função lá de cima.
        validate(value: unknown): boolean {
          return typeof value === 'string' && ehCnpjValido(value);
        },
        // A mensagem de erro que o usuário recebe se o CNPJ for inválido.
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} não é um CNPJ válido: o dígito verificador não confere.`;
        },
      },
    });
  };
}
