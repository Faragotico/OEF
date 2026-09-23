import { apiGet } from "@/lib/api-server";
import { TurnoForm } from "@/components/turno-form";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
  demandaPorDiaDaSemana: number[];
};
type Posto = { id: number; nome: string; localizacao: string };

export default async function EditarTurnoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [turno, postos] = await Promise.all([
    apiGet<Turno>(`/turnos/${id}`),
    apiGet<Posto[]>("/postos"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-text">
          Editar Turno
        </h1>

        <div className="rounded-lg border border-border bg-card p-6">
          <TurnoForm
            id={turno.id}
            postos={postos}
            valoresIniciais={{
              descricao: turno.descricao ?? "",
              horaInicio: turno.horaInicio,
              horaFim: turno.horaFim,
              postoId: turno.postoId ? String(turno.postoId) : "",
              demandaPorDiaDaSemana: turno.demandaPorDiaDaSemana,
            }}
          />
        </div>
      </div>
    </main>
  );
}
