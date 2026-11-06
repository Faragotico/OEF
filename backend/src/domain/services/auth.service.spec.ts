import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { UsuarioRepository } from '../repositories/usuario.repository';
import { conferirSenha, lerToken } from '../../helpers/seguranca.helpers';

// Primeiro acesso: só cria o gestor com a tabela de usuários vazia.

const SEGREDO = 'x'.repeat(40);

function servico(repo: Partial<UsuarioRepository>) {
  return new AuthService(repo as UsuarioRepository);
}

describe('AuthService — primeiro acesso', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = SEGREDO;
  });

  it('situacao: pede primeiro acesso só quando não há usuário', async () => {
    expect(await servico({ count: async () => 0 }).situacao()).toEqual({
      precisaPrimeiroAcesso: true,
    });
    expect(await servico({ count: async () => 1 }).situacao()).toEqual({
      precisaPrimeiroAcesso: false,
    });
  });

  it('cria o primeiro gestor (e-mail minúsculo, senha com hash) e já devolve a sessão', async () => {
    const criar = jest.fn(async (dados: { nome: string; email: string; senhaHash: string; papel: string }) => ({
      id: 1,
      criadoEm: new Date(),
      ...dados,
    }));
    const sessao = await servico({ criarSeNaoHouverNenhum: criar as never }).primeiroAcesso({
      nome: '  Maria Gestora ',
      email: ' Maria@Empresa.com.br ',
      senha: 'senha-forte-123',
    });

    const dados = criar.mock.calls[0][0];
    expect(dados.nome).toBe('Maria Gestora');
    expect(dados.email).toBe('maria@empresa.com.br');
    expect(dados.papel).toBe('gestor');
    expect(dados.senhaHash).not.toContain('senha-forte-123');
    expect(conferirSenha('senha-forte-123', dados.senhaHash)).toBe(true);

    expect(sessao.usuario).toMatchObject({ id: 1, email: 'maria@empresa.com.br' });
    expect(lerToken(sessao.token, SEGREDO)?.sub).toBe(1);
  });

  it('recusa quando já existe algum usuário', async () => {
    const svc = servico({ criarSeNaoHouverNenhum: (async () => null) as never });
    await expect(
      svc.primeiroAcesso({ nome: 'Intruso', email: 'x@x.com', senha: '12345678' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
