"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiPatch } from "@/lib/api";
import { DeleteButton } from "@/components/delete-button";
import { RegraForm } from "@/components/regra-form";
import { Modal } from "@/components/modal";

type Regra = {
  id: number;
  descricao: string;
  tipo: string;
  valor: string;
  padrao: boolean;
};

// Os três tipos "globais": valem pro sistema inteiro, sem escolha
// nenhuma na hora de gerar uma escala (diferente de "escala", que tem
// vários padrões possíveis e o gestor escolhe qual usar a cada
// geração). Por isso a tela trata os dois grupos como coisas
// DIFERENTES — misturar tudo numa lista só foi o problema original.
const TIPOS_GLOBAIS = [
  {
    chave: "carga_horaria_semanal",
    label: "Carga horária semanal máxima",
    ajuda: "Limite de horas que um funcionário pode trabalhar de segunda a domingo (CLT: 44h). Já vale pro sistema inteiro mesmo sem cadastrar nada aqui — o padrão é 44h.",
    descricaoSugerida: "Carga horária semanal máxima de 44 horas",
    valorPadrao: "44",
    unidade: "h",
  },
  {
    chave: "intervalo_interjornada",
    label: "Intervalo mínimo entre jornadas",
    ajuda: "Descanso mínimo, em horas, entre o fim de um turno e o início do próximo (CLT: 11h). Já vale pro sistema inteiro mesmo sem cadastrar nada aqui — o padrão é 11h.",
    descricaoSugerida: "Intervalo mínimo entre jornadas de 11 horas",
    valorPadrao: "11",
    unidade: "h",
  },
  {
    chave: "intervalo_intrajornada",
    label: "Intervalo intrajornada (pausa dentro do turno)",
    ajuda: "Pausa dentro do turno (ex: 1h de almoço num turno de 8h) que não conta como hora trabalhada — descontada do total de horas antes de checar o limite semanal e em qualquer total de horas exibido. Já vale pro sistema inteiro mesmo sem cadastrar nada aqui — o padrão é 1h.",
    descricaoSugerida: "Intervalo intrajornada de 1 hora",
    valorPadrao: "1",
    unidade: "h",
  },
] as const;

const TIPOS_GLOBAIS_CHAVES = new Set<string>(TIPOS_GLOBAIS.map((t) => t.chave));

function infoDoTipoAntigo(tipo: string) {
  return `${tipo} (tipo antigo, sem efeito)`;
}

type EstadoModal =
  | { modo: "novo-padrao" }
  | { modo: "editar"; regra: Regra }
  | {
      modo: "novo-global";
      tipo: "carga_horaria_semanal" | "intervalo_interjornada" | "intervalo_intrajornada";
    }
  | null;

