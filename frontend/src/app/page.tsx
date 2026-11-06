import Link from "next/link";

// Mesma ordem do menu lateral: a ordem em que se cadastra (quem depende
// de quem) e, no fim, o uso do dia a dia.
const SECOES = [
  {
    href: "/empresas",
    titulo: "Empresas",
    descricao: "Empresas atendidas. Cada posto pertence a uma delas.",
  },
  {
    href: "/regras",
    titulo: "Regras Trabalhistas",
    descricao: "Padrão de rodízio (5x1, 6x1…) e limites da CLT usados na geração.",
  },
  {
    href: "/postos",
    titulo: "Postos de Trabalho",
    descricao: "Locais de trabalho. A escala é montada por posto.",
  },
  {
    href: "/turnos",
    titulo: "Turnos",
    descricao: "Horários de cada posto e os dias da semana em que existem.",
  },
  {
    href: "/cargos",
    titulo: "Cargos",
    descricao: "Lista de cargos (Porteiro, Recepcionista…) para o cadastro.",
  },
  {
    href: "/funcionarios",
    titulo: "Funcionários",
    descricao: "Equipe de cada posto, turno de casa, coringas e status.",
  },
  {
    href: "/ausencias",
    titulo: "Ausências",
    descricao: "Férias, atestados e faltas — a pessoa não é escalada no período.",
  },
  {
    href: "/escalas",
    titulo: "Escalas",
    descricao: "Gera a escala do mês, ajusta na grade e baixa o PDF.",
  },
  {
    href: "/alocacoes",
    titulo: "Alocações",
    descricao: "Consulta de quem trabalhou em cada dia e turno.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 animate-fade-in-up rounded-lg bg-primary p-6 text-white">
          <h1 className="text-2xl font-black uppercase tracking-wide">
            OEF — Organizador de Escalas de Funcionários
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/80">
            Cadastro de funcionários, postos e turnos, geração automática
            de escala com rodízio de folga e coringa de cobertura,
            respeitando as regras trabalhistas — tudo num só lugar.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECOES.map((s, i) => (
            <Link
              key={s.href}
              href={s.href}
              style={{ animationDelay: `${i * 60}ms` }}
              className="oef-lift group flex animate-fade-in-up flex-col gap-1 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-text/5"
            >
              <span className="text-sm font-black uppercase tracking-wide text-text group-hover:text-primary">
                {s.titulo} →
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {s.descricao}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
