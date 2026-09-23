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
          <h1 className="text-2xl font-semibold text-text">
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
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Nova Ausência
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-card">
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
                className="border-t border-border transition-colors hover:bg-text/5"
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
                      className="text-xs font-semibold uppercase text-primary hover:underline"
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
