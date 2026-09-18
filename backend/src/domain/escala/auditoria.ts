// ============================================================
// auditoria.ts — "Validar Escala" (UC06), e também a rede de segurança
// dos testes do planejador.
//
// Recebe um conjunto de alocações já existentes e devolve as que
// violam alguma regra. Serve a dois donos que antes tinham código
// separado:
//
//   - O gestor, depois de editar a escala à mão. Edição manual não é
//     bloqueada de propósito (cobrir um buraco estourando a semana é
//     decisão dele, não do sistema), então precisa existir um jeito de
//     conferir o estrago depois.
//   - Os testes. Um planejador que verifica a si mesmo com as funções
//     que ele usou pra decidir não prova nada. Auditar o resultado
//     PRONTO, alocação por alocação, com cada uma removida do estado
//     antes de ser julgada, é o que pega erro de bookkeeping — estado
//     que não foi desfeito direito, contador que ficou para trás.
//
// A checagem "com a própria alocação removida" é o mesmo que o
// `ignorarAlocacaoId` fazia na versão anterior: sem isso toda alocação
// colidiria consigo mesma no teste de conflito do dia.
// ============================================================
import {
  type Atribuicao,
  type CodigoRegra,
  type DiaIso,
  type ProblemaEscala,
} from './modelo';
import { type Candidato, aplicar, criarEstado, desfazer, verificar } from './restricoes';
import { semanaIsoDe } from './modelo';

export interface Violacao {
  pessoaId: number;
  diaIso: DiaIso;
  turnoId: number;
  regra: CodigoRegra;
}

export interface OpcoesAuditoria {
  /**
   * Se qualificação conta como violação. Padrão `false`: pôr alguém
   * fora do horário de casa é uma decisão legítima do gestor numa
   * edição manual, não uma irregularidade trabalhista.
   */
  incluirQualificacao?: boolean;
}

export function auditar(
  problema: ProblemaEscala,
  atribuicoes: Atribuicao[],
  opcoes: OpcoesAuditoria = {},
): Violacao[] {
  const turnosPorId = new Map(problema.turnos.map((t) => [t.id, t]));
  const diasPorIso = new Map(problema.dias.map((d) => [d.iso, d]));
  const pessoasPorId = new Map(problema.pessoas.map((p) => [p.id, p]));

  const estado = criarEstado(
    problema.pessoas,
    problema.historico,
    turnosPorId,
    (iso) => diasPorIso.get(iso)?.semanaIso ?? semanaIsoDe(iso),
  );

  const candidatos: Candidato[] = [];
  for (const a of atribuicoes) {
    const pessoa = pessoasPorId.get(a.pessoaId);
    const dia = diasPorIso.get(a.diaIso);
    const turno = turnosPorId.get(a.turnoId);
    if (!pessoa || !dia || !turno) continue;
    candidatos.push({ pessoa, dia, turno });
  }

  // Monta o estado completo primeiro: cada alocação é julgada contra a
  // escala inteira, não contra a metade dela que veio antes.
  for (const c of candidatos) aplicar(estado, c);

  const violacoes: Violacao[] = [];
  const ignorar: CodigoRegra[] = opcoes.incluirQualificacao
    ? []
    : ['nao-habilitado', 'dia-da-semana-vetado'];

  for (const c of candidatos) {
    desfazer(estado, c);
    const v = verificar(estado, c, problema.limites, turnosPorId);
    if (!v.ok && !ignorar.includes(v.regra)) {
      violacoes.push({
        pessoaId: c.pessoa.id,
        diaIso: c.dia.iso,
        turnoId: c.turno.id,
        regra: v.regra,
      });
    }
    aplicar(estado, c);
  }

  return violacoes;
}
