// Textos da ajuda contextual — o botão "Ajuda desta página" (menu lateral)
// abre um painel com o conteúdo da tela em que a pessoa está.
//
// Fica num arquivo só, separado do componente, por dois motivos: quem
// mantém o sistema edita TEXTO aqui sem mexer em React, e o mapeamento
// rota → ajuda é uma função pura, fácil de conferir.
//
// Regra de escrita: curto, no imperativo, só o que a pessoa faz naquela
// tela. Explicação longa de um campo vai no "?" (componente Dica), não aqui.

export type SecaoAjuda = {
  titulo: string;
  itens: string[];
};

export type AjudaPagina = {
  titulo: string;
  resumo: string;
  secoes: SecaoAjuda[];
};

const INICIO: AjudaPagina = {
  titulo: "Tela inicial",
  resumo: "Atalhos para cada área do sistema.",
  secoes: [
    {
      titulo: "Por onde começar",
      itens: [
        "Cadastre a Empresa e, dentro dela, o Posto de trabalho.",
        "Crie os Turnos do posto (horário e dias da semana).",
        "Cadastre os Funcionários e ligue cada um a um posto.",
        "Em Escalas, clique em “+ Gerar escala” para montar o período.",
      ],
    },
    {
      titulo: "Dicas",
      itens: [
        "Em qualquer tela, o botão “Ajuda desta página” (menu lateral) explica como usá-la.",
        "O “?” ao lado de um campo dá uma dica rápida sobre ele.",
      ],
    },
  ],
};

const EMPRESAS: AjudaPagina = {
  titulo: "Empresas",
  resumo: "Empresas atendidas. Cada posto de trabalho pertence a uma empresa.",
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Use a busca para achar por nome, CNPJ ou contato.",
        "“+ Nova Empresa” abre o formulário numa janela.",
        "Para corrigir um dado, use Editar na linha.",
        "Excluir só funciona se a empresa não tiver postos vinculados.",
      ],
    },
  ],
};

const POSTOS: AjudaPagina = {
  titulo: "Postos de trabalho",
  resumo: "Locais onde as escalas são montadas.",
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Busque por nome ou localização; o filtro de empresa mostra só os postos de uma delas.",
        "“+ Novo Posto”: informe nome, localização e a empresa.",
        "Um posto só gera escala se tiver Turnos e Funcionários.",
        "Excluir só funciona se o posto não tiver escalas vinculadas.",
      ],
    },
  ],
};

const TURNOS: AjudaPagina = {
  titulo: "Turnos",
  resumo: "Horários de trabalho de cada posto.",
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Busque pela descrição ou filtre por posto.",
        "“+ Novo Turno”: informe início, fim, o posto e os dias da semana.",
        "Nos dias, clique para abrir ou fechar. Dia fechado não gera vaga.",
        "Excluir só funciona se não houver alocações vinculadas ao turno.",
      ],
    },
    {
      titulo: "Bom saber",
      itens: [
        "Sem turno no domingo, mais gente fica de folga.",
        "Para cobrir um pico, cadastre outro turno com horário próprio.",
        "Turno sem posto é avulso: não entra na grade de nenhum posto.",
      ],
    },
  ],
};

const FUNCIONARIOS: AjudaPagina = {
  titulo: "Funcionários",
  resumo: "Equipe cadastrada e o posto de cada pessoa.",
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Busque por nome, CPF, telefone ou cargo.",
        "A lista abre só com Ativos; troque o filtro para ver Inativos ou Todos.",
        "“+ Novo Funcionário”: nome, CPF (11 dígitos) e carga horária semanal são obrigatórios.",
        "Excluir só funciona se a pessoa não tiver alocações; para tirá-la das próximas escalas, edite e marque como Inativo.",
      ],
    },
    {
      titulo: "Campos da escala",
      itens: [
        "Turno de casa: horário em que a geração escala a pessoa.",
        "Coringa: cobre mais de um turno; marque quais.",
        "Nunca trabalha em: dias da semana em que ela não é escalada.",
      ],
    },
  ],
};

const AUSENCIAS: AjudaPagina = {
  titulo: "Ausências",
  resumo: "Férias, atestados, faltas e outros afastamentos.",
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Busque por funcionário ou motivo; De/Até filtra o período (abre no mês atual).",
        "“+ Nova Ausência”: escolha a pessoa, o período e o motivo. Compensação é opcional.",
      ],
    },
    {
      titulo: "Efeito na escala",
      itens: [
        "A ausência vale para as próximas gerações: a pessoa não é escalada nesses dias.",
        "Uma escala já pronta não muda sozinha; ajuste os dias afetados na grade.",
      ],
    },
  ],
};

