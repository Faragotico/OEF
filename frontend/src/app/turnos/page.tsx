import { apiGet } from "@/lib/api";
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
  // Rota no backend é singular: /turno (as demais são plural).
  const [turnos, postos] = await Promise.all([
    apiGet<Turno[]>("/turno"),
    apiGet<Posto[]>("/postos"),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <TurnosList turnos={turnos} postos={postos} />
      </div>
    </main>
  );
}
