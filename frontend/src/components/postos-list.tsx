"use client";

import { useState } from "react";
import { DeleteButton } from "@/components/delete-button";
import { PostoForm } from "@/components/posto-form";
import { Modal } from "@/components/modal";

type Empresa = { id: number; nome: string };
type Posto = {
  id: number;
  nome: string;
  localizacao: string;
  empresaId: number;
};

type EstadoModal = { modo: "novo" } | { modo: "editar"; posto: Posto } | null;

export function PostosList({
  postos,
  empresas,
}: {
  postos: Posto[];
  empresas: Empresa[];
}) {
  const [modal, setModal] = useState<EstadoModal>(null);
  const empresaById = new Map(empresas.map((e) => [e.id, e.nome]));

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            Postos de Trabalho
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Locais onde os funcionários são alocados
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ modo: "novo" })}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Novo Posto
        </button>
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
                  Nenhum posto cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
