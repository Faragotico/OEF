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

// Foto da tela (captura em public/ajuda/). Mostrar onde fica cada coisa
// ajuda mais que descrever — foi um pedido da banca.
export type ImagemAjuda = {
  src: string;
  legenda: string;
};

export type AjudaPagina = {
  titulo: string;
  resumo: string;
  imagens?: ImagemAjuda[];
  secoes: SecaoAjuda[];
};

const img = (arquivo: string, legenda: string): ImagemAjuda => ({
  src: `/ajuda/${arquivo}.png`,
  legenda,
});

const INICIO: AjudaPagina = {
  titulo: "Tela inicial",
  resumo:
    "O OEF monta a escala de cada posto automaticamente, respeitando as regras trabalhistas. Os cartões levam a cada área; o menu lateral tem as mesmas áreas.",
  imagens: [img("inicio", "A tela inicial, com um cartão para cada área do sistema.")],
  secoes: [
    {
      titulo: "Primeira vez: cadastre nesta ordem",
      itens: [
        "Empresas: a empresa atendida (nome, CNPJ, endereço).",
        "Postos: os locais de trabalho de cada empresa.",
        "Turnos: os horários de cada posto e os dias da semana em que existem.",
        "Cargos: Porteiro, Recepcionista… (também dá para criar direto no cadastro do funcionário).",
        "Funcionários: cada pessoa com seu posto e seu turno de casa (ou como coringa).",
        "Regras (opcional): o padrão de rodízio (5x1, 6x1…). Sem mudar nada, valem os limites da CLT.",
      ],
    },
    {
      titulo: "Todo mês",
      itens: [
        "Ausências: lance férias, atestados e faltas ANTES de gerar, para a pessoa não ser escalada nesses dias.",
        "Escalas → “+ Gerar escala”: escolha o posto e o período, simule e gere.",
        "Abra a escala gerada, ajuste o que precisar na grade, valide e baixe o PDF para imprimir.",
        "Alocações: consulte quem trabalhou em qual dia e turno, de todas as escalas.",
      ],
    },
    {
      titulo: "Dicas",
      itens: [
        "Em qualquer tela, “Ajuda desta página” (menu lateral) explica aquela tela.",
        "O “?” ao lado de um campo dá uma dica rápida sobre ele. Campo com * é obrigatório.",
        "Nas listas de escolha (posto, cargo, funcionário…), clique e digite parte do nome para filtrar.",
        "No rodapé do menu: “Sair” encerra a sessão e o botão de tema troca entre claro e escuro.",
      ],
    },
  ],
};

const EMPRESAS: AjudaPagina = {
  titulo: "Empresas",
  resumo: "Empresas atendidas. Cada posto de trabalho pertence a uma empresa.",
  imagens: [img("empresas", "Lista de empresas, com busca e o botão “+ Nova Empresa”.")],
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Busque por nome, CNPJ ou telefone de contato.",
        "“+ Nova Empresa”: nome, CNPJ, cidade e rua são obrigatórios; o telefone é opcional.",
        "O CNPJ vai sem pontos nem barra (14 caracteres); o sistema confere se ele é válido.",
        "Editar corrige os dados; Excluir só funciona se a empresa não tiver postos.",
      ],
    },
    {
      titulo: "Próximo passo",
      itens: ["Cadastre os postos da empresa em Postos."],
    },
  ],
};

const POSTOS: AjudaPagina = {
  titulo: "Postos de trabalho",
  resumo: "Locais de trabalho de cada empresa. A escala é sempre montada por posto.",
  imagens: [img("postos", "Lista de postos: busca, filtro por empresa e “+ Novo Posto”.")],
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Busque por nome ou localização; o filtro de empresa mostra só os postos dela.",
        "“+ Novo Posto”: nome, localização e a empresa (digite para buscar na lista).",
        "Editar corrige os dados; Excluir só funciona se o posto não tiver escalas.",
      ],
    },
    {
      titulo: "Para o posto gerar escala",
      itens: [
        "Ele precisa de Turnos (os horários dele) e de Funcionários ligados a ele.",
      ],
    },
  ],
};

