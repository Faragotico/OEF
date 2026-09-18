// Máscara de telefone brasileiro, aplicada a cada tecla digitada (ver
// empresa-form.tsx e os dois forms de funcionário). Sempre parte dos
// dígitos "crus" (ignora qualquer letra/símbolo que tenha entrado,
// inclusive colado) e reconstrói a máscara do zero — assim não
// interessa se o valor anterior já tinha "(", ")", espaço ou "-", o
// resultado final é sempre consistente.
//
// Até 10 dígitos: fixo, "(XX) XXXX-XXXX". No 11º dígito (celular),
// desloca pro formato de 5 dígitos antes do hífen, "(XX) XXXXX-XXXX".
// Limite de 11 dígitos — o maior número de telefone válido no Brasil
// (DDD de 2 + 9 dígitos do celular).
export function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);

  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}
