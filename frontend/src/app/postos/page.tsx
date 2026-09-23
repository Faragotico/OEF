import { apiGet } from "@/lib/api-server";
import { PostosList } from "@/components/postos-list";

type Empresa = { id: number; nome: string };
type Posto = {
  id: number;
  nome: string;
  localizacao: string;
  empresaId: number;
};

export default async function PostosPage() {
  const [postos, empresas] = await Promise.all([
    apiGet<Posto[]>("/postos"),
    apiGet<Empresa[]>("/empresas"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <PostosList postos={postos} empresas={empresas} />
      </div>
    </main>
  );
}
