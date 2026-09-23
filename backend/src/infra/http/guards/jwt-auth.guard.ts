import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { CHAVE_ROTA_PUBLICA } from '../decorators/public.decorator';
import {
  type ConteudoToken,
  extrairToken,
  lerToken,
} from '../../../helpers/seguranca.helpers';

// Guard global (APP_GUARD no app.module): roda antes de toda rota,
// exceto as marcadas @Public(). Não vai ao banco — conferir a
// assinatura é só HMAC; quem precisa dos dados atuais chama /auth/me.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const publica = this.reflector.getAllAndOverride<boolean>(
      CHAVE_ROTA_PUBLICA,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (publica) return true;

    const req = ctx
      .switchToHttp()
      .getRequest<Request & { usuario?: ConteudoToken }>();

    const segredo = process.env.JWT_SECRET;
    if (!segredo || segredo.length < 32) {
      // Falta de configuração não pode virar "todo mundo entra".
      throw new UnauthorizedException(
        'Autenticação não configurada no servidor (JWT_SECRET ausente).',
      );
    }

    const conteudo = lerToken(
      extrairToken({
        authorization: req.headers.authorization,
        cookie: req.headers.cookie,
      }),
      segredo,
    );

    if (!conteudo) {
      throw new UnauthorizedException('Sessão ausente ou expirada.');
    }

    // Fica disponível para o @UsuarioAtual() nos controllers.
    req.usuario = conteudo;
    return true;
  }
}
