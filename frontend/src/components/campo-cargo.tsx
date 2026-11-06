"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { SelectPesquisavel } from "@/components/select-pesquisavel";

type Cargo = { id: number; nome: string };

// Dropdown de cargo do cadastro de funcionário. Busca a lista sozinho
// (em vez de cada página passar por props) porque o mesmo campo aparece
// em três lugares — página de novo, página de editar e o popup da
// lista — e a lista de cargos é curta.
//
// Se o cargo ainda não existe, dá para cadastrar ali mesmo ("+ Cadastrar
// “Vigia”"): obrigar a pessoa a sair do formulário, ir em Cargos e
// voltar faria ela perder o que já tinha digitado.
export function CampoCargo({
  value,
  onChange,
}: {
  value: string;
  onChange: (cargoId: string) => void;
}) {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Cargo[]>("/cargos")
      .then(setCargos)
      .catch(() => setErro("Não foi possível carregar os cargos."));
  }, []);

  async function criar(nome: string) {
    const novo = await apiPost<Cargo>("/cargos", { nome });
    setCargos((atuais) =>
      [...atuais, novo].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    );
    return String(novo.id);
  }

  return (
    <>
      <SelectPesquisavel
        value={value}
        onChange={onChange}
        opcoes={cargos.map((c) => ({ valor: String(c.id), rotulo: c.nome }))}
        vazio="Sem cargo"
        placeholder="Sem cargo"
        aria-label="Cargo"
        onCriar={criar}
      />
      {erro && <span className="text-xs text-danger">{erro}</span>}
    </>
  );
}
