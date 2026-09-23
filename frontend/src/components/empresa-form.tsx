"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/api";
import { formatarTelefone } from "@/lib/telefone";

const inputClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

type ValoresEmpresa = {
  nome: string;
  cnpj: string;
  contato: string;
};

// Um form só, reaproveitado em "Nova empresa" e "Editar empresa" — a
// única diferença entre os dois é POST vs PATCH e os valores iniciais.
export function EmpresaForm({
  id,
  valoresIniciais,
  onSalvo,
}: {
  id?: number;
  valoresIniciais?: ValoresEmpresa;
  // Chamado após salvar com sucesso, no lugar de navegar pra
  // "/empresas" — quem abre este form dentro de um Modal passa isso
  // pra só fechar o popup (a lista por trás já se atualiza sozinha
  // via router.refresh()).
  onSalvo?: () => void;
}) {
  const router = useRouter();
  const modoEdicao = id !== undefined;
  const [form, setForm] = useState<ValoresEmpresa>(
    valoresIniciais ?? { nome: "", cnpj: "", contato: "" },
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      nome: form.nome,
      cnpj: form.cnpj,
      contato: form.contato || undefined,
    };

    try {
      if (modoEdicao) {
        await apiPatch(`/empresas/${id}`, payload);
      } else {
        await apiPost("/empresas", payload);
      }
      if (onSalvo) {
        onSalvo();
      } else {
        router.push("/empresas");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-text">
        Nome
        <input
          required
          minLength={3}
          maxLength={100}
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text">
        CNPJ (14 caracteres alfanuméricos, sem máscara)
        <input
          required
          // maxLength alto de propósito, mesmo o campo sendo "sem
          // máscara": se colar um CNPJ formatado (ex:
          // "12.345.678/9001-23", 18 caracteres), precisa caber o texto
          // colado inteiro ANTES de limpar — com maxLength=14 o
          // navegador cortava o texto colado no meio, perdendo dígitos
          // reais do CNPJ. Ponto/barra/hífen digitados na mão são só
          // descartados na hora (replace abaixo), não ficam visíveis —
          // por isso o rótulo não promete manter a máscara.
          maxLength={20}
          placeholder="12345678900123"
          value={form.cnpj}
          onChange={(e) =>
            setForm({
              ...form,
              cnpj: e.target.value
                .replace(/[^a-zA-Z0-9]/g, "")
                .toUpperCase()
                .slice(0, 14),
            })
          }
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text">
        Contato (telefone, opcional)
        <input
          type="tel"
          maxLength={15}
          placeholder="(42) 3222-0000"
          pattern="\(\d{2}\) \d{4,5}-\d{4}"
          title="Telefone no formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX"
          value={form.contato}
          onChange={(e) =>
            // Só dígito entra de fato — letra e símbolo digitado são
            // descartados, e "(", ")", espaço e "-" são inseridos
            // automaticamente pela máscara (ver lib/telefone.ts).
            setForm({ ...form, contato: formatarTelefone(e.target.value) })
          }
          className={inputClass}
        />
      </label>

      {error && (
        <p className="rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
