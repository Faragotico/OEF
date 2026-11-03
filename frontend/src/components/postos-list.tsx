"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { PostoForm } from "@/components/posto-form";
import { Modal } from "@/components/modal";
import { Paginacao } from "@/components/paginacao";

type Empresa = { id: number; nome: string };
type Posto = {
  id: number;
  nome: string;
  localizacao: string;
  empresaId: number;
};

type EstadoModal = { modo: "novo" } | { modo: "editar"; posto: Posto } | null;

const inputClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

// Recebe a página já filtrada pelo backend; busca, filtro de empresa e
// troca de página navegam pra uma nova URL (?busca=...&empresaId=...&page=...).
export function PostosList({
  postos,
  total,
  page,
  totalPaginas,
  empresas,
  buscaAtual,
  empresaIdAtual,
}: {
  postos: Posto[];
  total: number;
  page: number;
  totalPaginas: number;
  empresas: Empresa[];
  buscaAtual: string;
  empresaIdAtual: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [modal, setModal] = useState<EstadoModal>(null);
  const [busca, setBusca] = useState(buscaAtual);
  const empresaById = new Map(empresas.map((e) => [e.id, e.nome]));
  const filtrosAtivos = !!buscaAtual || !!empresaIdAtual;

  function navegar(p: { busca?: string; empresaId?: string; page?: number }) {
    const qs = new URLSearchParams();
    if (p.busca) qs.set("busca", p.busca);
    if (p.empresaId) qs.set("empresaId", p.empresaId);
    if (p.page && p.page > 1) qs.set("page", String(p.page));
    const texto = qs.toString();
    router.push(texto ? `${pathname}?${texto}` : pathname);
  }

  // Mudar filtro sempre volta pra página 1.
  function buscar(e: FormEvent) {
    e.preventDefault();
    navegar({ busca: busca.trim(), empresaId: empresaIdAtual });
  }

  function limpar() {
    setBusca("");
    router.push(pathname);
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            Postos de Trabalho
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setModal({ modo: "novo" })}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Novo Posto
        </button>
      </div>

      <form onSubmit={buscar} className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou localização"
          className={`min-w-64 flex-1 ${inputClass}`}
        />
        <select
          value={empresaIdAtual}
          onChange={(e) =>
            navegar({ busca: busca.trim(), empresaId: e.target.value })
          }
          className={inputClass}
          aria-label="Filtrar por empresa"
        >
          <option value="">Todas as empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Buscar
        </button>
        {filtrosAtivos && (
          <button
            type="button"
            onClick={limpar}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-text/5"
          >
            Limpar
          </button>
        )}
      </form>

      <div className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        {total} posto{total === 1 ? "" : "s"}
        {total > 0 && ` · página ${page} de ${totalPaginas}`}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-card">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Localização</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {postos.map((p) => (
              <tr
                key={p.id}
                className="border-t border-border transition-colors hover:bg-text/5"
              >
                <td className="px-4 py-3">{p.nome}</td>
                <td className="px-4 py-3">{p.localizacao}</td>
                <td className="px-4 py-3">
                  {empresaById.get(p.empresaId) ?? p.empresaId}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModal({ modo: "editar", posto: p })}
                      className="text-xs font-semibold uppercase text-primary hover:underline"
                    >
                      Editar
                    </button>
                    <DeleteButton
                      path={`/postos/${p.id}`}
                      confirmMessage={`Excluir o posto "${p.nome}"? Só funciona se ele não tiver escalas vinculadas.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {postos.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                >
                  {filtrosAtivos
                    ? "Nenhum posto encontrado com esses filtros."
                    : "Nenhum posto cadastrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacao
        page={page}
        totalPaginas={totalPaginas}
        onChange={(p) =>
          navegar({ busca: buscaAtual, empresaId: empresaIdAtual, page: p })
        }
      />

      {modal && (
        <Modal
          title={modal.modo === "novo" ? "Novo Posto de Trabalho" : "Editar Posto de Trabalho"}
          onClose={() => setModal(null)}
        >
          <PostoForm
            id={modal.modo === "editar" ? modal.posto.id : undefined}
            empresas={empresas}
            valoresIniciais={
              modal.modo === "editar"
                ? {
                    nome: modal.posto.nome,
                    localizacao: modal.posto.localizacao,
                    empresaId: String(modal.posto.empresaId),
                  }
                : undefined
            }
            onSalvo={() => setModal(null)}
          />
        </Modal>
      )}
    </>
  );
}
