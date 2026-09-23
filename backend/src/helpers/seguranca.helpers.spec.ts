// ============================================================
// Testes da camada de sessão.
//
// Os casos que importam aqui não são os felizes — são os adversários:
// token assinado com outro segredo, corpo adulterado depois de
// assinado, `alg: none` (o ataque clássico contra implementações de
// JWT), token vencido e lixo puro. Se qualquer um desses passasse, o
// login estaria decorando a tela sem proteger nada.
// ============================================================
import {
  NOME_COOKIE_SESSAO,
  conferirSenha,
  extrairToken,
  gerarHashSenha,
  gerarToken,
  lerToken,
} from './seguranca.helpers';

const SEGREDO = 'a'.repeat(64);

describe('senha', () => {
  it('aceita a senha certa', () => {
    const hash = gerarHashSenha('senha forte 123');
    expect(conferirSenha('senha forte 123', hash)).toBe(true);
  });

  it('recusa a senha errada', () => {
    const hash = gerarHashSenha('senha forte 123');
    expect(conferirSenha('senha forte 124', hash)).toBe(false);
    expect(conferirSenha('', hash)).toBe(false);
  });

  it('gera hash diferente para a mesma senha (sal aleatório)', () => {
    expect(gerarHashSenha('abc')).not.toEqual(gerarHashSenha('abc'));
  });

  it('não quebra com hash malformado', () => {
    expect(conferirSenha('x', 'lixo')).toBe(false);
    expect(conferirSenha('x', 'scrypt$$')).toBe(false);
    expect(conferirSenha('x', 'md5$aa$bb')).toBe(false);
  });

  it('trata acento de forma estável (normalização NFKC)', () => {
    const hash = gerarHashSenha('senhaçã');
    expect(conferirSenha('senhaçã'.normalize('NFD'), hash)).toBe(true);
  });
});

describe('token', () => {
  it('vai e volta', () => {
    const token = gerarToken({ sub: 7, email: 'a@b.c', papel: 'gestor' }, SEGREDO, 60);
    const lido = lerToken(token, SEGREDO)!;
    expect(lido.sub).toBe(7);
    expect(lido.email).toBe('a@b.c');
    expect(lido.papel).toBe('gestor');
  });

  it('recusa assinatura feita com outro segredo', () => {
    const token = gerarToken({ sub: 1, email: 'a@b.c', papel: 'gestor' }, SEGREDO, 60);
    expect(lerToken(token, 'b'.repeat(64))).toBeNull();
  });

  it('recusa corpo adulterado depois de assinado', () => {
    const token = gerarToken({ sub: 1, email: 'a@b.c', papel: 'gestor' }, SEGREDO, 60);
    const [cabecalho, , assinatura] = token.split('.');
    const corpoFalso = Buffer.from(
      JSON.stringify({ sub: 999, email: 'x', papel: 'admin', iat: 0, exp: 9e9 }),
    ).toString('base64url');
    expect(lerToken(`${cabecalho}.${corpoFalso}.${assinatura}`, SEGREDO)).toBeNull();
  });

  it('recusa o ataque alg:none', () => {
    const cabecalho = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url');
    const corpo = Buffer.from(JSON.stringify({ sub: 1, exp: 9e9 })).toString(
      'base64url',
    );
    expect(lerToken(`${cabecalho}.${corpo}.`, SEGREDO)).toBeNull();
  });

  it('recusa token expirado', () => {
    const token = gerarToken({ sub: 1, email: 'a@b.c', papel: 'gestor' }, SEGREDO, -10);
    expect(lerToken(token, SEGREDO)).toBeNull();
  });

  it('recusa lixo', () => {
    for (const valor of ['', 'a', 'a.b', 'a.b.c.d', undefined]) {
      expect(lerToken(valor as string, SEGREDO)).toBeNull();
    }
  });
});

describe('extrairToken', () => {
  it('lê do cabeçalho Authorization', () => {
    expect(extrairToken({ authorization: 'Bearer xyz' })).toBe('xyz');
  });

  it('lê do cookie de sessão', () => {
    expect(
      extrairToken({ cookie: `outro=1; ${NOME_COOKIE_SESSAO}=xyz; mais=2` }),
    ).toBe('xyz');
  });

  it('prefere o Authorization quando os dois vêm', () => {
    expect(
      extrairToken({
        authorization: 'Bearer A',
        cookie: `${NOME_COOKIE_SESSAO}=B`,
      }),
    ).toBe('A');
  });

  it('devolve undefined quando não há token', () => {
    expect(extrairToken({})).toBeUndefined();
    expect(extrairToken({ cookie: 'a=1' })).toBeUndefined();
    expect(extrairToken({ authorization: 'Basic xyz' })).toBeUndefined();
  });
});
