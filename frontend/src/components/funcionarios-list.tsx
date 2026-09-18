"use client";

import { useState } from "react";
import { DeleteButton } from "@/components/delete-button";
import { NovoFuncionarioForm } from "@/components/novo-funcionario-form";
import { EditarFuncionarioForm } from "@/components/editar-funcionario-form";
import { Modal } from "@/components/modal";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
};

type Posto = { id: number; nome: string; localizacao: string };

type Funcionario = {
  id: number;
  nome: string;
  cpf: string;
  telefone: string | null;
  cargo: string;
  cargaHorariaSemanal: number;
  status: boolean;
  turnoPadraoId: number | null;
  turnoPadrao?: {
    descricao: string | null;
    horaInicio: string;
    horaFim: string;
  } | null;
  // Calculados pela API a partir do cadastro, não são colunas do
  // banco: coringa é quem não tem turno de casa mas tem habilitação;
  // cadastroIncompleto é quem não tem nem um nem outro. Antes as duas
  // situações eram indistinguíveis — um cadastro pela metade parecia
  // um coringa de verdade e entrava na escala como tal.
  coringa: boolean;
  cadastroIncompleto: boolean;
  turnosHabilitadosIds: number[];
  diasSemanaVetados: number[];
  postoId: number | null;
  posto?: { nome: string } | null;
};

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

type EstadoModal =
  | { modo: "novo" }
  | { modo: "editar"; funcionario: Funcionario }
  | null;

function turnoPadraoLabel(f: Funcionario) {
  if (!f.turnoPadrao) return "—";
  return f.turnoPadrao.descricao
    ? `${f.turnoPadrao.descricao} (${f.turnoPadrao.horaInicio}–${f.turnoPadrao.horaFim})`
    : `${f.turnoPadrao.horaInicio}–${f.turnoPadrao.horaFim}`;
}

export function FuncionariosList({
  funcionarios,
  turnos,
  postos,
}: {
  funcionarios: Funcionario[];
  turnos: Turno[];
  postos: Posto[];
}) {
  const [modal, setModal] = useState<EstadoModal>(null);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Funcionários
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gerencie os funcionários e suas configurações de escala
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ modo: "novo" })}
          className="border-2 border-black bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          + Novo Funcionário
        </button>
      </div>

      <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-red-100 dark:bg-red-950/40">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">CPF</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Cargo</th>
              <th className="px-4 py-3 font-medium">Carga horária</th>
              <th className="px-4 py-3 font-medium">Posto</th>
              <th className="px-4 py-3 font-medium">Turno padrão</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {funcionarios.map((f) => (
              <tr
                key={f.id}
                className="border-t-2 border-black transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <td className="px-4 py-3">{f.nome}</td>
                <td className="px-4 py-3">{f.cpf}</td>
                <td className="px-4 py-3">{f.telefone}</td>
                <td className="px-4 py-3">{f.cargo}</td>
                <td className="px-4 py-3">{f.cargaHorariaSemanal}h</td>
                <td className="px-4 py-3">
                  {f.posto?.nome ?? (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      sem posto
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {f.coringa ? (
                    <span className="border-2 border-black bg-black px-2 py-1 text-xs font-bold uppercase text-white">
                      Coringa · {f.turnosHabilitadosIds.length} turno(s)
                    </span>
                  ) : f.cadastroIncompleto ? (
                    <span
                      title="Sem turno de casa e sem habilitação: não entra na geração automática."
                      className="border-2 border-black bg-amber-300 px-2 py-1 text-xs font-bold uppercase text-black"
                    >
                      Cadastro incompleto
                    </span>
                  ) : (
                    turnoPadraoLabel(f)
                  )}
                  {f.diasSemanaVetados.length > 0 && (
                    <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                      nunca {f.diasSemanaVetados.map((d) => DIAS[d]).join("/")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      f.status
                        ? "border-2 border-black bg-red-600 px-2 py-1 text-xs font-bold uppercase text-white"
                        : "border-2 border-black bg-white px-2 py-1 text-xs font-bold uppercase text-black dark:bg-zinc-900 dark:text-white"
                    }
                  >
                    {f.status ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModal({ modo: "editar", funcionario: f })}
                      className="text-xs font-bold uppercase text-black hover:underline dark:text-white"
                    >
                      Editar
                    </button>
                    <DeleteButton
                      path={`/funcionarios/${f.id}`}
                      confirmMessage={`Excluir "${f.nome}"? Só funciona se não houver alocações vinculadas a ele.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.modo === "novo" && (
        <Modal title="Novo Funcionário" onClose={() => setModal(null)}>
          <NovoFuncionarioForm
            turnos={turnos}
            postos={postos}
            onSalvo={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.modo === "editar" && (
        <Modal title="Editar Funcionário" onClose={() => setModal(null)}>
          <EditarFuncionarioForm
            id={modal.funcionario.id}
            turnos={turnos}
            postos={postos}
            valoresIniciais={{
              nome: modal.funcionario.nome,
              cpf: modal.funcionario.cpf,
              telefone: modal.funcionario.telefone ?? "",
              cargo: modal.funcionario.cargo,
              cargaHorariaSemanal: modal.funcionario.cargaHorariaSemanal,
              status: modal.funcionario.status,
              turnoPadraoId: modal.funcionario.turnoPadraoId
                ? String(modal.funcionario.turnoPadraoId)
                : "",
              coringa: modal.funcionario.coringa,
              turnosHabilitadosIds: modal.funcionario.turnosHabilitadosIds ?? [],
              diasSemanaVetados: modal.funcionario.diasSemanaVetados ?? [],
              postoId: modal.funcionario.postoId
                ? String(modal.funcionario.postoId)
                : "",
            }}
            onSalvo={() => setModal(null)}
          />
        </Modal>
      )}
    </>
  );
}
