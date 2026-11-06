"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

export type OpcaoSelect = {
  valor: string;
  rotulo: string;
  // Segunda linha, em cinza (ex.: a empresa do posto). Também entra na busca.
  detalhe?: string;
};

// Tira acento e maiúscula: "São José" casa com "sao jose".
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// ============================================================
// Dropdown com busca — substitui o <select> nativo nas listas longas
// (postos, empresas, funcionários, turnos, cargos...).
//
// Por que não o <select>: a "busca" dele só pula pela PRIMEIRA letra do
// texto, então digitar o nome da empresa nunca achava o posto dela; e a
// lista aberta ocupava a tela inteira. Aqui:
//   - a busca procura TODAS as palavras digitadas em qualquer parte do
//     rótulo e do detalhe ("tozetto matriz" acha "Matriz · Tozetto");
//   - a lista tem altura fixa e rola por dentro;
//   - funciona pelo teclado (setas, Enter, Esc), como o select.
//
// É um campo só: fechado mostra a opção escolhida; ao focar, vira caixa
// de busca. Mesma interface de um select controlado (value/onChange com
// string, "" = nada escolhido), então trocar um pelo outro é direto.
// ============================================================
export function SelectPesquisavel({
  value,
  onChange,
  opcoes,
  vazio,
  placeholder = "Selecione…",
  required,
  disabled,
  className = "",
  "aria-label": ariaLabel,
  onCriar,
}: {
  value: string;
  onChange: (valor: string) => void;
  opcoes: OpcaoSelect[];
  // Texto da opção "nenhum" (valor ""), ex.: "Todos os postos". Sem ela,
  // não há como voltar a "nenhum" depois de escolher.
  vazio?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  // Se informado, quando a busca não acha nada aparece "+ Cadastrar
  // “texto”" — cria o item na hora e já deixa escolhido (usado no cargo).
  onCriar?: (texto: string) => Promise<string>;
}) {
  const idLista = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [destaque, setDestaque] = useState(0);
  const [criando, setCriando] = useState(false);
  const [erroCriar, setErroCriar] = useState<string | null>(null);

  const todas = useMemo<OpcaoSelect[]>(
    () => (vazio !== undefined ? [{ valor: "", rotulo: vazio }, ...opcoes] : opcoes),
    [opcoes, vazio],
  );
  const escolhida = todas.find((o) => o.valor === value);
  // Fechado, o campo mostra também o detalhe: "Matriz" sozinho não diz de
  // qual empresa é o posto.
  const textoEscolhida = escolhida
    ? escolhida.detalhe
      ? `${escolhida.rotulo} · ${escolhida.detalhe}`
      : escolhida.rotulo
    : "";

  const filtradas = useMemo(() => {
    const palavras = normalizar(busca).split(/\s+/).filter(Boolean);
    if (palavras.length === 0) return todas;
    return todas.filter((o) => {
      if (o.valor === "") return false; // "Todos/Nenhum" só sem busca
      const alvo = normalizar(`${o.rotulo} ${o.detalhe ?? ""}`);
      return palavras.every((p) => alvo.includes(p));
    });
  }, [busca, todas]);

  const textoBusca = busca.trim();
  const mostrarCriar =
    !!onCriar &&
    textoBusca.length >= 2 &&
    !todas.some((o) => normalizar(o.rotulo) === normalizar(textoBusca));

  function abrir() {
    if (disabled || aberto) return;
    setBusca("");
    setErroCriar(null);
    // Abre já com a opção atual destacada e visível.
    const i = todas.findIndex((o) => o.valor === value);
    setDestaque(i >= 0 ? i : 0);
    setAberto(true);
    requestAnimationFrame(() => {
      listaRef.current
        ?.querySelector<HTMLElement>(`[data-indice="${i >= 0 ? i : 0}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
  }

  function fechar() {
    setAberto(false);
    setBusca("");
  }

  function escolher(opcao: OpcaoSelect) {
    onChange(opcao.valor);
    fechar();
  }

  async function criar() {
    if (!onCriar || criando) return;
    setCriando(true);
    setErroCriar(null);
    try {
      const novo = await onCriar(textoBusca);
      onChange(novo);
      fechar();
    } catch (err) {
      setErroCriar(err instanceof Error ? err.message : "Não foi possível cadastrar.");
    } finally {
      setCriando(false);
    }
  }

  function moverDestaque(novo: number) {
    setDestaque(novo);
    listaRef.current
      ?.querySelector<HTMLElement>(`[data-indice="${novo}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!aberto) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moverDestaque(Math.min(destaque + 1, filtradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moverDestaque(Math.max(destaque - 1, 0));
    } else if (e.key === "Enter") {
      // Enter escolhe; não deixa enviar o formulário com a lista aberta.
      e.preventDefault();
      if (filtradas[destaque]) escolher(filtradas[destaque]);
      else if (mostrarCriar) void criar();
    } else if (e.key === "Escape") {
      e.preventDefault();
      fechar();
    } else if (e.key === "Tab") {
      fechar();
    }
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        aria-activedescendant={aberto && filtradas[destaque] ? `${idLista}-${destaque}` : undefined}
        disabled={disabled}
        // Fechado: mostra a opção escolhida. Aberto: caixa de busca, com a
        // escolhida no placeholder para a pessoa não perder a referência.
        value={aberto ? busca : textoEscolhida}
        placeholder={aberto ? textoEscolhida || "Digite para buscar…" : placeholder}
        onChange={(e) => {
          setBusca(e.target.value);
          setDestaque(0);
          setErroCriar(null);
        }}
        onFocus={abrir}
        onClick={abrir}
        onBlur={fechar}
        onKeyDown={onKeyDown}
        autoComplete="off"
        className="w-full cursor-pointer truncate rounded-md border border-border bg-card py-2 pl-3 pr-8 text-sm text-text placeholder:text-text-secondary focus:cursor-text disabled:cursor-not-allowed disabled:opacity-60"
      />
      {/* Validação nativa do formulário ("preencha este campo"): o input
          visível está vazio enquanto se busca, então quem carrega o
          valor para o `required` é este campo escondido. */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          onFocus={() => inputRef.current?.focus()}
          className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
        />
      )}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary transition-transform ${aberto ? "rotate-180" : ""}`}
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>

      {aberto && (
        <div
          // mousedown com preventDefault: clicar na lista não tira o foco
          // do campo (senão o onBlur fecharia antes do clique valer).
          onMouseDown={(e) => e.preventDefault()}
          // Os formulários põem o campo dentro de um <label>; sem isto, o
          // clique numa opção "subiria" até o label, que clica no campo de
          // novo e reabriria a lista que acabou de fechar.
          onClick={(e) => e.preventDefault()}
          className="absolute left-0 z-40 mt-1 w-full min-w-[16rem] overflow-hidden rounded-md border border-border bg-card shadow-lg"
        >
          <ul ref={listaRef} id={idLista} role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtradas.map((o, i) => (
              <li
                key={o.valor || "__vazio"}
                id={`${idLista}-${i}`}
                data-indice={i}
                role="option"
                aria-selected={o.valor === value}
                onClick={() => escolher(o)}
                onMouseEnter={() => setDestaque(i)}
                className={`cursor-pointer px-3 py-1.5 text-sm ${
                  i === destaque ? "bg-primary/10" : ""
                } ${o.valor === value ? "font-semibold text-primary" : "text-text"} ${
                  o.valor === "" ? "italic text-text-secondary" : ""
                }`}
              >
                <span className="block truncate">{o.rotulo}</span>
                {o.detalhe && (
                  <span className="block truncate text-xs font-normal text-text-secondary">
                    {o.detalhe}
                  </span>
                )}
              </li>
            ))}
            {filtradas.length === 0 && !mostrarCriar && (
              <li className="px-3 py-2 text-sm text-text-secondary">Nada encontrado.</li>
            )}
          </ul>
          {mostrarCriar && (
            <button
              type="button"
              onClick={() => void criar()}
              disabled={criando}
              className="block w-full border-t border-border px-3 py-2 text-left text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
            >
              {criando ? "Cadastrando…" : `+ Cadastrar “${textoBusca}”`}
            </button>
          )}
          {erroCriar && (
            <p role="alert" className="border-t border-border px-3 py-2 text-xs text-danger">
              {erroCriar}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
