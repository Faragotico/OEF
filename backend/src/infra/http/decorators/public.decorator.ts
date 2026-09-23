import { SetMetadata } from '@nestjs/common';

export const CHAVE_ROTA_PUBLICA = 'rota_publica';

// Marca uma rota como aberta, sem sessão.
//
// O guard é GLOBAL (ver app.module.ts): por padrão toda rota do sistema
// exige login, e abrir uma é um ato explícito. O contrário — proteger
// rota a rota — é o desenho que esquece uma: basta criar um controller
// novo e distraidamente não pôr o guard nele.
export const Public = () => SetMetadata(CHAVE_ROTA_PUBLICA, true);
