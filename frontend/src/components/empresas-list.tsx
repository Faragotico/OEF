"use client";

import { useState } from "react";
import { DeleteButton } from "@/components/delete-button";
import { EmpresaForm } from "@/components/empresa-form";
import { Modal } from "@/components/modal";

type Empresa = {
  id: number;
  nome: string;
  cnpj: string;
  contato: string | null;
};

type EstadoModal = { modo: "novo" } | { modo: "editar"; empresa: Empresa } | null;

// Client component: guarda o estado do modal (aberto/fechado, novo x
// editar) e renderiza a tabela + o form dentro do Modal quando
// aplicável. A página em si (server component) só busca os dados e
// passa pra aqui — permite manter o fetch no servidor mesmo com a
// interatividade do popup.
export function EmpresasList({ empresas }: { empresas: Empresa[] }) {
  const [modal, setModal] = useState<EstadoModal>(null);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Empresas
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Empresas contratantes atendidas pela Sharon Pontes
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ modo: "novo" })}
          className="border-2 border-black bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          + Nova Empresa
        </button>
      </div>

      <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-red-100 dark:bg-red-950/40">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">CNPJ</th>
              <th className="px-4 py-3 font-medium">Contato</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr
                key={e.id}
                className="border-t-2 border-black transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <td className="px-4 py-3">{e.nome}</td>
                <td className="px-4 py-3">{e.cnpj}</td>
                <td className="px-4 py-3">{e.contato ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModal({ modo: "editar", empresa: e })}
                      className="text-xs font-bold uppercase text-black hover:underline dark:text-white"
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
                  colSpan={4}
                  className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                >
                  Nenhuma empresa cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
