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
    ajuda: "Define o limite de horas que um funcionário pode trabalhar de segunda a domingo. Conforme a CLT, o padrão é de 44 horas semanais.",
    descricaoSugerida: "Carga horária semanal máxima de 44 horas",
    valorPadrao: "44",
    unidade: "h",
  },
  {
    chave: "intervalo_interjornada",
    label: "Intervalo mínimo entre jornadas",
    ajuda: "Define o período mínimo de descanso, em horas, entre o fim de uma jornada e o início da próxima. Conforme a CLT, o padrão é de 11 horas.",
    descricaoSugerida: "Intervalo mínimo entre jornadas de 11 horas",
    valorPadrao: "11",
    unidade: "h",
  },
  {
    chave: "intervalo_intrajornada",
    label: "Intervalo intrajornada (pausa durante o turno)",
    ajuda: "Define o período de pausa durante a jornada, como 1 hora de almoço em um turno de 8 horas. Esse período não é contabilizado como hora trabalhada e é descontado do total de horas antes da verificação do limite semanal, inclusive nos totais de horas exibidos no sistema.",
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
        <h1 className="text-2xl font-semibold text-text">Regras Trabalhistas</h1>
        <p className="text-sm text-text-secondary">
          Regras da CLT aplicadas na geração automática de escalas
        </p>
      </div>

      {/* Configurações gerais — valem pro sistema inteiro, sem
          escolha nenhuma na geração. No máximo UMA regra de cada tipo
          pode existir (o backend bloqueia uma segunda) — assim a
          geração automática nunca precisa "adivinhar" qual das duas
          usar. Cada card traz duas etiquetas fixas ("Aplicação" e
          "Valor padrão") em vez de repetir a mesma frase explicativa
          em todo card — só o valor muda de um pro outro. */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold text-text">
          Configurações gerais do sistema
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 4º card, mesmo estilo dos três "globais" — mas com uma
              diferença que precisa ficar dita, não só implícita: os
              três ao lado têm valor fixado pela CLT quando ninguém
              cadastra nada. Rodízio não tem piso legal único (5x1,
              6x1, 5x2... todos são válidos) — "padrão" aqui é só QUAL
              dos cadastrados abaixo a geração usa por default,
              escolha sua, não a lei. Por isso não leva as etiquetas
              "Aplicação"/"Valor padrão" dos outros três. */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <div>
              <span className="font-semibold text-text">Rodízio padrão</span>
              <p className="mt-1 text-xs text-text-secondary">
                Padrão utilizado na geração das escalas quando nenhum outro é
                selecionado. Diferente das regras apresentadas ao lado, este não é
                um limite legal, mas uma escolha entre os padrões cadastrados em
                &quot;Padrões de rodízio de escala&quot;.
              </p>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="rounded-md bg-primary/10 px-2 py-1 text-sm font-semibold text-primary">
                {rodizioPadrao ? rodizioPadrao.valor : "nenhum cadastrado"}
              </span>
              <span className="text-xs font-semibold uppercase text-text-secondary">
                Escolher abaixo ↓
              </span>
            </div>
          </div>
          {TIPOS_GLOBAIS.map((t) => {
            const cadastrada = globais.find((r) => r.tipo === t.chave);
            return (
              <div
                key={t.chave}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div>
                  <span className="font-semibold text-text">{t.label}</span>
                  <p className="mt-1 text-xs text-text-secondary">{t.ajuda}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-text/5 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                    Aplicação: Todo o sistema
                  </span>
                  <span className="rounded-full bg-text/5 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                    Valor padrão: {t.valorPadrao}
                    {t.unidade}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-sm font-semibold text-primary">
                    {cadastrada ? cadastrada.valor : t.valorPadrao}
                    {t.unidade}
                    {!cadastrada && " (padrão)"}
                  </span>
                  {cadastrada ? (
                    <button
                      type="button"
                      onClick={() => setModal({ modo: "editar", regra: cadastrada })}
                      className="text-xs font-semibold uppercase text-primary hover:underline"
                    >
                      Editar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setModal({ modo: "novo-global", tipo: t.chave })}
                      className="text-xs font-semibold uppercase text-primary hover:underline"
                    >
                      + Definir valor personalizado
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 rounded-lg border border-border bg-text/5 px-3 py-2 text-xs text-text-secondary">
          O Descanso Semanal Remunerado não aparece entre as configurações porque
          possui um limite legal fixo. A legislação estabelece o direito ao
          descanso após, no máximo, 6 dias consecutivos de trabalho, não sendo
          possível cadastrar um valor diferente para essa regra.
        </p>
      </section>

      {/* Padrões de rodízio — aqui sim pode ter vários (5x1, 6x1...),
          e o gestor escolhe qual usar em cada "Gerar escala". */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">
            Padrões de rodízio de escala
          </h2>
          <button
            type="button"
            onClick={() => setModal({ modo: "novo-padrao" })}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            + Novo padrão
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border bg-card">
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
                  className="border-t border-border transition-colors hover:bg-text/5"
                >
                  <td className="px-4 py-3">{r.descricao}</td>
                  <td className="px-4 py-3">
                    {r.valor}
                    {r.padrao && (
                      <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
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
                          className="text-xs font-semibold uppercase text-primary hover:underline disabled:opacity-50"
                        >
                          {marcando === r.id ? "Marcando..." : "Marcar como padrão"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setModal({ modo: "editar", regra: r })}
                        className="text-xs font-semibold uppercase text-primary hover:underline"
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
                    className="px-4 py-6 text-center text-text-secondary"
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
          <h2 className="mb-2 text-lg font-semibold text-text">Regras antigas</h2>
          <p className="mb-2 text-xs text-text-secondary">
            Tipos que existiam antes deste rework e nunca tiveram
            efeito nenhum na geração ou validação de escalas. Não é
            possível editá-las — só excluir.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-border bg-card">
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
                    className="border-t border-border transition-colors hover:bg-text/5"
                  >
                    <td className="px-4 py-3">{r.descricao}</td>
                    <td className="px-4 py-3 italic text-text-secondary">
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
