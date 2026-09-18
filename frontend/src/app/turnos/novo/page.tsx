import { apiGet } from "@/lib/api";
import { TurnoForm } from "@/components/turno-form";

type Posto = { id: number; nome: string; localizacao: string };

export default async function NovoTurnoPage() {
  // O turno agora pertence a um posto (é a grade de horários dele),
  // então a lista de postos precisa vir junto pro formulário.
  const postos = await apiGet<Posto[]>("/postos");

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Novo Turno
        </h1>

        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <TurnoForm postos={postos} />
        </div>
      </div>
    </main>
  );
}
