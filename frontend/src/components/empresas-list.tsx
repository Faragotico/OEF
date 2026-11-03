"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { EmpresaForm } from "@/components/empresa-form";
import { Modal } from "@/components/modal";
import { Paginacao } from "@/components/paginacao";

type Empresa = {
  id: number;
  nome: string;
  cnpj: string;
  contato: string | null;
  logradouro: string | null;
  cidade: string | null;
};

type EstadoModal = { modo: "novo" } | { modo: "editar"; empresa: Empresa } | null;

// Client component: guarda o estado do modal (aberto/fechado, novo x
// editar) e renderiza a tabela + o form dentro do Modal quando
// aplicável. A página em si (server component) só busca os dados e
// passa pra aqui — permite manter o fetch no servidor mesmo com a
// interatividade do popup.
//
// Este componente NÃO filtra nem pagina nada: recebe a página já
// pronta do backend e, quando a pessoa busca ou troca de página,
// navega pra uma nova URL (?busca=...&page=...) — aí o server
// component busca de novo com os parâmetros certos.
export function EmpresasList({
  empresas,
  total,
  page,
  totalPaginas,
  buscaAtual,
}: {
  empresas: Empresa[];
  total: number;
  page: number;
  totalPaginas: number;
  buscaAtual: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [modal, setModal] = useState<EstadoModal>(null);
  const [busca, setBusca] = useState(buscaAtual);

  function navegar(params: { busca?: string; page?: number }) {
    const qs = new URLSearchParams();
    if (params.busca) qs.set("busca", params.busca);
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    const texto = qs.toString();
    router.push(texto ? `${pathname}?${texto}` : pathname);
  }

  // Buscar sempre volta pra página 1 — senão dá pra ficar "perdido"
  // numa página que não existe mais depois que a busca reduz o total.
  function buscar(e: FormEvent) {
    e.preventDefault();
    navegar({ busca: busca.trim() });
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
            Empresas
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setModal({ modo: "novo" })}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Nova Empresa
        </button>
      </div>

      <form onSubmit={buscar} className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, CNPJ ou contato"
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
            onClick={limpar}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-text/5"
          >
            Limpar
          </button>
        )}
      </form>

      <div className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        {total} empresa{total === 1 ? "" : "s"}
        {total > 0 && ` · página ${page} de ${totalPaginas}`}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-card">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">CNPJ</th>
              <th className="px-4 py-3 font-medium">Contato</th>
              <th className="px-4 py-3 font-medium">Endereço</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr
                key={e.id}
                className="border-t border-border transition-colors hover:bg-text/5"
              >
                <td className="px-4 py-3">{e.nome}</td>
                <td className="px-4 py-3">{e.cnpj}</td>
                <td className="px-4 py-3">{e.contato ?? "—"}</td>
                <td className="px-4 py-3">
                  {[e.logradouro, e.cidade].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModal({ modo: "editar", empresa: e })}
                      className="text-xs font-semibold uppercase text-primary hover:underline"
                    >
                      Editar
                    </button>
                    <DeleteButton
                      path={`/empresas/${e.id}`}
                      confirmMessage={`Excluir a empresa "${e.nome}"? Só funciona se ela não tiver postos vinculados.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                >
                  {buscaAtual
                    ? "Nenhuma empresa encontrada com essa busca."
                    : "Nenhuma empresa cadastrada."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacao
        page={page}
        totalPaginas={totalPaginas}
        onChange={(p) => navegar({ busca: buscaAtual, page: p })}
      />

      {modal && (
        <Modal
          title={modal.modo === "novo" ? "Nova Empresa" : "Editar Empresa"}
          onClose={() => setModal(null)}
        >
          <EmpresaForm
            id={modal.modo === "editar" ? modal.empresa.id : undefined}
            valoresIniciais={
              modal.modo === "editar"
                ? {
                    nome: modal.empresa.nome,
                    cnpj: modal.empresa.cnpj,
                    contato: modal.empresa.contato ?? "",
                    logradouro: modal.empresa.logradouro ?? "",
                    cidade: modal.empresa.cidade ?? "",
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
