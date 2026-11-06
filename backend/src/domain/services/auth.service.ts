import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { UsuarioRepository } from '../repositories/usuario.repository';
import { LoginDto } from '../../infra/http/dtos/auth/login.dto';
import { PrimeiroAcessoDto } from '../../infra/http/dtos/auth/primeiro-acesso.dto';
import {
  conferirSenha,
  gerarHashSenha,
  gerarToken,
  type ConteudoToken,
} from '../../helpers/seguranca.helpers';

type SessaoCriada = {
  token: string;
  duracaoSegundos: number;
  usuario: { id: number; nome: string; email: string; papel: string };
};

// Duas decisões: (1) JWT_SECRET não tem valor padrão — sem ela o
// serviço recusa subir, porque um segredo padrão em código é pior que
// nenhum; (2) e-mail inexistente e senha errada dão a MESMA resposta,
// senão o login vira ferramenta de descobrir quais e-mails têm conta.
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly usuarios: UsuarioRepository) {}

  /** Duração da sessão, em segundos. Padrão: 8 horas — um turno. */
  private get duracaoSegundos(): number {
    const bruto = Number(process.env.JWT_EXPIRES_IN_SECONDS);
    return Number.isFinite(bruto) && bruto > 0 ? bruto : 8 * 60 * 60;
  }

  private get segredo(): string {
    const segredo = process.env.JWT_SECRET;
    if (!segredo || segredo.length < 32) {
      throw new Error(
        'JWT_SECRET não está definida (ou tem menos de 32 caracteres). ' +
          'Gere uma com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))" ' +
          'e coloque no .env do backend.',
      );
    }
    return segredo;
  }

  /**
   * O sistema ainda não tem nenhum usuário? É o que a tela de login
   * pergunta para saber se manda a pessoa para o primeiro acesso.
   * Público, e só devolve um sim/não — nada sobre quem está cadastrado.
   */
  async situacao(): Promise<{ precisaPrimeiroAcesso: boolean }> {
    return { precisaPrimeiroAcesso: (await this.usuarios.count()) === 0 };
  }

  /**
   * Cria o primeiro gestor e já entra com ele. Só funciona com a tabela
   * de usuários VAZIA: depois do primeiro, esta rota passa a recusar —
   * senão qualquer um criaria a própria conta. Antes, o primeiro usuário
   * só podia ser criado por script (seed-usuario.ts), o que no app
   * instalado, sem Node na máquina, não tinha como fazer.
   */
  async primeiroAcesso(dto: PrimeiroAcessoDto): Promise<SessaoCriada> {
    const criado = await this.usuarios.criarSeNaoHouverNenhum({
      nome: dto.nome.trim(),
      email: dto.email.trim().toLowerCase(),
      senhaHash: gerarHashSenha(dto.senha),
      papel: 'gestor',
    });
    if (!criado) {
      throw new ConflictException(
        'O sistema já tem um gestor cadastrado. Entre com e-mail e senha.',
      );
    }
    this.logger.log(`Primeiro acesso: gestor #${criado.id} criado.`);
    return this.sessaoPara(criado);
  }

  async login(dto: LoginDto): Promise<SessaoCriada> {
    const usuario = await this.usuarios.findByEmail(dto.email);

    const credenciaisInvalidas = new UnauthorizedException(
      'E-mail ou senha incorretos.',
    );

    if (!usuario) {
      this.logger.warn(`Login recusado: e-mail não cadastrado.`);
      throw credenciaisInvalidas;
    }
    if (!conferirSenha(dto.senha, usuario.senhaHash)) {
      this.logger.warn(`Login recusado para o usuário #${usuario.id}: senha incorreta.`);
      throw credenciaisInvalidas;
    }

    return this.sessaoPara(usuario);
  }

  private sessaoPara(usuario: {
    id: number;
    nome: string;
    email: string;
    papel: string;
  }): SessaoCriada {
    return {
      token: gerarToken(
        { sub: usuario.id, email: usuario.email, papel: usuario.papel },
        this.segredo,
        this.duracaoSegundos,
      ),
      duracaoSegundos: this.duracaoSegundos,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
      },
    };
  }

  /** Relido do banco (não do token) — se o usuário mudar de nome, o token
   *  assinado no login ficaria desatualizado até expirar. */
  async perfil(conteudo: ConteudoToken) {
    const usuario = await this.usuarios.findById(conteudo.sub);
    if (!usuario) throw new UnauthorizedException('Sessão inválida.');
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
    };
  }
}