const TURNOS: AjudaPagina = {
  titulo: "Turnos",
  resumo: "Os horários de cada posto e em que dias da semana cada um existe.",
  imagens: [img("turnos", "Turnos de cada posto, com os dias da semana em que cada um existe.")],
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Busque pela descrição ou filtre por posto.",
        "“+ Novo Turno”: início, fim e o posto. A descrição (Manhã, Abertura…) é opcional.",
        "Depois de escolher o posto, clique nos dias da semana para abrir ou fechar o turno. Dia fechado não gera vaga.",
        "Excluir só funciona se o turno não estiver em nenhuma escala.",
      ],
    },
    {
      titulo: "Bom saber",
      itens: [
        "Sem turno no domingo = mais gente de folga no domingo.",
        "Para cobrir um pico, cadastre outro turno com horário próprio.",
        "Turno sem posto é avulso: não entra na grade de nenhum posto.",
      ],
    },
  ],
};

const CARGOS: AjudaPagina = {
  titulo: "Cargos",
  resumo: "Lista de cargos para escolher no cadastro de funcionário.",
  imagens: [img("cargos", "Cargos cadastrados e quantos funcionários usam cada um.")],
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "“+ Novo Cargo” cadastra um nome (ex.: Porteiro, Recepcionista).",
        "Editar renomeia o cargo para todos os funcionários que o usam.",
        "Excluir só funciona se nenhum funcionário estiver com o cargo.",
        "No cadastro do funcionário também dá para criar: digite o nome e clique em “+ Cadastrar”.",
      ],
    },
    {
      titulo: "Bom saber",
      itens: ["O cargo é só informativo: não muda a escala."],
    },
  ],
};

const FUNCIONARIOS: AjudaPagina = {
  titulo: "Funcionários",
  resumo: "A equipe de cada posto e como cada pessoa entra na escala.",
  imagens: [
    img("funcionarios", "Lista de funcionários com busca e filtros de posto e status."),
    img("funcionario-form", "Cadastro de funcionário: cargo e posto são escolhidos na lista (dá para digitar e buscar)."),
  ],
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Busque por nome, CPF, telefone ou cargo; filtre por posto.",
        "A lista abre só com Ativos; troque o filtro para ver Inativos ou Todos.",
        "“+ Novo Funcionário”: nome, CPF (11 números) e carga horária semanal são obrigatórios.",
        "Cargo e posto: clique e digite parte do nome. O posto também é achado pelo nome da empresa.",
        "Cargo que não existe: digite o nome e clique em “+ Cadastrar”.",
      ],
    },
    {
      titulo: "Campos da escala",
      itens: [
        "Turno de casa: o horário em que a geração escala a pessoa.",
        "É coringa: sem horário fixo; marque os turnos que ela pode cobrir.",
        "Também pode cobrir: outros turnos que um titular aceita fazer (só usados se a geração permitir).",
        "Nunca trabalha em: dias da semana em que a pessoa não é escalada.",
        "Sem turno de casa e sem nenhum turno marcado, a pessoa fica fora da geração (aparece o aviso de cadastro incompleto).",
      ],
    },
    {
      titulo: "Saiu da empresa?",
      itens: [
        "Edite e marque como Inativo: some das próximas escalas e o histórico fica.",
        "Excluir só funciona para quem nunca foi escalado nem teve ausência.",
      ],
    },
  ],
};

const AUSENCIAS: AjudaPagina = {
  titulo: "Ausências",
  resumo: "Férias, atestados, faltas e outros afastamentos.",
  imagens: [img("ausencias", "Ausências cadastradas no período.")],
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Busque por funcionário ou motivo; De/Até filtra o período (abre no mês atual).",
        "“+ Nova Ausência”: escolha a pessoa (digite para buscar), o período e o motivo.",
        "Compensação é opcional (ex.: reposta em outro dia).",
      ],
    },
    {
      titulo: "Efeito na escala",
      itens: [
        "Lance a ausência ANTES de gerar: a geração não escala a pessoa nesses dias.",
        "Escala já pronta não muda sozinha: abra a escala e use “Validar escala” para ver os dias em conflito, depois ajuste na grade.",
      ],
    },
  ],
};

const REGRAS: AjudaPagina = {
  titulo: "Regras trabalhistas",
  resumo: "Padrões de rodízio e limites usados ao gerar e validar escalas.",
  imagens: [img("regras", "Limites do sistema (em cima) e padrões de rodízio (embaixo).")],
  secoes: [
    {
      titulo: "Limites do sistema",
      itens: [
        "Carga semanal máxima, descanso entre jornadas e pausa dentro do turno.",
        "Sem mexer, valem os padrões da CLT (aparece “(padrão)” ao lado do valor).",
        "“+ Definir valor personalizado” troca o padrão; “Editar” muda um valor já definido.",
        "O descanso semanal (no máximo 6 dias seguidos) é fixo por lei e não muda.",
      ],
    },
    {
      titulo: "Padrões de rodízio",
      itens: [
        "Quantos dias a pessoa trabalha antes de folgar (ex.: 5x1, 6x1).",
        "“+ Novo padrão” cadastra um; “Marcar como padrão” define o usado quando ninguém escolhe outro.",
        "Em cada “Gerar escala” dá para escolher outro padrão.",
        "Só pode ser excluído se nenhuma escala usa.",
      ],
    },
    {
      titulo: "Regras antigas",
      itens: ["Não têm efeito na geração e podem ser excluídas."],
    },
  ],
};

