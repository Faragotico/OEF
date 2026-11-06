"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/api";
import { DeleteButton } from "@/components/delete-button";
import { Modal } from "@/components/modal";
import { Aviso } from "@/components/aviso";
import { Rotulo } from "@/components/rotulo";

export type Cargo = { id: number; nome: string; funcionarios: number };

type EstadoModal = { modo: "novo" } | { modo: "editar"; cargo: Cargo } | null;

// Tela de cargos: mesmo padrão das outras listas (busca pela URL,
// cadastro/edição em popup, excluir com confirmação).
export function CargosList({
  cargos,
  buscaAtual,
}: {
  cargos: Cargo[];
  buscaAtual: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [modal, setModal] = useState<EstadoModal>(null);
  const [busca, setBusca] = useState(buscaAtual);

  function buscar(e: FormEvent) {
    e.preventDefault();
    const texto = busca.trim();
    router.push(texto ? `${pathname}?busca=${encodeURIComponent(texto)}` : pathname);
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Cargos</h1>
        <button
          type="button"
          onClick={() => setModal({ modo: "novo" })}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Novo Cargo
        </button>
      </div>

      <form onSubmit={buscar} className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cargo"
          className="min-w-64 flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-text"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Buscar
        </button>
        {buscaAtual && (
          <button
            type="button"
            onClick={() => {
              setBusca("");
              router.push(pathname);
            }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-text/5"
          >
            Limpar
          </button>
        )}
      </form>

      <div className="mb-3 text-sm text-text-secondary">
        {cargos.length} cargo{cargos.length === 1 ? "" : "s"}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-card">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Funcionários</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {cargos.map((c) => (
              <tr
                key={c.id}
                className="border-t border-border transition-colors hover:bg-text/5"
              >
                <td className="px-4 py-3">{c.nome}</td>
                <td className="px-4 py-3">{c.funcionarios}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModal({ modo: "editar", cargo: c })}
                      className="text-xs font-semibold uppercase text-primary hover:underline"
                    >
                      Editar
                    </button>
                    <DeleteButton
                      path={`/cargos/${c.id}`}
                      confirmMessage={`Excluir o cargo "${c.nome}"? Só funciona se nenhum funcionário estiver com ele.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {cargos.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-secondary">
                  {buscaAtual
                    ? "Nenhum cargo encontrado com essa busca."
                    : "Nenhum cargo cadastrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal.modo === "novo" ? "Novo Cargo" : "Editar Cargo"}
          onClose={() => setModal(null)}
        >
          <CargoForm
            cargo={modal.modo === "editar" ? modal.cargo : undefined}
            onSalvo={() => {
              setModal(null);
              router.refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}

function CargoForm({ cargo, onSalvo }: { cargo?: Cargo; onSalvo: () => void }) {
  const [nome, setNome] = useState(cargo?.nome ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      if (cargo) await apiPatch(`/cargos/${cargo.id}`, { nome });
      else await apiPost("/cargos", { nome });
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-text">
        <Rotulo obrigatorio>Nome do cargo</Rotulo>
        <input
          required
          autoFocus
          minLength={2}
          maxLength={80}
          placeholder="Ex.: Porteiro"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-text"
        />
      </label>
      {cargo && cargo.funcionarios > 0 && (
        <p className="text-xs text-text-secondary">
          Renomear muda o cargo dos {cargo.funcionarios} funcionário(s) que o usam.
        </p>
      )}
      {erro && <Aviso nivel="erro" titulo={erro} />}
      <button
        type="submit"
        disabled={salvando}
        className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {salvando ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
