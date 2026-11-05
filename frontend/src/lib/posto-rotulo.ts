// Posto sozinho não identifica: "Matriz" existe em várias empresas. Então
// onde o posto aparece (lista, filtro, nome da escala), a empresa vai junto.
export type PostoComEmpresa = {
  nome: string;
  empresa?: { nome: string } | null;
};

/** "Matriz · Tozetto & Cia Ltda" — pra <option> e texto corrido. */
export function rotuloPosto(posto: PostoComEmpresa): string {
  return posto.empresa?.nome ? `${posto.nome} · ${posto.empresa.nome}` : posto.nome;
}
