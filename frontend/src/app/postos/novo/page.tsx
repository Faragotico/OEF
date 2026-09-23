import { apiGet } from "@/lib/api-server";
import { PostoForm } from "@/components/posto-form";

type Empresa = { id: number; nome: string };

export default async function NovoPostoPage() {
  const empresas = await apiGet<Empresa[]>("/empresas");

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-text">
          Novo Posto de Trabalho
        </h1>

        <div className="rounded-lg border border-border bg-card p-6">
          <PostoForm empresas={empresas} />
        </div>
      </div>
    </main>
  );
}
