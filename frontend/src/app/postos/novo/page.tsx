import { apiGet } from "@/lib/api";
import { PostoForm } from "@/components/posto-form";

type Empresa = { id: number; nome: string };

export default async function NovoPostoPage() {
  const empresas = await apiGet<Empresa[]>("/empresas");

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Novo Posto de Trabalho
        </h1>

        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <PostoForm empresas={empresas} />
        </div>
      </div>
    </main>
  );
}
