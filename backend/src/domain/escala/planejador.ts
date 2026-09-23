// ============================================================
// planejador.ts — o solver.
//
// O problema é: preencher uma grade de vagas (dia × turno) com as
// pessoas do posto, sem violar nenhuma regra dura, distribuindo folga e
// domingo de um jeito que a equipe reconheça como justo.
//
// Isso é um problema de satisfação de restrições, e o que faz um bom
// resultado aqui não é esperteza: é a ORDEM em que as decisões são
// tomadas. A versão anterior atacava na ordem do calendário e, dentro
// do dia, na ordem da lista — o coringa pegava a primeira folga que
// passasse nas regras e nunca reconsiderava. Uma escolha ruim no dia 3
// deixava buraco no dia 4 sem que nada percebesse a relação.
//
// Três ideias, nessa ordem de importância:
//
//   1. VAGA MAIS DIFÍCIL PRIMEIRO (MRV — minimum remaining values, o
//      clássico de CSP). A cada passo o planejador olha todas as vagas
//      que faltam, conta quantas pessoas ainda cabem em cada uma, e
//      resolve a de menor contagem. Jogada forçada é jogada forçada:
//      resolver antes as vagas de uma pessoa só evita gastá-la em outro
//      lugar e descobrir o problema tarde demais. É o que mais melhora
//      o resultado, e custa dez linhas.
//
//   2. ENTRE OS QUE CABEM, O MAIS BARATO. Uma função de custo em vez de
//      "o primeiro da fila": quem trabalhou mais até agora fica caro
//      (equilibra carga e, por consequência, folga), e num domingo quem
//      já trabalhou mais domingos fica caro (é isto que garante o
//      domingo de folga — deixou de ser um passo de reparo com troca e
//      desfaz, virou preço).
//
//   3. REPARO POR TROCA SIMPLES. Terminado o preenchimento, cada vaga
//      que sobrou vazia tenta uma troca de uma perna: se alguém que
//      cabia nela está ocupado em outro turno no mesmo dia, o
//      planejador move essa pessoa e procura um substituto pro lugar
//      que ela deixou. É exatamente o caso que a auditoria de 26/08
//      pegou no dia 12/03 e resolveu por outro caminho.
//
// O que ele não faz, de propósito: busca completa com backtracking.
// Dobraria o código e o tempo pra ganhar pouco num problema em que a
// folga real quase sempre é aritmética (não cabe gente), não combinação
// ruim. Quando não cabe, o lugar certo de gastar energia é explicar por
// que não cabe — é o que os diagnósticos fazem.
// ============================================================
import {
  type Atribuicao,
  type CodigoRegra,
  type Dia,
  type DiaIso,
  type Diagnostico,
  type Folga,
  type Pessoa,
  type PlanoEscala,
  type ProblemaEscala,
  type Turno,
  type Vaga,
  type VagaVazia,
  chaveVaga,
  desloca,
  semanaIsoDe,
} from './modelo';
import {
  type Candidato,
  type Estado,
  aplicar,
  criarEstado,
  desfazer,
  verificar,
} from './restricoes';

// Pesos da função de custo. São ordens de grandeza, não números finos:
// o que importa é a hierarquia entre eles, não o valor exato.
const PESO_RITMO = 5; // quem está há mais dias sem folgar é quem folga
const PESO_CARGA = 10; // equilibrar dias trabalhados entre as pessoas
const PESO_DOMINGO = 120; // proteger o domingo de folga de quem tem menos
const PESO_FORA_DO_PREFERIDO = 5_000; // só pesa quando o gestor libera

const chavePessoaDia = (pessoaId: number, diaIso: DiaIso) => `${pessoaId}|${diaIso}`;

