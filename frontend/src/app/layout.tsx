import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CityPulse - Municipal Traffic Nanopayments",
  description:
    "Real-time municipal traffic intelligence with Circle Nanopayments on Arc. Sub-cent, gas-free payments for route optimization and parking data.",
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
