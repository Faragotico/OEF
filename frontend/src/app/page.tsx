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
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 animate-fade-in-up border-2 border-black bg-red-600 p-6 text-white shadow-[4px_4px_0_0_#000]">
          <h1 className="text-2xl font-black uppercase tracking-wide">
            OEF — Organizador de Escalas de Funcionários
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-red-100">
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
              className="oef-lift group flex animate-fade-in-up flex-col gap-1 border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] transition-colors hover:bg-red-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:bg-zinc-900 dark:hover:bg-red-950/20"
            >
              <span className="text-sm font-black uppercase tracking-wide text-black group-hover:text-red-700 dark:text-zinc-50 dark:group-hover:text-red-400">
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