export function planejar(problema: ProblemaEscala): PlanoEscala {
  const { dias, pessoas, turnos, limites, historico } = problema;

  const turnosPorId = new Map(turnos.map((t) => [t.id, t]));
  const diasPorIso = new Map(dias.map((d) => [d.iso, d]));
  // Dias do histórico caem fora de `dias`, então a semana deles é
  // calculada na hora — é a mesma conta, só não estava pré-computada.
  const semanaDe = (iso: DiaIso) => diasPorIso.get(iso)?.semanaIso ?? semanaIsoDe(iso);

  const estado = criarEstado(pessoas, historico, turnosPorId, semanaDe);

  // Feriado master é folga geral: o posto não abre vaga nenhuma. Filtrar
  // aqui, e não dentro do laço, é o que mantém o laço sem exceção.
  const vagas = problema.vagas.filter(
    (v) => !diasPorIso.get(v.diaIso)?.ehFeriadoMaster,
  );

  const atribuicoes = new Map<string, { vaga: Vaga; pessoa: Pessoa }>();
  const vagaDaPessoaNoDia = new Map<string, Vaga>();
  const vazias: VagaVazia[] = [];

  const candidatoDe = (vaga: Vaga, pessoa: Pessoa): Candidato => ({
    pessoa,
    dia: diasPorIso.get(vaga.diaIso)!,
    turno: turnosPorId.get(vaga.turnoId)!,
  });

  // ------------------------------------------------------------
  // Custo: entre as pessoas que CABEM numa vaga, qual é a melhor.
  // ------------------------------------------------------------
  /**
   * Há quantos dias esta pessoa não tem uma folga DELA.
   *
   * Duas sutilezas, e as duas vêm das planilhas reais da empresa:
   *
   * 1. A conta atravessa a virada do mês, porque o estado já nasce com
   *    o histórico carregado. Quem vinha no quinto dia seguido em 30 de
   *    abril chega ao dia 1º de maio no quinto dia, não zerado.
   *
   * 2. Feriado em que o posto fecha NÃO conta como folga de ninguém, e
   *    também não interrompe a contagem — é pulado. Foi o que os
   *    quadros reais mostraram: um titular pode folgar num padrão fixo
   *    de seis em seis dias, e o feriado de 1º de maio, em que o posto inteiro
   *    fechou, passou no meio sem consumir a vez dele. Faz sentido:
   *    descanso que a loja impôs a todo mundo não é o descanso que o
   *    rodízio devia àquela pessoa. Sem esta linha, o feriado zera o
   *    ritmo da equipe toda e o rodízio recomeça numa fase qualquer.
   */
  const diasSemFolgaPropria = (pessoaId: number, diaIso: DiaIso): number => {
    const ep = estado.porPessoa.get(pessoaId)!;
    let dias = 0;
    let cursor = desloca(diaIso, -1);
    for (let guarda = 0; guarda < 12; guarda++, cursor = desloca(cursor, -1)) {
      if (diasPorIso.get(cursor)?.ehFeriadoMaster) continue; // posto fechado: pula
      if (!ep.turnoPorDia.has(cursor)) break; // achou a folga dela
      dias++;
    }
    return dias;
  };

  const custo = (c: Candidato): number => {
    const ep = estado.porPessoa.get(c.pessoa.id)!;
    // RITMO — o termo que faz a folga girar de verdade. Sem ele, a
    // escolha entre duas pessoas igualmente carregadas caía no
    // desempate por id, e o rodízio recomeçava numa fase arbitrária a
    // cada mês. As planilhas reais da empresa mantêm a mesma fase
    // através da virada (um titular mantém o padrão fixo de seis em
    // seis dias, mesmo com o feriado de 1º de maio no meio); é este termo,
    // somado ao histórico, que reproduz isso.
    let total = PESO_RITMO * diasSemFolgaPropria(c.pessoa.id, c.dia.iso);
    total += PESO_CARGA * ep.diasNoPeriodo;
    // DOMINGO — ao quadrado, de propósito. Linear, o preço de tirar o
    // domingo de alguém era o mesmo no primeiro e no último domingo do
    // mês, e um empate contra o ritmo podia deixar a mesma pessoa
    // trabalhando todos eles. Elevando ao quadrado, cada domingo já
    // trabalhado encarece o próximo muito mais que o anterior: quem
    // está prestes a fechar o mês sem nenhum domingo de folga fica
    // caro demais para ser escalado de novo.
    if (c.dia.diaDaSemana === 0) {
      total += PESO_DOMINGO * ep.domingosTrabalhados * ep.domingosTrabalhados;
    }
    if (c.pessoa.turnoPreferido !== null && c.pessoa.turnoPreferido !== c.turno.id) {
      total += PESO_FORA_DO_PREFERIDO;
    }
    // Desempate determinístico: a mesma equipe cadastrada em qualquer
    // ordem tem que produzir exatamente a mesma escala.
    return total + c.pessoa.id * 1e-6;
  };

  /** Quem cabe nesta vaga agora, e quem não cabe e por quê. */
  const avaliar = (vaga: Vaga) => {
    const viaveis: Candidato[] = [];
    const bloqueios: { pessoaId: number; regra: CodigoRegra }[] = [];
    for (const pessoa of pessoas) {
      const c = candidatoDe(vaga, pessoa);
      const v = verificar(estado, c, limites, turnosPorId);
      if (v.ok) viaveis.push(c);
      else bloqueios.push({ pessoaId: pessoa.id, regra: v.regra });
    }
    return { viaveis, bloqueios };
  };

  // ------------------------------------------------------------
  // 1 + 2 — preenchimento: vaga mais difícil primeiro, candidato mais
  // barato dentro dela.
  //
  // A cada passo o estado mudou, então as contagens são refeitas. É
  // O(vagas² × pessoas) no papel; num mês real são 155 vagas e meia
  // dúzia de pessoas, o que dá algo como 150 mil checagens O(1) — na
  // casa dos milissegundos. Recalcular tudo é mais lento do que manter
  // as contagens incrementalmente, e é muito mais difícil de errar.
  // ------------------------------------------------------------
  const pendentes = new Set(vagas.map(chaveVaga));
  const vagaPorChave = new Map(vagas.map((v) => [chaveVaga(v), v]));

  // Memo das avaliações, com invalidação por vizinhança de dias.
  //
  // Sem isso o laço é O(vagas² × pessoas): a cada vaga preenchida,
  // reavalia TODAS as que sobraram — mas alocar alguém no dia D só
  // muda quem cabe perto de D (RN05 é D±1; RN06/RN07/RN04 alcançam no
  // máximo 6 dias pra cada lado). 7 dias de raio cobrem todas com
  // folga: guarda a avaliação de cada vaga, e depois de cada
  // atribuição descarta só as que caem nessa janela.
  //
  // Otimização pura: ordem de visita, desempate e o `break` em zero
  // continuam idênticos — só corta reavaliação que dava o mesmo
  // resultado de antes. Verificado com 13 planos byte a byte iguais.
  // ------------------------------------------------------------
  const RAIO_INVALIDACAO = 7;
  const memoAvaliacao = new Map<string, ReturnType<typeof avaliar>>();

  const chavesPorDia = new Map<DiaIso, string[]>();
  for (const v of vagas) {
    const chave = chaveVaga(v);
    const lista = chavesPorDia.get(v.diaIso);
    if (lista) lista.push(chave);
    else chavesPorDia.set(v.diaIso, [chave]);
  }

  const invalidarAoRedor = (diaIso: DiaIso) => {
    for (let d = -RAIO_INVALIDACAO; d <= RAIO_INVALIDACAO; d++) {
      const chaves = chavesPorDia.get(desloca(diaIso, d));
      if (!chaves) continue;
      for (const chave of chaves) memoAvaliacao.delete(chave);
    }
  };

  while (pendentes.size > 0) {
    let escolhida: Vaga | null = null;
    let avaliacaoEscolhida: ReturnType<typeof avaliar> | null = null;
    let menor = Number.POSITIVE_INFINITY;

    for (const chave of pendentes) {
      const vaga = vagaPorChave.get(chave)!;
      let avaliacao = memoAvaliacao.get(chave);
      if (avaliacao === undefined) {
        avaliacao = avaliar(vaga);
        memoAvaliacao.set(chave, avaliacao);
      }
      const quantos = avaliacao.viaveis.length;
      // Desempate por data e depois por turno: com tudo igual, a escala
      // sai na ordem do calendário, que é como uma pessoa leria.
      const melhor =
        quantos < menor ||
        (quantos === menor &&
          escolhida !== null &&
          (vaga.diaIso < escolhida.diaIso ||
            (vaga.diaIso === escolhida.diaIso && vaga.turnoId < escolhida.turnoId)));
      if (melhor) {
        menor = quantos;
        escolhida = vaga;
        avaliacaoEscolhida = avaliacao;
      }
      if (quantos === 0) break; // não existe mais difícil que isso
    }

    const vaga = escolhida!;
    const { viaveis, bloqueios } = avaliacaoEscolhida!;
    pendentes.delete(chaveVaga(vaga));

    if (viaveis.length === 0) {
      vazias.push({
        diaIso: vaga.diaIso,
        turnoId: vaga.turnoId,
        indice: vaga.indice,
        razao: razaoDaVaga(bloqueios),
        bloqueios,
      });
      continue;
    }

    const melhorCandidato = viaveis.reduce((a, b) => (custo(a) <= custo(b) ? a : b));
    aplicar(estado, melhorCandidato);
    atribuicoes.set(chaveVaga(vaga), { vaga, pessoa: melhorCandidato.pessoa });
    vagaDaPessoaNoDia.set(chavePessoaDia(melhorCandidato.pessoa.id, vaga.diaIso), vaga);
    invalidarAoRedor(vaga.diaIso);
  }

  // ------------------------------------------------------------
  // 3 — reparo por troca simples.
  //
  // Para cada vaga vazia: alguém que caberia nela está ocupado em outro
  // turno hoje? Tira essa pessoa de lá, confirma que ela cabe na vaga
  // vazia, e procura um substituto pro lugar que ela deixou. Se os dois
  // lados fecharem, a troca vale um buraco a menos; se não, desfaz tudo
  // e a vaga continua vazia — o reparo nunca piora o plano.
  // ------------------------------------------------------------
  let reparosAplicados = 0;
  for (let i = vazias.length - 1; i >= 0; i--) {
    const vazia = vazias[i];
    const vagaVazia = vagaPorChave.get(chaveVaga(vazia))!;
    let resolvida = false;

    for (const pessoa of pessoas) {
      const origem = vagaDaPessoaNoDia.get(chavePessoaDia(pessoa.id, vazia.diaIso));
      if (!origem) continue; // livre hoje: já foi considerada e não coube

      const saindo = candidatoDe(origem, pessoa);
      desfazer(estado, saindo);

      const entrando = candidatoDe(vagaVazia, pessoa);
      if (verificar(estado, entrando, limites, turnosPorId).ok) {
        // Quem assume o turno que ela deixou? (ela mesma não, óbvio)
        const substitutos = pessoas
          .filter((p) => p.id !== pessoa.id)
          .map((p) => candidatoDe(origem, p))
          .filter((c) => verificar(estado, c, limites, turnosPorId).ok);

        if (substitutos.length > 0) {
          const substituto = substitutos.reduce((a, b) => (custo(a) <= custo(b) ? a : b));
          aplicar(estado, entrando);
          aplicar(estado, substituto);

          atribuicoes.set(chaveVaga(vagaVazia), { vaga: vagaVazia, pessoa });
          atribuicoes.set(chaveVaga(origem), { vaga: origem, pessoa: substituto.pessoa });
          vagaDaPessoaNoDia.delete(chavePessoaDia(pessoa.id, vazia.diaIso));
          vagaDaPessoaNoDia.set(chavePessoaDia(pessoa.id, vazia.diaIso), vagaVazia);
          vagaDaPessoaNoDia.set(
            chavePessoaDia(substituto.pessoa.id, origem.diaIso),
            origem,
          );

          vazias.splice(i, 1);
          reparosAplicados++;
          resolvida = true;
          break;
        }
      }

      aplicar(estado, saindo); // nada fechou: devolve a pessoa pro lugar dela
    }

    if (resolvida) continue;
  }

  // ------------------------------------------------------------
  // Folgas: o resíduo. Quem não ficou com vaga nenhuma no dia está de
  // folga — e o motivo é reconstruído aqui, não carregado pelo laço.
  // ------------------------------------------------------------
  const turnosComVagaNoDia = new Map<DiaIso, Set<number>>();
  for (const vaga of vagas) {
    const conjunto = turnosComVagaNoDia.get(vaga.diaIso) ?? new Set<number>();
    conjunto.add(vaga.turnoId);
    turnosComVagaNoDia.set(vaga.diaIso, conjunto);
  }

  const folgas: Folga[] = [];
  for (const pessoa of pessoas) {
    const ep = estado.porPessoa.get(pessoa.id)!;
    for (const dia of dias) {
      if (ep.turnoPorDia.has(dia.iso)) continue;

      if (dia.ehFeriadoMaster) {
        folgas.push({ pessoaId: pessoa.id, diaIso: dia.iso, motivo: 'feriado-master' });
        continue;
      }
      if (pessoa.ausencias.has(dia.iso)) {
        folgas.push({ pessoaId: pessoa.id, diaIso: dia.iso, motivo: 'ausencia' });
        continue;
      }

      // Ela estava de folga porque não sobrou vaga, ou porque nenhuma
      // vaga do dia a aceitaria? A segunda é informação útil ("o Sérgio
      // não podia trabalhar dia 12: 7 dias seguidos"), a primeira é só
      // o rodízio funcionando.
      const regraQueBloqueou = motivoDeBloqueio(
        pessoa,
        dia,
        turnosComVagaNoDia.get(dia.iso),
        estado,
        limites,
        turnosPorId,
      );
      folgas.push(
        regraQueBloqueou
          ? {
              pessoaId: pessoa.id,
              diaIso: dia.iso,
              motivo: 'bloqueio-de-regra',
              regra: regraQueBloqueou,
            }
          : { pessoaId: pessoa.id, diaIso: dia.iso, motivo: 'rodizio' },
      );
    }
  }

  const lista: Atribuicao[] = [...atribuicoes.values()]
    .map(({ vaga, pessoa }) => ({
      diaIso: vaga.diaIso,
      turnoId: vaga.turnoId,
      indice: vaga.indice,
      pessoaId: pessoa.id,
      foraDoPreferido:
        pessoa.turnoPreferido !== null && pessoa.turnoPreferido !== vaga.turnoId,
    }))
    .sort(
      (a, b) =>
        a.diaIso.localeCompare(b.diaIso) || a.turnoId - b.turnoId || a.indice - b.indice,
    );

  vazias.sort(
    (a, b) => a.diaIso.localeCompare(b.diaIso) || a.turnoId - b.turnoId,
  );

  return {
    atribuicoes: lista,
    folgas,
    vagasVazias: vazias,
    diagnosticos: diagnosticar(problema, estado, vazias, vagas),
    reparosAplicados,
  };
}

