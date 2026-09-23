import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/theme-toggle";
import { Nav } from "@/components/nav";
import { SairButton } from "@/components/sair-button";
import { temSessao } from "@/lib/sessao";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OEF",
  description: "Gestão de escalas e alocações de funcionários",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

// themeColor vive no export `viewport`, não no `metadata` — é onde o
// Next passou a lê-lo.
export const viewport: Viewport = {
  themeColor: "#0f766e",
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var isDark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

// Sidebar só existe com sessão (senão o login apareceria com o menu
// inteiro do sistema do lado). Async porque ler cookie é assíncrono
// no Next 15+.
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const autenticado = await temSessao();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">
        {autenticado ? (
          /* Sidebar na cor principal da marca (verde-petróleo), sem
             bordas grossas — visual limpo, estilo SaaS. */
          <div className="flex min-h-screen">
            <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col justify-between overflow-y-auto bg-primary px-4 py-6">
              <div>
                {/* A marca leva à tela inicial — convenção padrão. */}
                <Link
                  href="/"
                  aria-label="Ir para a tela inicial"
                  className="mb-6 block rounded-lg px-2 py-1 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <span className="mb-1 flex items-center gap-2">
                    <Image
                      src="/android-chrome-192x192.png"
                      alt=""
                      width={28}
                      height={28}
                    />
                    <span className="text-base font-black uppercase tracking-wide leading-tight text-white">
                      OEF Sistema
                    </span>
                  </span>
                  <span className="block text-xs font-medium text-white/60">
                    Gerenciamento de Escalas
                  </span>
                </Link>
                <Nav />
              </div>

              <div className="flex flex-col items-start gap-3 px-2">
                <SairButton />
                <ThemeToggle />
                <p className="text-xs text-white/40">Versão 1.0.0</p>
              </div>
            </aside>

            <div className="min-w-0 flex-1">{children}</div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