const ESCALAS: AjudaPagina = {
  titulo: "Escalas",
  resumo: "Escalas geradas, por posto e período.",
  imagens: [img("escalas", "Escalas geradas: “Abrir →” mostra a grade e “PDF ↓” baixa para imprimir.")],
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Filtre por posto (digite para buscar) e pelo período (De/Até).",
        "“+ Gerar escala” monta uma escala nova automaticamente.",
        "“Abrir →” mostra a grade para conferir e ajustar.",
        "“PDF ↓” baixa a escala pronta para imprimir.",
        "Excluir apaga a escala e todos os dias dela (pede confirmação).",
      ],
    },
  ],
};

const GERAR: AjudaPagina = {
  titulo: "Gerar escala",
  resumo: "Monta a escala de um posto num período, respeitando as regras trabalhistas.",
  imagens: [img("gerar-escala", "Formulário de geração: posto, período, padrão de rodízio e equipe.")],
  secoes: [
    {
      titulo: "Passo a passo",
      itens: [
        "Escolha o posto e as datas de início e fim.",
        "Padrão de rodízio é opcional: sem escolher, vale o marcado como padrão em Regras.",
        "Em “Equipe deste posto”, desmarque quem não deve entrar nesta escala.",
        "“Deixar um titular cobrir turno que não é o dele”: desligado, cada um fica no seu horário o mês todo.",
        "“Simular” mostra o resultado sem salvar; “Gerar e salvar” cria a escala e abre a grade.",
      ],
    },
    {
      titulo: "Antes de gerar",
      itens: [
        "Lance as ausências do período (férias, atestados), senão a pessoa é escalada nesses dias.",
        "Funcionário com cadastro incompleto não aparece na equipe: o aviso amarelo diz quem é.",
        "Se a grade pede mais coberturas do que a equipe dá conta, aparece um aviso: algumas vagas ficarão vazias.",
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
  imagens: [img("escala-grade", "A grade: uma linha por dia, uma coluna por funcionário. Clique numa célula para trocar.")],
  secoes: [
    {
      titulo: "Lendo a grade",
      itens: [
        "Ponto (·): a pessoa trabalha no turno de casa dela.",
        "F: folga. Passe o mouse para ver o motivo (ex.: ausência).",
        "Horário colorido: turno diferente do de casa (troca, substituição ou coringa).",
        "No topo de cada coluna: turno de casa e total de horas no período.",
      ],
    },
    {
      titulo: "Ajustando",
      itens: [
        "Clique numa célula e escolha o turno do dia ou Folga.",
        "“Salvo, mas: …” em amarelo: a mudança foi salva, porém quebra alguma regra.",
        "Para cobrir com alguém de outro posto: escolha a pessoa em “Cobrir com funcionário de outro posto…” e clique em Adicionar. O “× remover” tira a coluna se ela estiver vazia.",
      ],
    },
    {
      titulo: "Conferindo e imprimindo",
      itens: [
        "“Validar escala” confere carga semanal, descanso entre jornadas, dias seguidos, domingo de folga e vagas sem cobertura.",
        "“Gerar PDF ↓” baixa a escala para imprimir (em preto e branco, para gastar pouca tinta).",
      ],
    },
  ],
};

const ALOCACOES: AjudaPagina = {
  titulo: "Alocações",
  resumo: "Consulta de todos os dias trabalhados, de todas as escalas.",
  imagens: [img("alocacoes", "Todas as alocações, com filtros por funcionário, turno e escala.")],
  secoes: [
    {
      titulo: "Como usar",
      itens: [
        "Filtre por funcionário, turno, escala (digite para buscar), substituído (Sim/Não) e período.",
        "A lista mostra 25 por página.",
        "Serve para responder “quem trabalhou tal dia?” ou “onde fulano esteve no mês?”.",
      ],
    },
    {
      titulo: "Para alterar",
      itens: ["Esta tela é só consulta: abra a escala (Escalas → Abrir →) e edite na grade."],
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
  cargos: CARGOS,
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
