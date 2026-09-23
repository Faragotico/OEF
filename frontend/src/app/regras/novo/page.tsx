import { RegraForm } from "@/components/regra-form";

// Sugestão de descrição+valor quando se chega aqui pelo botão "+
// Definir valor customizado" de um dos cards de configuração geral (ver
// /regras/page.tsx) — só pré-preenche o formulário, não trava o tipo:
// o gestor ainda pode trocar antes de salvar.
const SUGESTOES: Record<"carga_horaria_semanal" | "intervalo_interjornada", { descricao: string; valor: string }> = {
  carga_horaria_semanal: {
    descricao: "Carga horária semanal máxima de 44 horas",
    valor: "44",
  },
  intervalo_interjornada: {
    descricao: "Intervalo mínimo entre jornadas de 11 horas",
    valor: "11",
  },
};

export default async function NovaRegraPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const sugestao =
    tipo === "carga_horaria_semanal" || tipo === "intervalo_interjornada"
      ? SUGESTOES[tipo]
      : undefined;

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-text">
          Nova Regra
        </h1>

        <div className="rounded-lg border border-border bg-card p-6">
          <RegraForm
            valoresIniciais={
              sugestao && tipo
                ? {
                    descricao: sugestao.descricao,
                    tipo: tipo as "carga_horaria_semanal" | "intervalo_interjornada",
                    valor: sugestao.valor,
                  }
                : undefined
            }
          />
        </div>
      </div>
    </main>
  );
}
