import { apiGet } from "@/lib/api-server";
import { TurnosList } from "@/components/turnos-list";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
  posto?: { nome: string } | null;
  demandaPorDiaDaSemana: number[];
};
type Posto = { id: number; nome: string; localizacao: string };

export default async function TurnosPage() {
  const [turnos, postos] = await Promise.all([
    apiGet<Turno[]>("/turnos"),
    apiGet<Posto[]>("/postos"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <TurnosList turnos={turnos} postos={postos} />
      </div>
    </main>
  );
}
