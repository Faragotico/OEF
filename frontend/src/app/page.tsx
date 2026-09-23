import Link from "next/link";

const SECOES = [
  {
    href: "/funcionarios",
    titulo: "Funcionários",
    descricao: "Cadastro, turno padrão e status de cada funcionário.",
  },
  {
    href: "/ausencias",
    titulo: "Ausências",
    descricao: "Faltas, atestados e licenças — nunca aloca alguém no período.",
  },
  {
    href: "/empresas",
    titulo: "Empresas",
    descricao: "Empresas contratantes atendidas pela Sharon Pontes.",
  },
  {
    href: "/postos",
    titulo: "Postos de Trabalho",
    descricao: "Locais onde os funcionários são alocados.",
  },
  {
    href: "/turnos",
    titulo: "Turnos",
    descricao: "Períodos de trabalho disponíveis no sistema.",
  },
  {
    href: "/regras",
    titulo: "Regras Trabalhistas",
    descricao: "Regras da CLT aplicadas na geração automática.",
  },
  {
    href: "/alocacoes",
    titulo: "Alocações",
    descricao: "Todas as alocações já geradas, com filtros.",
  },
  {
    href: "/escalas",
    titulo: "Escalas",
    descricao: "Gera escalas automaticamente e revisa cada uma.",
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
