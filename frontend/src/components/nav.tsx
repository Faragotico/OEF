import Link from "next/link";

const links = [
  { href: "/funcionarios", label: "Funcionários" },
  { href: "/empresas", label: "Empresas" },
  { href: "/postos", label: "Postos" },
  { href: "/turnos", label: "Turnos" },
  { href: "/regras", label: "Regras" },
  { href: "/alocacoes", label: "Alocações" },
];

// Header agora é sempre a cor da marca (navy do logo), então os links
// usam branco/transparência em vez de depender do modo claro/escuro.
export function Nav() {
  return (
    <nav className="flex flex-wrap gap-4 text-sm font-medium">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-white/70 transition-colors hover:text-white"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