// ------------------------------------------------------------
// Apoio
// ------------------------------------------------------------

function razaoDaVaga(
  bloqueios: { pessoaId: number; regra: CodigoRegra }[],
): VagaVazia['razao'] {
  if (bloqueios.every((b) => b.regra === 'nao-habilitado')) return 'ninguem-habilitado';
  if (bloqueios.some((b) => b.regra === 'conflito')) return 'equipe-ocupada';
  return 'bloqueada-por-regra';
}

/**
 * Se a pessoa estivesse disponível hoje, alguma regra a impediria em
 * TODOS os turnos que tiveram vaga? Devolve a regra mais grave que
 * apareceu — é o que vira a explicação da folga na tela.
 */
function motivoDeBloqueio(
  pessoa: Pessoa,
  dia: Dia,
  turnosDoDia: Set<number> | undefined,
  estado: Estado,
  limites: ProblemaEscala['limites'],
  turnosPorId: Map<number, Turno>,
): CodigoRegra | null {
  if (!turnosDoDia || turnosDoDia.size === 0) return null;
  const regras: CodigoRegra[] = [];
  for (const turnoId of turnosDoDia) {
    const v = verificar(
      estado,
      { pessoa, dia, turno: turnosPorId.get(turnoId)! },
      limites,
      turnosPorId,
    );
    if (v.ok) return null; // cabia em pelo menos um: foi o rodízio, não bloqueio
    regras.push(v.regra);
  }
  // Qualificação não é bloqueio: é o desenho do posto.
  const relevantes = regras.filter((r) => r !== 'nao-habilitado');
  if (relevantes.length === 0) return null;
  // Mais de uma regra pode ter barrado a pessoa em turnos diferentes do
  // mesmo dia; a que vale é a mais grave, pra explicação não sair pela
  // regra menos importante que por acaso apareceu primeiro.
  const gravidade = ['RN07', 'RN06', 'RN05', 'RN04', 'RN02'] as const;
  for (const g of gravidade) if (relevantes.some((r) => r === g)) return g;
  return relevantes[0];
}

