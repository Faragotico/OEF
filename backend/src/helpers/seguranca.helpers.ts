// Hash de senha e token de sessão, só com node:crypto (sem dependência
// nova): scrypt para senha, HMAC-SHA256 para assinar — os mesmos
// algoritmos padrão que uma lib de JWT/bcrypt usaria por baixo.
// O token é um JWT HS256 de verdade (3 partes base64url), então
// qualquer ferramenta de JWT lê ele.
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

// ------------------------------------------------------------
// Senha
// ------------------------------------------------------------

// N=16384 é o padrão do scrypt para login interativo (~100ms).
const SCRYPT_N = 16_384;
const SCRYPT_TAMANHO_CHAVE = 64;
const SCRYPT_TAMANHO_SAL = 16;

/** Hash da senha. Formato: "scrypt$<sal>$<hash>" (sal aleatório a cada chamada). */
export function gerarHashSenha(senha: string): string {
  const sal = randomBytes(SCRYPT_TAMANHO_SAL);
  const hash = scryptSync(senha.normalize('NFKC'), sal, SCRYPT_TAMANHO_CHAVE, {
    N: SCRYPT_N,
  });
  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
}

/** Confere a senha. Usa timingSafeEqual (não `===`) pra não vazar por tempo de resposta. */
export function conferirSenha(senha: string, guardado: string): boolean {
  const partes = guardado.split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;

  const sal = Buffer.from(partes[1], 'hex');
  const esperado = Buffer.from(partes[2], 'hex');
  if (sal.length === 0 || esperado.length === 0) return false;

  const calculado = scryptSync(senha.normalize('NFKC'), sal, esperado.length, {
    N: SCRYPT_N,
  });
  return timingSafeEqual(calculado, esperado);
}

// ------------------------------------------------------------
// Token de sessão (JWT HS256)
// ------------------------------------------------------------

export interface ConteudoToken {
  sub: number; // id do usuário
  email: string;
  papel: string;
  iat: number; // emitido em (epoch, segundos)
  exp: number; // expira em (epoch, segundos)
}

const base64url = (entrada: Buffer | string): string =>
  Buffer.from(entrada).toString('base64url');

function assinar(conteudo: string, segredo: string): string {
  return createHmac('sha256', segredo).update(conteudo).digest('base64url');
}

/** Monta o token; duracaoSegundos vira o exp. */
export function gerarToken(
  dados: { sub: number; email: string; papel: string },
  segredo: string,
  duracaoSegundos: number,
): string {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const corpo = base64url(
    JSON.stringify({
      ...dados,
      iat: agora,
      exp: agora + duracaoSegundos,
    } satisfies ConteudoToken),
  );
  const conteudo = `${cabecalho}.${corpo}`;
  return `${conteudo}.${assinar(conteudo, segredo)}`;
}

/** Confere assinatura e prazo; devolve null em vez de lançar (token ruim é entrada esperada). */
export function lerToken(
  token: string | undefined,
  segredo: string,
): ConteudoToken | null {
  if (!token) return null;

  const partes = token.split('.');
  if (partes.length !== 3) return null;

  const conteudo = `${partes[0]}.${partes[1]}`;
  const esperada = Buffer.from(assinar(conteudo, segredo));
  const recebida = Buffer.from(partes[2]);

  // Comprimentos diferentes já reprovam, e timingSafeEqual exige
  // tamanhos iguais para nem ser chamado.
  if (esperada.length !== recebida.length) return null;
  if (!timingSafeEqual(esperada, recebida)) return null;

  try {
    const corpo = JSON.parse(
      Buffer.from(partes[1], 'base64url').toString('utf8'),
    ) as ConteudoToken;

    if (typeof corpo.exp !== 'number') return null;
    if (corpo.exp < Math.floor(Date.now() / 1000)) return null;

    return corpo;
  } catch {
    return null;
  }
}

export const NOME_COOKIE_SESSAO = 'oef_sessao';

/**
 * Aceita os dois caminhos: header `Authorization: Bearer` (Server
 * Components do Next, que repassam o cookie) ou o cookie
 * `oef_sessao` direto (Client Components, cookie httpOnly).
 */
export function extrairToken(cabecalhos: {
  authorization?: string;
  cookie?: string;
}): string | undefined {
  const auth = cabecalhos.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim() || undefined;

  const cookie = cabecalhos.cookie;
  if (!cookie) return undefined;

  for (const parte of cookie.split(';')) {
    const [nome, ...resto] = parte.trim().split('=');
    if (nome === NOME_COOKIE_SESSAO) {
      return decodeURIComponent(resto.join('=')) || undefined;
    }
  }
  return undefined;
}
