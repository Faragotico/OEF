import type { Metadata } from "next";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/theme-toggle";
import { Nav } from "@/components/nav";

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
  themeColor: "#7f1d1d",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
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
        {/* Sidebar sempre na cor da marca (vermelho), com bordas retas e
            grossas — identidade visual "quadrada", sem minimalismo. */}
        <div className="flex min-h-screen">
          <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col justify-between overflow-y-auto border-r-4 border-black bg-[#7f1d1d] px-4 py-6">
            <div>
              <div className="mb-1 flex items-center gap-2 px-2">
                <Image
                  src="/android-chrome-192x192.png"
                  alt="OEF"
                  width={28}
                  height={28}
                />
                <span className="text-base font-black uppercase tracking-wide leading-tight text-white">
                  OEF Sistema
                </span>
              </div>
              <p className="mb-6 px-2 text-xs font-medium text-white/60">
                Gerenciamento de Escalas
              </p>
              <Nav />
            </div>

            <div className="flex flex-col items-start gap-3 px-2">
              <ThemeToggle />
              <p className="text-xs text-white/40">Versão 1.0.0</p>
            </div>
          </aside>

          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
