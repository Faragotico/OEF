import { apiGet } from "@/lib/api-server";
import { TurnoForm } from "@/components/turno-form";

type Posto = { id: number; nome: string; localizacao: string };

export default async function NovoTurnoPage() {
  // O turno agora pertence a um posto (é a grade de horários dele),
  // então a lista de postos precisa vir junto pro formulário.
  const postos = await apiGet<Posto[]>("/postos");

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-text">
          Novo Turno
        </h1>

        <div className="rounded-lg border border-border bg-card p-6">
          <TurnoForm postos={postos} />
        </div>
      </div>
    </main>
  );
}
