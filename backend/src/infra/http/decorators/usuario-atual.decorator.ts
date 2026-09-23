import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { ConteudoToken } from '../../../helpers/seguranca.helpers';

// Açúcar para ler quem está logado direto na assinatura do método:
//
//   @Get('me')
//   eu(@UsuarioAtual() usuario: ConteudoToken) { ... }
//
// Quem preenche isso é o JwtAuthGuard, que roda antes.
export const UsuarioAtual = createParamDecorator(
  (_dados: unknown, ctx: ExecutionContext): ConteudoToken | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { usuario?: ConteudoToken }>();
    return req.usuario;
  },
);
