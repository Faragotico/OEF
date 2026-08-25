import { apiGet } from "@/lib/api";
import { TurnoForm } from "@/components/turno-form";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
};

export default async function EditarTurnoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const turno = await apiGet<Turno>(`/turno/${id}`);

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Editar Turno
        </h1>

        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <TurnoForm
            id={turno.id}
            valoresIniciais={{
              descricao: turno.descricao ?? "",
              horaInicio: turno.horaInicio,
              horaFim: turno.horaFim,
            }}
          />
        </div>
      </div>
    </main>
  );
}
