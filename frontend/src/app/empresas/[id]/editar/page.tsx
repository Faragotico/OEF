import { apiGet } from "@/lib/api-server";
import { EmpresaForm } from "@/components/empresa-form";

type Empresa = {
  id: number;
  nome: string;
  cnpj: string;
  contato: string | null;
};

export default async function EditarEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresa = await apiGet<Empresa>(`/empresas/${id}`);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-text">
          Editar Empresa
        </h1>

        <div className="rounded-lg border border-border bg-card p-6">
          <EmpresaForm
            id={empresa.id}
            valoresIniciais={{
              nome: empresa.nome,
              cnpj: empresa.cnpj,
              contato: empresa.contato ?? "",
            }}
          />
        </div>
      </div>
    </main>
  );
}
