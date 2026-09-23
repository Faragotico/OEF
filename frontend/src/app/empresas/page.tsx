import { apiGet } from "@/lib/api-server";
import { EmpresasList } from "@/components/empresas-list";

type Empresa = {
  id: number;
  nome: string;
  cnpj: string;
  contato: string | null;
};

export default async function EmpresasPage() {
  const empresas = await apiGet<Empresa[]>("/empresas");

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <EmpresasList empresas={empresas} />
      </div>
    </main>
  );
}
