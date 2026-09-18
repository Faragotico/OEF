import Link from "next/link";
import { apiGet } from "@/lib/api";
import { RegraForm } from "@/components/regra-form";

type Regra = {
  id: number;
  descricao: string;
  tipo: string;
  valor: string;
};

// Mesma lista de tipos válidos do CreateRegraDto/RegraForm. Precisa
// existir aqui de novo (não importamos do RegraForm) porque o guard
// abaixo decide se renderiza o form ou não, antes de o form em si
// existir.
const TIPOS_VALIDOS = new Set(["escala", "carga_horaria_semanal", "intervalo_interjornada"]);

export default async function EditarRegraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const regra = await apiGet<Regra>(`/regras/${id}`);

  // Regra com tipo antigo (de antes deste rework — ex:
  // "intervalo_intrajornada"/"descanso_semanal"), que já não é mais um
  // tipo aceito pelo sistema. O RegraForm usa um <select> fechado e não
  // tem como representar um valor que não está nas opções, então nem
  // tentamos renderizá-lo aqui — só orientamos a excluir e recriar com
  // um tipo válido, se for o caso.
  if (!TIPOS_VALIDOS.has(regra.tipo)) {
    return (
      <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
        <div className="mx-auto max-w-xl">
          <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
            Editar Regra
          </h1>
          <div className="border-2 border-black bg-red-100 p-6 text-sm text-red-900 shadow-[4px_4px_0_0_#000] dark:bg-red-950/40 dark:text-red-100">
            <p className="mb-2 font-bold">
              Esta regra tem um tipo antigo (&quot;{regra.tipo}&quot;) que não existe
              mais no sistema.
            </p>
            <p>
              Ela nunca teve efeito na geração ou validação de escalas, e não
              pode ser editada por aqui. Se não precisa mais dela, exclua-a na
              lista de regras. Se quiser algo equivalente, cadastre uma regra
              nova com um dos tipos atuais.
            </p>
          </div>
          <Link
            href="/regras"
            className="mt-6 inline-block border-2 border-black bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-black shadow-[4px_4px_0_0_#000] transition-all hover:bg-zinc-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:bg-zinc-900 dark:text-white"
          >
            ← Voltar para Regras
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Editar Regra
        </h1>

        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <RegraForm
            id={regra.id}
            valoresIniciais={{
              descricao: regra.descricao,
              tipo: regra.tipo as "escala" | "carga_horaria_semanal" | "intervalo_interjornada",
              valor: regra.valor,
            }}
          />
        </div>
      </div>
    </main>
  );
}
