import { EmpresaForm } from "@/components/empresa-form";

export default function NovaEmpresaPage() {
  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-text">
          Nova Empresa
        </h1>

        <div className="rounded-lg border border-border bg-card p-6">
          <EmpresaForm />
        </div>
      </div>
    </main>
  );
}
