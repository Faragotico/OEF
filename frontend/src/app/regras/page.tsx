import { apiGet } from "@/lib/api";
import { RegrasList } from "@/components/regras-list";

type Regra = {
  id: number;
  descricao: string;
  tipo: string;
  valor: string;
  padrao: boolean;
};

export default async function RegrasPage() {
  const regras = await apiGet<Regra[]>("/regras");

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-4xl">
        <RegrasList regras={regras} />
      </div>
    </main>
  );
}
