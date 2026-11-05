"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { AusenciaForm } from "@/components/ausencia-form";
import { Modal } from "@/components/modal";
import { Paginacao } from "@/components/paginacao";

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

const inputClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

// Recebe a página já filtrada pelo backend; busca, período e troca de
// página navegam pra uma nova URL
// (?busca=...&dataInicio=...&dataFim=...&page=...).
export function AusenciasList({
  ausencias,
  total,
  page,
  totalPaginas,
  funcionarios,
  buscaAtual,
  dataInicioAtual,
  dataFimAtual,
  periodoPersonalizado,
}: {
  ausencias: Ausencia[];
  total: number;
  page: number;
  totalPaginas: number;
  funcionarios: Funcionario[];
  buscaAtual: string;
  dataInicioAtual: string;
  dataFimAtual: string;
  periodoPersonalizado: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [modal, setModal] = useState<EstadoModal>(null);
  const [busca, setBusca] = useState(buscaAtual);
  const filtrosAtivos = !!buscaAtual || periodoPersonalizado;

  function navegar(p: {
    busca?: string;
    dataInicio: string;
    dataFim: string;
    page?: number;
  }) {
    const qs = new URLSearchParams();
    if (p.busca) qs.set("busca", p.busca);
    // As duas datas vão SEMPRE pra URL, mesmo vazias: é o que diferencia
    // "limpei o período" (todas as ausências) de "não escolhi nada
    // ainda" (mês atual) — ver a página.
    qs.set("dataInicio", p.dataInicio);
    qs.set("dataFim", p.dataFim);
    if (p.page && p.page > 1) qs.set("page", String(p.page));
    router.push(`${pathname}?${qs.toString()}`);
  }

  // Mudar filtro sempre volta pra página 1 — senão dá pra ficar
  // "perdido" numa página que não existe mais depois que o filtro
  // reduz o total.
  function buscar(e: FormEvent) {
    e.preventDefault();
    navegar({
      busca: busca.trim(),
      dataInicio: dataInicioAtual,
      dataFim: dataFimAtual,
    });
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
            Ausências
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setModal({ modo: "novo" })}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Nova Ausência
        </button>
      </div>

      <form onSubmit={buscar} className="mb-4 flex flex-wrap items-end gap-2">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por funcionário ou motivo"
          aria-label="Buscar por funcionário ou motivo"
          className={`min-w-64 flex-1 ${inputClass}`}
        />
        <label className="flex flex-col gap-1 text-sm text-text">
          De
          <input
            type="date"
            value={dataInicioAtual}
            onChange={(e) =>
              navegar({
                busca: busca.trim(),
                dataInicio: e.target.value,
                dataFim: dataFimAtual,
              })
            }
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text">
          Até
          <input
            type="date"
            value={dataFimAtual}
            onChange={(e) =>
              navegar({
                busca: busca.trim(),
                dataInicio: dataInicioAtual,
                dataFim: e.target.value,
              })
            }
            className={inputClass}
          />
        </label>
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
        {total} ausência{total === 1 ? "" : "s"}
        {total > 0 && ` · página ${page} de ${totalPaginas}`}
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
            {ausencias.map((a) => (
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
            {ausencias.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                >
                  {buscaAtual
                    ? "Nenhuma ausência encontrada com essa busca."
                    : "Nenhuma ausência neste período."}
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
          navegar({
            busca: buscaAtual,
            dataInicio: dataInicioAtual,
            dataFim: dataFimAtual,
            page: p,
          })
        }
      />

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