const REGRAS: AjudaPagina = {
  titulo: "Regras trabalhistas",
  resumo: "Padrões de rodízio e limites usados ao gerar e validar escalas.",
  secoes: [
    {
      titulo: "Padrão de rodízio",
      itens: [
        "Define quantos dias a pessoa trabalha antes de folgar (ex.: 5x1, 6x1).",
        "“+ Novo padrão” cadastra um; você escolhe qual usar em cada “Gerar escala”.",
        "Só pode ser excluído se nenhuma escala usa.",
      ],
    },
    {
      titulo: "Limites do sistema",
      itens: [
        "“Nova Regra” ajusta a carga semanal máxima, o descanso entre jornadas e a pausa dentro do turno.",
        "Sem cadastro, valem os limites da CLT. Só cadastre se quiser um valor diferente.",
        "“Regras antigas” não têm efeito e podem ser excluídas.",
      ],
    },
  ],
};

const ESCALAS: AjudaPagina = {
  titulo: "Escalas",
  resumo: "Escalas geradas por posto e período.",
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Filtre por posto e pelo período (De/Até).",
        "“+ Gerar escala” monta uma nova escala automaticamente.",
        "“Abrir →” mostra a grade para conferir e ajustar; “PDF ↓” baixa para imprimir.",
        "Excluir apaga também todas as alocações da escala (pede confirmação).",
      ],
    },
  ],
};

const GERAR: AjudaPagina = {
  titulo: "Gerar escala",
  resumo: "Monta a escala de um posto num período, respeitando as regras trabalhistas.",
  secoes: [
    {
      titulo: "Passo a passo",
      itens: [
        "Escolha o posto e as datas de início e fim.",
        "O padrão de rodízio é opcional. Confira a equipe do posto antes de gerar.",
        "“Simular” mostra o resultado sem salvar; “Gerar” cria a escala de verdade.",
        "Depois, a escala abre na grade para você ajustar o que precisar.",
      ],
    },
    {
      titulo: "Entendendo os avisos",
      itens: [
        "Vermelho: precisa de atenção. Amarelo: vale conferir. Cinza: só informação.",
        "Vaga vazia: ninguém pôde cobrir sem quebrar uma regra. Resolva na grade.",
        "Cada aviso traz o que fazer para resolver.",
      ],
    },
  ],
};

const ESCALA_DETALHE: AjudaPagina = {
  titulo: "Grade da escala",
  resumo: "Uma linha por dia, uma coluna por funcionário.",
  secoes: [
    {
      titulo: "Ajustando a escala",
      itens: [
        "Clique numa célula para escolher o turno do dia ou folga.",
        "Legenda: F = folga, · = sem alocação, cor = turno.",
        "“Salvo, mas: …” em amarelo: a mudança foi feita, porém quebra alguma regra.",
        "Para cobrir um furo com alguém de outro posto, use “Cobrir com funcionário de outro posto…”; o “× remover” tira a coluna se ela estiver vazia.",
      ],
    },
    {
      titulo: "Conferindo",
      itens: [
        "“Validar escala” confere carga semanal, descanso entre jornadas, dias seguidos, domingo de folga e cobertura das vagas.",
        "“PDF” baixa a escala para imprimir.",
      ],
    },
  ],
};

const ALOCACOES: AjudaPagina = {
  titulo: "Alocações",
  resumo: "Lista de todos os turnos alocados, de todas as escalas.",
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Filtre por funcionário, turno, escala, substituído (Sim/Não) e período.",
        "A lista mostra 25 por página.",
        "Para alterar um dia, abra a escala (Escalas → Abrir) e edite na grade.",
      ],
    },
  ],
};

// /xxx/novo e /xxx/[id]/editar são telas de cadastro de uma lista; a
// ajuda delas é a da própria lista (o formulário abre em janela por cima).
const POR_SECAO: Record<string, AjudaPagina> = {
  empresas: EMPRESAS,
  postos: POSTOS,
  turnos: TURNOS,
  funcionarios: FUNCIONARIOS,
  ausencias: AUSENCIAS,
  regras: REGRAS,
  alocacoes: ALOCACOES,
};

export function ajudaDaRota(pathname: string): AjudaPagina | null {
  const partes = pathname.split("?")[0].split("/").filter(Boolean);

  if (partes.length === 0) return INICIO;

  const [secao, segundo] = partes;

  if (secao === "escalas") {
    if (partes.length === 1) return ESCALAS;
    if (segundo === "gerar") return GERAR;
    return ESCALA_DETALHE;
  }

  return POR_SECAO[secao] ?? null;
}
