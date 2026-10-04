import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import ReactLenis from "lenis/react";

export const metadata: Metadata = {
  title: "saveyour.tech — Save what matters",
  description:
    "A searchable memory for the social posts, ideas, and inspiration you want to keep.",
};

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "700"],
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`min-h-screen antialiased ${sora.className}`}>
      <body className="min-h-screen">
        <ReactLenis root>{children}</ReactLenis>
      </body>
    </html>
  );
}
