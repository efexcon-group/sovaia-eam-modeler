import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata = { title: "Architecture Modeler" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
