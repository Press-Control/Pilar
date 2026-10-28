import type { Metadata, Viewport } from "next";
import { PreferencesProvider, THEME_BOOT_SCRIPT } from "@/components/shell/preferences";
import { AppShell } from "@/components/shell/AppShell";
import "../styles/pilar-reference.css";
import "../styles/decision-lab.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "El Pilar — Un espacio para tus ideas",
  description: "De la intuición a la decisión: un interlocutor que cuestiona tu idea y te muestra qué falta.",
  icons: { icon: "/assets/logo-pilar.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Fonts: the approved guide uses system families (Arial/Helvetica UI, Georgia editorial, monospace data);
// no web font download is needed. See --font-ui / --font-editorial / --font-mono in globals.css.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <PreferencesProvider>
          <AppShell>{children}</AppShell>
        </PreferencesProvider>
      </body>
    </html>
  );
}
