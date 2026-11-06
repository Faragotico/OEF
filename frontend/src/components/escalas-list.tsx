"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { Paginacao } from "@/components/paginacao";
import { rotuloEscala } from "@/lib/escala-rotulo";
import { SelectPesquisavel } from "@/components/select-pesquisavel";
import { PostoNome } from "@/components/posto-nome";

type Posto = {
  id: number;
  nome: string;
  localizacao: string;
  empresa?: { nome: string } | null;
};
type Escala = {
  id: number;
  dataInic: string;
  dataFim: string;
  posto?: { nome: string; localizacao: string; empresa?: { nome: string } | null };
  regra?: { descricao: string; valor: string };
};

const inputClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

// Recebe a página já filtrada pelo backend; posto, período e troca de
// página navegam pra uma nova URL
// (?postoId=...&dataInicio=...&dataFim=...&page=...).
export function EscalasList({
  escalas,
  total,
  page,
  totalPaginas,
  postos,
  postoIdAtual,
  dataInicioAtual,
  dataFimAtual,
  periodoPersonalizado,
  apiUrl,
}: {
  escalas: Escala[];
  total: number;
  page: number;
  totalPaginas: number;
  postos: Posto[];
  postoIdAtual: string;
  dataInicioAtual: string;
  dataFimAtual: string;
  periodoPersonalizado: boolean;
  // Vem do servidor: este componente roda no navegador e o link do PDF
  // aponta direto pra API.
  apiUrl: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const filtrosAtivos = !!postoIdAtual || periodoPersonalizado;

  // Mudar filtro sempre volta pra página 1 — senão dá pra ficar
  // "perdido" numa página que não existe mais depois que o filtro
  // reduz o total.
  function navegar(p: {
    postoId: string;
    dataInicio: string;
    dataFim: string;
    page?: number;
  }) {
    const qs = new URLSearchParams();
    if (p.postoId) qs.set("postoId", p.postoId);
    // As duas datas vão SEMPRE pra URL, mesmo vazias: é o que diferencia
    // "limpei o período" (todas as escalas) de "não escolhi nada ainda"
    // (padrão do mês atual em diante) — ver a página.
    qs.set("dataInicio", p.dataInicio);
    qs.set("dataFim", p.dataFim);
    if (p.page && p.page > 1) qs.set("page", String(p.page));
    router.push(`${pathname}?${qs.toString()}`);
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Escalas</h1>
        </div>
        <Link
          href="/escalas/gerar"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Gerar escala
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SelectPesquisavel
          value={postoIdAtual}
          onChange={(valor) =>
            navegar({
              postoId: valor,
              dataInicio: dataInicioAtual,
              dataFim: dataFimAtual,
            })
          }
          className="min-w-64"
          aria-label="Filtrar por posto"
          vazio="Todos os postos"
          opcoes={postos.map((p) => ({
            valor: String(p.id),
            rotulo: p.nome,
            detalhe: p.empresa?.nome ?? undefined,
          }))}
        />
        <label className="flex flex-col gap-1 text-sm text-text">
          De
          <input
            type="date"
            value={dataInicioAtual}
            onChange={(e) =>
              navegar({
                postoId: postoIdAtual,
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
                postoId: postoIdAtual,
                dataInicio: dataInicioAtual,
                dataFim: e.target.value,
              })
            }
            className={inputClass}
          />
        </label>
        {filtrosAtivos && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-text/5"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        {total} escala{total === 1 ? "" : "s"}
        {total > 0 && ` · página ${page} de ${totalPaginas}`}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-card">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Posto</th>
              <th className="px-4 py-3 font-medium">Período</th>
              <th className="px-4 py-3 font-medium">Regra</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {escalas.map((e) => (
              <tr
                key={e.id}
                className="border-t border-border transition-colors hover:bg-text/5"
              >
                <td className="px-4 py-3">#{e.id}</td>
                <td className="px-4 py-3">
                  {e.posto ? <PostoNome posto={e.posto} /> : "—"}
                </td>
                <td className="px-4 py-3">
                  {e.dataInic} a {e.dataFim}
                </td>
                <td className="px-4 py-3">
                  {e.regra ? `${e.regra.descricao} (${e.regra.valor})` : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <a
                      href={`${apiUrl}/escalas/${e.id}/pdf`}
                      className="font-bold text-primary hover:underline"
                    >
                      PDF ↓
                    </a>
                    <Link
                      href={`/escalas/${e.id}`}
                      className="font-bold text-primary hover:underline"
                    >
                      Abrir →
                    </Link>
                    <DeleteButton
                      path={`/escalas/${e.id}`}
                      confirmMessage={`Excluir a escala "${rotuloEscala(e)}"? Isso apaga também todas as alocações geradas para ela — não dá pra desfazer. Use quando a geração saiu errada e você vai gerar de novo.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {escalas.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                >
                  {filtrosAtivos
                    ? "Nenhuma escala encontrada com esses filtros."
                    : "Nenhuma escala gerada ainda."}
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
            postoId: postoIdAtual,
            dataInicio: dataInicioAtual,
            dataFim: dataFimAtual,
            page: p,
          })
        }
      />
    </>
  );
}
