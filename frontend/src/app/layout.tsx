import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CityPulse - Municipal Traffic x402",
  description:
    "Real-time municipal traffic intelligence with x402 nanopayments. Get optimized routes powered by Istanbul's municipal vehicle fleet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