/**
 * Os diagnósticos saem, sempre que possível, do que REALMENTE aconteceu
 * (as vagas que ficaram vazias e as regras que as bloquearam), e não de
 * uma conta feita em paralelo. A versão anterior tinha cinco avisos
 * calculados à parte do resultado, o que abria espaço pra avisar de
 * problema que não houve — foi o caso do aviso falso de domingo em
 * abril/2026, quando a Páscoa já dava folga a todo mundo.
 */
function diagnosticar(
  problema: ProblemaEscala,
  estado: Estado,
  vazias: VagaVazia[],
  vagasConsideradas: Vaga[],
): Diagnostico[] {
  const { dias, pessoas, turnos, limites } = problema;
  const diagnosticos: Diagnostico[] = [];

  // Turno com vaga e ninguém qualificado: erro de cadastro, não de
  // escala. Vale como erro porque nenhuma geração vai resolver isso.
  const turnosComVaga = new Set(vagasConsideradas.map((v) => v.turnoId));
  for (const turnoId of turnosComVaga) {
    const habilitados = pessoas.filter(
      (p) =>
        p.turnosHabilitados.includes(turnoId) &&
        (limites.permitirForaDoPreferido ||
          p.turnoPreferido === null ||
          p.turnoPreferido === turnoId),
    );
    if (habilitados.length === 0) {
      diagnosticos.push({
        codigo: 'turno-sem-ninguem-habilitado',
        nivel: 'erro',
        dados: { turnoId, nome: turnos.find((t) => t.id === turnoId)?.nome },
      });
    }
  }

  // Domingo de folga. Conta o que de fato sobrou, e informa quantos
  // domingos o período tinha — é o número que explica o resultado
  // quando o mês tem menos domingos do que gente.
  //
  // Feriado master em domingo (a Páscoa é sempre um) fecha o posto:
  // todo mundo já tem domingo de folga e não há o que avisar. Foi um
  // aviso falso real em abril/2026 na versão anterior.
  const domingoFeriado = dias.some((d) => d.diaDaSemana === 0 && d.ehFeriadoMaster);
  const domingos = dias.filter((d) => d.diaDaSemana === 0 && !d.ehFeriadoMaster);
  const semDomingo = domingoFeriado
    ? []
    : pessoas.filter((p) => {
        const ep = estado.porPessoa.get(p.id)!;
        return domingos.length > 0 && ep.domingosTrabalhados >= domingos.length;
      });
  if (semDomingo.length > 0) {
    diagnosticos.push({
      codigo: 'sem-domingo-de-folga',
      nivel: 'aviso',
      dados: {
        pessoas: semDomingo.map((p) => ({ id: p.id, nome: p.nome })),
        domingosNoPeriodo: domingos.length,
        pessoasNoPosto: pessoas.length,
      },
    });
  }

  // Capacidade: a equipe dá conta da demanda dentro do ciclo?
  // Uma pessoa só pode trabalhar `cicloTrabalho` de cada
  // `cicloTrabalho + cicloDescanso` dias — o resto é folga obrigatória.
  const cicloLength = limites.cicloTrabalho + limites.cicloDescanso;
  const diasUteis = dias.filter((d) => !d.ehFeriadoMaster).length;
  const capacidade = Math.floor(
    (pessoas.length * diasUteis * limites.cicloTrabalho) / cicloLength,
  );
  if (vagasConsideradas.length > capacidade) {
    const faltam = Math.ceil(
      (vagasConsideradas.length - capacidade) /
        ((diasUteis * limites.cicloTrabalho) / cicloLength),
    );
    diagnosticos.push({
      codigo: 'pessoal-insuficiente',
      nivel: 'aviso',
      dados: {
        vagas: vagasConsideradas.length,
        capacidade,
        pessoasFaltando: faltam,
        pessoasAtuais: pessoas.length,
        ciclo: `${limites.cicloTrabalho}x${limites.cicloDescanso}`,
      },
    });
  }

  // As regras que mais deixaram vaga vazia viram aviso próprio, com a
  // contagem — é a diferença entre "sobraram 31 folgas descobertas" e
  // "31 vagas vazias, todas por interjornada entre estes dois turnos".
  const porRegra = new Map<CodigoRegra, number>();
  for (const vazia of vazias) {
    for (const regra of new Set(vazia.bloqueios.map((b) => b.regra))) {
      porRegra.set(regra, (porRegra.get(regra) ?? 0) + 1);
    }
  }
  if ((porRegra.get('RN05') ?? 0) > 0) {
    diagnosticos.push({
      codigo: 'interjornada-impossivel',
      nivel: 'aviso',
      dados: { vagasAfetadas: porRegra.get('RN05'), minimoHoras: limites.interjornada },
    });
  }
  if ((porRegra.get('RN04') ?? 0) > 0) {
    diagnosticos.push({
      codigo: 'carga-semanal-estoura',
      nivel: 'aviso',
      dados: { vagasAfetadas: porRegra.get('RN04'), limiteHoras: limites.horasSemana },
    });
  }

  // Demanda de um único dia acima do tamanho da equipe: nem com todo
  // mundo trabalhando fecha.
  const porDia = new Map<DiaIso, number>();
  for (const vaga of vagasConsideradas) {
    porDia.set(vaga.diaIso, (porDia.get(vaga.diaIso) ?? 0) + 1);
  }
  const maiorDemanda = Math.max(0, ...porDia.values());
  if (maiorDemanda > pessoas.length) {
    diagnosticos.push({
      codigo: 'demanda-acima-da-equipe',
      nivel: 'erro',
      dados: { maiorDemanda, pessoasNoPosto: pessoas.length },
    });
  }

  return diagnosticos;
}
