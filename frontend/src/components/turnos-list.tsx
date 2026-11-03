"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { TurnoForm } from "@/components/turno-form";
import { Modal } from "@/components/modal";
import { Paginacao } from "@/components/paginacao";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
  posto?: { nome: string } | null;
  demandaPorDiaDaSemana: number[];
};

type Posto = { id: number; nome: string; localizacao: string };

type EstadoModal = { modo: "novo" } | { modo: "editar"; turno: Turno } | null;

const inputClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// A demanda semanal em miniatura: sete números na ordem dos dias. Vale
// mais que um total, porque o que interessa de relance é justamente se
// o domingo está diferente dos outros dias.
function MiniDemanda({ demanda }: { demanda: number[] }) {
  return (
    <div className="flex gap-0.5">
      {demanda.map((q, dia) => (
        <span
          key={dia}
          title={`${DIAS[dia]}: ${q} pessoa(s)`}
          className={
            "flex h-5 w-5 items-center justify-center rounded-sm border text-[10px] font-bold tabular-nums " +
            (q === 0
              ? "border-zinc-200 text-zinc-300 dark:border-zinc-700 dark:text-zinc-700"
              : dia === 0
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-card")
          }
        >
          {q === 0 ? "–" : q}
        </span>
      ))}
    </div>
  );
}

// Recebe a página já filtrada pelo backend; busca, filtro de posto e
// troca de página navegam pra uma nova URL (?busca=...&postoId=...&page=...).
export function TurnosList({
  turnos,
  total,
  page,
  totalPaginas,
  postos,
  buscaAtual,
  postoIdAtual,
}: {
  turnos: Turno[];
  total: number;
  page: number;
  totalPaginas: number;
  postos: Posto[];
  buscaAtual: string;
  postoIdAtual: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [modal, setModal] = useState<EstadoModal>(null);
  const [busca, setBusca] = useState(buscaAtual);
  const filtrosAtivos = !!buscaAtual || !!postoIdAtual;

  function navegar(p: { busca?: string; postoId?: string; page?: number }) {
    const qs = new URLSearchParams();
    if (p.busca) qs.set("busca", p.busca);
    if (p.postoId) qs.set("postoId", p.postoId);
    if (p.page && p.page > 1) qs.set("page", String(p.page));
    const texto = qs.toString();
    router.push(texto ? `${pathname}?${texto}` : pathname);
  }

  // Mudar filtro sempre volta pra página 1.
  function buscar(e: FormEvent) {
    e.preventDefault();
    navegar({ busca: busca.trim(), postoId: postoIdAtual });
  }

  function limpar() {
    setBusca("");
    router.push(pathname);
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Turnos</h1>
        </div>
        <button
          type="button"
          onClick={() => setModal({ modo: "novo" })}
          className="flex-none rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Novo Turno
        </button>
      </div>

      <form onSubmit={buscar} className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar pela descrição do turno"
          className={`min-w-64 flex-1 ${inputClass}`}
        />
        <select
          value={postoIdAtual}
          onChange={(e) =>
            navegar({ busca: busca.trim(), postoId: e.target.value })
          }
          className={inputClass}
          aria-label="Filtrar por posto"
        >
          <option value="">Todos os postos</option>
          {postos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
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
        {total} turno{total === 1 ? "" : "s"}
        {total > 0 && ` · página ${page} de ${totalPaginas}`}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-card">
            <tr>
              <th className="px-4 py-3 font-medium">Posto</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Horário</th>
              <th className="px-4 py-3 font-medium">Pessoas por dia</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {turnos.map((t) => (
              <tr
                key={t.id}
                className="border-t border-border transition-colors hover:bg-text/5"
              >
                <td className="px-4 py-3">
                  {t.posto?.nome ?? (
                    <span className="text-xs italic text-zinc-400">avulso</span>
                  )}
                </td>
                <td className="px-4 py-3">{t.descricao ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                  {t.horaInicio}–{t.horaFim}
                </td>
                <td className="px-4 py-3">
                  {t.postoId ? (
                    <MiniDemanda demanda={t.demandaPorDiaDaSemana} />
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModal({ modo: "editar", turno: t })}
                      className="text-xs font-semibold uppercase text-primary hover:underline"
                    >
                      Editar
                    </button>
                    <DeleteButton
                      path={`/turnos/${t.id}`}
                      confirmMessage="Excluir este turno? Só funciona se não houver alocações vinculadas a ele."
                    />
                  </div>
                </td>
              </tr>
            ))}
            {turnos.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                >
                  {filtrosAtivos
                    ? "Nenhum turno encontrado com esses filtros."
                    : "Nenhum turno cadastrado."}
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
          navegar({ busca: buscaAtual, postoId: postoIdAtual, page: p })
        }
      />

      {modal && (
        <Modal
          title={modal.modo === "novo" ? "Novo Turno" : "Editar Turno"}
          onClose={() => setModal(null)}
        >
          <TurnoForm
            id={modal.modo === "editar" ? modal.turno.id : undefined}
            postos={postos}
            valoresIniciais={
              modal.modo === "editar"
                ? {
                    descricao: modal.turno.descricao ?? "",
                    horaInicio: modal.turno.horaInicio,
                    horaFim: modal.turno.horaFim,
                    postoId: modal.turno.postoId ? String(modal.turno.postoId) : "",
                    demandaPorDiaDaSemana: modal.turno.demandaPorDiaDaSemana,
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
