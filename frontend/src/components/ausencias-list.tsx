"use client";

import { useState } from "react";
import { DeleteButton } from "@/components/delete-button";
import { AusenciaForm } from "@/components/ausencia-form";
import { Modal } from "@/components/modal";

type Funcionario = { id: number; nome: string; coringa: boolean };
type Ausencia = {
  id: number;
  funcionarioId: number;
  dataInic: string;
  dataFim: string;
  motivo: string;
  compensacao: string | null;
  funcionario?: { nome: string };
};

type EstadoModal =
  | { modo: "novo" }
  | { modo: "editar"; ausencia: Ausencia }
  | null;

export function AusenciasList({
  ausencias,
  funcionarios,
}: {
  ausencias: Ausencia[];
  funcionarios: Funcionario[];
}) {
  const [modal, setModal] = useState<EstadoModal>(null);
  const ausenciasOrdenadas = [...ausencias].sort((a, b) =>
    a.dataInic < b.dataInic ? 1 : -1,
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Ausências
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Faltas, atestados e licenças — a geração e a validação de
            escala nunca alocam alguém nesses períodos (RN02)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ modo: "novo" })}
          className="border-2 border-black bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          + Nova Ausência
        </button>
      </div>

      <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-red-100 dark:bg-red-950/40">
            <tr>
              <th className="px-4 py-3 font-medium">Funcionário</th>
              <th className="px-4 py-3 font-medium">Período</th>
              <th className="px-4 py-3 font-medium">Motivo</th>
              <th className="px-4 py-3 font-medium">Compensação</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {ausenciasOrdenadas.map((a) => (
              <tr
                key={a.id}
                className="border-t-2 border-black transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <td className="px-4 py-3">{a.funcionario?.nome ?? "—"}</td>
                <td className="px-4 py-3">
                  {a.dataInic} a {a.dataFim}
                </td>
                <td className="px-4 py-3">{a.motivo}</td>
                <td className="px-4 py-3">{a.compensacao ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModal({ modo: "editar", ausencia: a })}
                      className="text-xs font-bold uppercase text-black hover:underline dark:text-white"
                    >
                      Editar
                    </button>
                    <DeleteButton
                      path={`/ausencias/${a.id}`}
                      confirmMessage={`Excluir a ausência de "${a.funcionario?.nome ?? "funcionário"}" (${a.dataInic} a ${a.dataFim})?`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {ausenciasOrdenadas.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                >
                  Nenhuma ausência registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal.modo === "novo" ? "Nova Ausência" : "Editar Ausência"}
          onClose={() => setModal(null)}
        >
          <AusenciaForm
            id={modal.modo === "editar" ? modal.ausencia.id : undefined}
            funcionarios={funcionarios}
            valoresIniciais={
              modal.modo === "editar"
                ? {
                    funcionarioId: String(modal.ausencia.funcionarioId),
                    dataInicio: modal.ausencia.dataInic,
                    dataFim: modal.ausencia.dataFim,
                    motivo: modal.ausencia.motivo,
                    compensacao: modal.ausencia.compensacao ?? "",
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
