"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Ícones inline (estilo Feather/Lucide, stroke currentColor) — evita
// depender de um pacote de ícones só pra isso.
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}
function IconMapPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
function IconFileText() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}
function IconUserOff() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M17 8l5 5M22 8l-5 5" />
    </svg>
  );
}
function IconClipboardList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h6M9 8h2" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

// Ordem segue o fluxo de cadastro, de quem depende de quem: Empresa
// existe antes de Posto, Posto antes de Turno e Funcionário, e as duas
// telas de uso do dia a dia (Escalas, Alocações) ficam no fim.
const links: { href: string; label: string; icon: () => ReactNode }[] = [
  { href: "/empresas", label: "Empresas", icon: IconBuilding },
  { href: "/regras", label: "Regras", icon: IconFileText },
  { href: "/postos", label: "Postos", icon: IconMapPin },
  { href: "/turnos", label: "Turnos", icon: IconClock },
  { href: "/funcionarios", label: "Funcionários", icon: IconUsers },
  { href: "/ausencias", label: "Ausências", icon: IconUserOff },
  { href: "/escalas", label: "Escalas", icon: IconCalendar },
  { href: "/alocacoes", label: "Alocações", icon: IconClipboardList },
];

// Navegação lateral (sidebar): item ativo em bloco preto sólido (bordas
// retas), tipografia em caixa alta e negrito — identidade "quadrada" e
// nada minimalista, em tons de vermelho e preto.
export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname?.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "flex items-center gap-3 border-2 border-black bg-black px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors"
                : "flex items-center gap-3 border-2 border-transparent px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-white/70 transition-colors hover:border-black hover:bg-black/30 hover:text-white"
            }
          >
            <Icon />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
