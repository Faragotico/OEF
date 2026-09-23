import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UsuarioRepository } from '../repositories/usuario.repository';
import { LoginDto } from '../../infra/http/dtos/auth/login.dto';
import {
  conferirSenha,
  gerarToken,
  type ConteudoToken,
} from '../../helpers/seguranca.helpers';

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

  async login(dto: LoginDto): Promise<{
    token: string;
    duracaoSegundos: number;
    usuario: { id: number; nome: string; email: string; papel: string };
  }> {
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