export function RegrasList({ regras }: { regras: Regra[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<EstadoModal>(null);
  const [marcando, setMarcando] = useState<number | null>(null);

  const padroesEscala = regras.filter((r) => r.tipo === "escala");
  const rodizioPadrao = padroesEscala.find((r) => r.padrao);

  async function marcarComoPadrao(id: number) {
    setMarcando(id);
    try {
      await apiPatch(`/regras/${id}/padrao`, {});
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao marcar como padrão.");
    } finally {
      setMarcando(null);
    }
  }
  const globais = regras.filter((r) => TIPOS_GLOBAIS_CHAVES.has(r.tipo));
  const antigas = regras.filter(
    (r) => r.tipo !== "escala" && !TIPOS_GLOBAIS_CHAVES.has(r.tipo),
  );

  let tituloModal = "";
  let conteudoModal: ReactNode = null;
  if (modal?.modo === "novo-padrao") {
    tituloModal = "Novo Padrão de Rodízio";
    conteudoModal = <RegraForm onSalvo={() => setModal(null)} />;
  } else if (modal?.modo === "editar") {
    tituloModal = "Editar Regra";
    conteudoModal = (
      <RegraForm
        id={modal.regra.id}
        valoresIniciais={{
          descricao: modal.regra.descricao,
          tipo: modal.regra.tipo as
            | "escala"
            | "carga_horaria_semanal"
            | "intervalo_interjornada"
            | "intervalo_intrajornada",
          valor: modal.regra.valor,
        }}
        onSalvo={() => setModal(null)}
      />
    );
  } else if (modal?.modo === "novo-global") {
    const info = TIPOS_GLOBAIS.find((t) => t.chave === modal.tipo)!;
    tituloModal = "Nova Regra";
    conteudoModal = (
      <RegraForm
        valoresIniciais={{
          descricao: info.descricaoSugerida,
          tipo: info.chave,
          valor: info.valorPadrao,
        }}
        onSalvo={() => setModal(null)}
      />
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Regras Trabalhistas
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Regras da CLT aplicadas na geração automática de escalas
        </p>
      </div>

      {/* Configurações gerais — valem pro sistema inteiro, sem
          escolha nenhuma na geração. No máximo UMA regra de cada tipo
          pode existir (o backend bloqueia uma segunda) — assim a
          geração automática nunca precisa "adivinhar" qual das duas
          usar. */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
          Configurações gerais do sistema
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 4º card, mesmo estilo dos três "globais" — mas com uma
              diferença que precisa ficar dita, não só implícita: os
              três ao lado têm valor fixado pela CLT quando ninguém
              cadastra nada. Rodízio não tem piso legal único (5x1,
              6x1, 5x2... todos são válidos) — "padrão" aqui é só QUAL
              dos cadastrados abaixo a geração usa por default,
              escolha sua, não a lei. */}
          <div className="flex flex-col gap-2 border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
            <span className="font-bold text-black dark:text-zinc-50">Rodízio padrão</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Padrão usado na geração quando ninguém escolhe outro. Diferente dos
              cards ao lado, não é piso legal — é escolha sua entre os cadastrados
              abaixo, em &quot;Padrões de rodízio de escala&quot;.
            </p>
            <div className="mt-1 flex items-center justify-between">
              <span className="border-2 border-black bg-red-100 px-2 py-1 text-sm font-bold text-red-900 dark:bg-red-950/40 dark:text-red-100">
                {rodizioPadrao ? rodizioPadrao.valor : "nenhum cadastrado"}
              </span>
              <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
                escolha abaixo ↓
              </span>
            </div>
          </div>
          {TIPOS_GLOBAIS.map((t) => {
            const cadastrada = globais.find((r) => r.tipo === t.chave);
            return (
              <div
                key={t.chave}
                className="flex flex-col gap-2 border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900"
              >
                <span className="font-bold text-black dark:text-zinc-50">
                  {t.label}
                </span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t.ajuda}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="border-2 border-black bg-red-100 px-2 py-1 text-sm font-bold text-red-900 dark:bg-red-950/40 dark:text-red-100">
                    {cadastrada ? cadastrada.valor : t.valorPadrao}
                    {t.unidade}
                    {!cadastrada && " (padrão)"}
                  </span>
                  {cadastrada ? (
                    <button
                      type="button"
                      onClick={() => setModal({ modo: "editar", regra: cadastrada })}
                      className="text-xs font-bold uppercase text-black hover:underline dark:text-white"
                    >
                      Editar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setModal({ modo: "novo-global", tipo: t.chave })}
                      className="text-xs font-bold uppercase text-black hover:underline dark:text-white"
                    >
                      + Definir valor customizado
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 border-2 border-black bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          O Descanso Semanal Remunerado (máximo de 6 dias seguidos sem
          folga) não aparece aqui porque é piso legal fixo — não dá pra
          configurar um valor diferente, então não tem regra pra
          cadastrar.
        </p>
      </section>

      {/* Padrões de rodízio — aqui sim pode ter vários (5x1, 6x1...),
          e o gestor escolhe qual usar em cada "Gerar escala". */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Padrões de rodízio de escala
          </h2>
          <button
            type="button"
            onClick={() => setModal({ modo: "novo-padrao" })}
            className="border-2 border-black bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            + Novo padrão
          </button>
        </div>

        <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-red-100 dark:bg-red-950/40">
              <tr>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Ciclo</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {padroesEscala.map((r) => (
                <tr
                  key={r.id}
                  className="border-t-2 border-black transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <td className="px-4 py-3">{r.descricao}</td>
                  <td className="px-4 py-3">
                    {r.valor}
                    {r.padrao && (
                      <span className="ml-2 border-2 border-black bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        Padrão
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {!r.padrao && (
                        <button
                          type="button"
                          disabled={marcando === r.id}
                          onClick={() => marcarComoPadrao(r.id)}
                          className="text-xs font-bold uppercase text-black hover:underline disabled:opacity-50 dark:text-white"
                        >
                          {marcando === r.id ? "Marcando..." : "Marcar como padrão"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setModal({ modo: "editar", regra: r })}
                        className="text-xs font-bold uppercase text-black hover:underline dark:text-white"
                      >
                        Editar
                      </button>
                      <DeleteButton
                        path={`/regras/${r.id}`}
                        confirmMessage="Excluir este padrão de rodízio? Só funciona se não houver escalas vinculadas a ele."
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {padroesEscala.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    Nenhum padrão de rodízio cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {antigas.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
            Regras antigas
          </h2>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            Tipos que existiam antes deste rework e nunca tiveram
            efeito nenhum na geração ou validação de escalas. Não é
            possível editá-las — só excluir.
          </p>
          <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-red-100 dark:bg-red-950/40">
                <tr>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {antigas.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t-2 border-black transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <td className="px-4 py-3">{r.descricao}</td>
                    <td className="px-4 py-3 italic text-zinc-500 dark:text-zinc-400">
                      {infoDoTipoAntigo(r.tipo)}
                    </td>
                    <td className="px-4 py-3">{r.valor}</td>
                    <td className="px-4 py-3">
                      <DeleteButton
                        path={`/regras/${r.id}`}
                        confirmMessage="Excluir esta regra antiga? Ela não tem efeito no sistema."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {modal && (
        <Modal title={tituloModal} onClose={() => setModal(null)}>
          {conteudoModal}
        </Modal>
      )}
    </>
  );
}
