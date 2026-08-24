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
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  themeColor: "#0f172a",
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
      <body className="min-h-full flex flex-col">
        {/* Header sempre na cor da marca (navy do logo), independente do
            tema claro/escuro escolhido pro conteúdo. */}
        <header className="flex items-center justify-between gap-6 bg-[#0f172a] px-6 py-3">
          <div className="flex items-center gap-2">
            <Image
              src="/android-chrome-192x192.png"
              alt="OEF"
              width={28}
              height={28}
              className="rounded"
            />
            <span className="text-sm font-semibold tracking-wide text-white">
              OEF
            </span>
          </div>
          <Nav />
          <ThemeToggle />
        </header>
        {children}
      </body>
    </html>
  );
}
