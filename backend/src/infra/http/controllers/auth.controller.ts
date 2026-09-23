import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { AuthService } from '../../../domain/services/auth.service';
import { LoginDto } from '../dtos/auth/login.dto';
import { Public } from '../decorators/public.decorator';
import { UsuarioAtual } from '../decorators/usuario-atual.decorator';
import {
  NOME_COOKIE_SESSAO,
  type ConteudoToken,
} from '../../../helpers/seguranca.helpers';

// POST /auth/login, POST /auth/logout, GET /auth/me.
//
// Cookie httpOnly, não token na mão do frontend: as telas são Server
// Components do Next (sem acesso a localStorage), e o cookie resolve
// os dois lados — o navegador manda sozinho nos Client Components, o
// servidor do Next lê e repassa, e httpOnly fecha a porta de XSS.
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private opcoesCookie(duracaoSegundos: number): CookieOptions {
    const producao = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true, // JavaScript da página não lê
      sameSite: 'lax', // não viaja em requisição de outro site
      secure: producao, // só por HTTPS em produção (em dev quebraria o http://localhost)
      path: '/',
      maxAge: duracaoSegundos * 1000, // o express espera milissegundos
    };
  }

  @Public()
  @Post('login')
  @HttpCode(200) // é uma conferência, não a criação de um recurso
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, duracaoSegundos, usuario } = await this.auth.login(dto);

    res.cookie(NOME_COOKIE_SESSAO, token, this.opcoesCookie(duracaoSegundos));

    // O token também vai no corpo: é o que o servidor do Next guarda
    // para repassar como `Authorization: Bearer` nas chamadas dele.
    return { token, usuario };
  }

  // Sair é público de propósito: se a sessão já expirou, o usuário
  // continua tendo o direito de limpar o cookie do navegador dele.
  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(NOME_COOKIE_SESSAO, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@UsuarioAtual() usuario: ConteudoToken) {
    return this.auth.perfil(usuario);
  }
}
