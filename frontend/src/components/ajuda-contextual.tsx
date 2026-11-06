"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ajudaDaRota, type ImagemAjuda } from "@/lib/ajuda";

// Botão "Ajuda desta página" + painel lateral com o texto da tela atual.
//
// O texto vem de lib/ajuda.ts, escolhido pela rota (usePathname) — por
// isso um único botão no menu lateral serve todas as páginas, sem
// precisar de um botão em cada uma (e sem brigar com os botões do
// cabeçalho delas).
//
// O painel é renderizado num portal no <body> com z-50, pelo mesmo
// motivo do Modal: o menu lateral é "sticky" e cria um contexto de
// empilhamento próprio, então um painel "fixed" filho dele ficaria
// por baixo do conteúdo principal.
//
// "Aberto" guarda a ROTA em que foi aberto, e não um true/false: ao
// navegar para outra página o painel se fecha sozinho (a rota deixa de
// bater) sem precisar de um efeito que desligue o estado.
export function AjudaContextual() {
  const pathname = usePathname();
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const [ampliada, setAmpliadaEstado] = useState<ImagemAjuda | null>(null);
  // Espelho em ref para o listener de teclado ler o valor atual sem
  // precisar ser recriado a cada abertura de imagem.
  const ampliadaRef = useRef<ImagemAjuda | null>(null);
  function setAmpliada(imagem: ImagemAjuda | null) {
    ampliadaRef.current = imagem;
    setAmpliadaEstado(imagem);
  }

  const ajuda = ajudaDaRota(pathname);
  const aberto = abertoEm === pathname;

  function fechar() {
    setAbertoEm(null);
    setAmpliada(null);
    // Devolve o foco a quem abriu, para quem navega pelo teclado não
    // "cair" no início da página.
    gatilhoRef.current?.focus();
  }

  useEffect(() => {
    if (!aberto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Com a imagem ampliada, o Esc fecha só ela (volta para o texto).
        if (ampliadaRef.current) {
          setAmpliada(null);
          return;
        }
        setAbertoEm(null);
        gatilhoRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [aberto]);

  if (!ajuda) return null;

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => {
          setAmpliada(null);
          setAbertoEm(pathname);
        }}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
        Ajuda desta página
      </button>

      {aberto &&
        createPortal(
          <div className="fixed inset-0 z-50">
            {/* Fundo: clicar fora fecha. É irmão do painel (não pai),
                então soltar o mouse aqui depois de selecionar texto no
                painel não conta como clique no fundo. */}
            <div
              className="absolute inset-0 bg-black/30"
              onClick={fechar}
              aria-hidden="true"
            />

            <aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="ajuda-titulo"
              className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-xl"
            >
              <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    Ajuda
                  </p>
                  <h2
                    id="ajuda-titulo"
                    className="text-lg font-semibold text-text"
                  >
                    {ajuda.titulo}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={fechar}
                  autoFocus
                  aria-label="Fechar ajuda"
                  className="rounded-md px-2 py-1 text-lg leading-none text-text-secondary transition-colors hover:bg-text/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  ×
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <p className="mb-5 text-sm text-text-secondary">
                  {ajuda.resumo}
                </p>

                {ajuda.imagens?.map((imagem) => (
                  <figure key={imagem.src} className="mb-5">
                    {/* No painel a foto fica pequena; clicar amplia na
                        própria tela. (Aba nova não serve: o app desktop
                        não abre outras janelas.) */}
                    <button
                      type="button"
                      onClick={() => setAmpliada(imagem)}
                      title="Ampliar a imagem"
                      className="block w-full cursor-zoom-in overflow-hidden rounded-md border border-border transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Image
                        src={imagem.src}
                        alt={imagem.legenda}
                        width={1280}
                        height={800}
                        // Arquivo estático já do tamanho certo: dispensa o
                        // otimizador do Next (que precisaria do "sharp"
                        // instalado no app desktop).
                        unoptimized
                        className="h-auto w-full"
                      />
                    </button>
                    <figcaption className="mt-1.5 text-xs text-text-secondary">
                      {imagem.legenda}{" "}
                      <span className="whitespace-nowrap">(clique para ampliar)</span>
                    </figcaption>
                  </figure>
                ))}

                {ajuda.secoes.map((secao) => (
                  <section key={secao.titulo} className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold text-text">
                      {secao.titulo}
                    </h3>
                    <ul className="list-disc space-y-1.5 pl-5 text-sm text-text">
                      {secao.itens.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </aside>

            {ampliada && (
              // Por cima do painel; clicar em qualquer lugar ou Esc fecha.
              <div
                role="dialog"
                aria-modal="true"
                aria-label={ampliada.legenda}
                onClick={() => setAmpliada(null)}
                className="absolute inset-0 z-10 flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-black/80 p-6"
              >
                <Image
                  src={ampliada.src}
                  alt={ampliada.legenda}
                  width={1280}
                  height={800}
                  unoptimized
                  className="h-auto max-h-[85vh] w-auto max-w-full rounded-md shadow-2xl"
                />
                <p className="text-sm text-white">{ampliada.legenda}</p>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
