"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Modal genérico reaproveitado em todo cadastro do sistema — no lugar
// de navegar pra uma tela nova, o formulário abre por cima da lista
// atual (era o pedido: "dá pra fazer em popup, fica mais legal"). ESC
// ou clique fora fecha.
//
// "Clique fora" NÃO pode ser um onClick simples no fundo escurecido:
// selecionar um texto dentro de um campo do formulário e soltar o
// mouse fora da caixa (arrastar demais) conta como "clique" no fundo
// pro navegador (mousedown num elemento, mouseup em outro ainda
// dispara o evento click no ancestral comum), fechando o modal sem
// querer no meio de uma edição. Por isso guardamos onde o mousedown
// começou: só fecha se o mousedown E o mouseup/click aconteceram os
// dois diretamente no fundo, não dentro do conteúdo.
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const mousedownNoFundo = useRef(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        mousedownNoFundo.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (mousedownNoFundo.current && e.target === e.currentTarget) {
          onClose();
        }
        mousedownNoFundo.current = false;
      }}
    >
      <div
        className="animate-fade-in-up max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-md border border-border bg-card text-lg font-bold leading-none text-text transition-colors hover:bg-danger hover:text-white"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
