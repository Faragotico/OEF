"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// "?" pequeno que mostra uma dica curta. Passar o mouse (ou chegar nele
// pelo teclado) mostra o balão; clicar FIXA o balão, e Esc ou um clique
// fora fecha. O clique existe por causa da tela de toque, onde não há
// "passar o mouse".
//
// O gatilho é um <span role="button">, e não um <button>, de propósito:
// os rótulos dos formulários são <label>, e um <button> dentro do label
// viraria o "campo" do rótulo no lugar do <input> (clicar no texto do
// rótulo acionaria a dica em vez de focar o campo).
//
// O BALÃO é desenhado num portal no <body>, com posição "fixed" calculada
// a partir do "?" e presa dentro da janela. Antes ele era "absolute"
// dentro do rótulo, e isso quebrava nos formulários em popup: o Modal
// tem rolagem própria (overflow-y-auto, que também liga a rolagem
// horizontal), então um balão que passava da borda direita ou do fim do
// popup criava barra de rolagem dentro dele. No portal ele nunca é
// cortado nem estica o contêiner.
const MARGEM = 8; // folga mínima entre o balão e a borda da janela
const DISTANCIA = 6; // espaço entre o "?" e o balão

export function Dica({
  children,
  alinhar = "esquerda",
}: {
  children: ReactNode;
  /** Preferência de lado: de que lado do "?" o balão se estica. Se não couber, ele é empurrado para dentro da janela. */
  alinhar?: "esquerda" | "direita" | "centro";
}) {
  const id = useId();
  const raiz = useRef<HTMLSpanElement>(null);
  const balao = useRef<HTMLSpanElement>(null);
  const [sobre, setSobre] = useState(false);
  const [fixo, setFixo] = useState(false);
  const aberto = sobre || fixo;

  useEffect(() => {
    if (!aberto) return;
    const aoApertar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSobre(false);
        setFixo(false);
      }
    };
    // O balão está fora do DOM da raiz (portal), então clicar nele
    // também conta como "dentro".
    const aoClicarFora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!raiz.current?.contains(alvo) && !balao.current?.contains(alvo)) {
        setFixo(false);
      }
    };
    document.addEventListener("keydown", aoApertar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      document.removeEventListener("keydown", aoApertar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto]);

  // Posiciona antes de o navegador pintar (sem "pulo" na tela) e
  // reposiciona se a janela ou qualquer contêiner rolar enquanto aberto.
  // Escreve direto no style do elemento, sem estado: não precisa de
  // nova renderização do React.
  useLayoutEffect(() => {
    if (!aberto) return;

    function posicionar() {
      const gatilho = raiz.current;
      const el = balao.current;
      if (!gatilho || !el) return;

      const r = gatilho.getBoundingClientRect();
      const largura = el.offsetWidth;
      const altura = el.offsetHeight;
      const larguraJanela = document.documentElement.clientWidth;

      let left =
        alinhar === "direita"
          ? r.right - largura
          : alinhar === "centro"
            ? r.left + r.width / 2 - largura / 2
            : r.left;
      left = Math.max(MARGEM, Math.min(left, larguraJanela - largura - MARGEM));

      // Abaixo do "?"; se não couber e houver espaço, vai para cima.
      let top = r.bottom + DISTANCIA;
      const cabeEmbaixo = top + altura <= window.innerHeight - MARGEM;
      const cabeEmCima = r.top - DISTANCIA - altura >= MARGEM;
      if (!cabeEmbaixo && cabeEmCima) top = r.top - DISTANCIA - altura;

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    }

    posicionar();
    window.addEventListener("resize", posicionar);
    // "true" (captura): rolagem não "borbulha", e o que rola pode ser
    // o corpo do popup e não a página.
    window.addEventListener("scroll", posicionar, true);
    return () => {
      window.removeEventListener("resize", posicionar);
      window.removeEventListener("scroll", posicionar, true);
    };
  }, [aberto, alinhar]);

  function alternar() {
    if (fixo) {
      setFixo(false);
      setSobre(false);
    } else {
      setFixo(true);
    }
  }

  return (
    <span
      ref={raiz}
      className="relative ml-1.5 inline-flex align-middle"
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => setSobre(false)}
    >
      <span
        role="button"
        tabIndex={0}
        aria-label="Ajuda"
        aria-expanded={aberto}
        aria-describedby={aberto ? id : undefined}
        onClick={(e) => {
          // Dentro de um <label>, o clique repassaria o foco/toggle ao campo.
          e.preventDefault();
          e.stopPropagation();
          alternar();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            alternar();
          }
        }}
        // Só abre ao focar pelo teclado: foco por clique do mouse não
        // conta, senão o segundo clique (que fecha) reabriria na hora.
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) setSobre(true);
        }}
        onBlur={() => setSobre(false)}
        className="inline-flex h-4 w-4 cursor-help select-none items-center justify-center rounded-full border border-border text-[10px] font-bold normal-case leading-none tracking-normal text-text-secondary transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
      >
        ?
      </span>
      {aberto &&
        createPortal(
          <span
            ref={balao}
            role="tooltip"
            id={id}
            // Num portal, os eventos ainda "borbulham" pela árvore do
            // React até o <label> pai: sem isto, clicar no balão
            // acionaria o campo do rótulo.
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            // top/left são escritos pelo useLayoutEffect acima.
            className="fixed left-0 top-0 z-[60] block w-64 max-w-[calc(100vw-16px)] whitespace-normal rounded-lg border border-border bg-card px-3 py-2 text-left text-xs font-normal normal-case leading-snug tracking-normal text-text shadow-md"
          >
            {children}
          </span>,
          document.body,
        )}
    </span>
  );
}
