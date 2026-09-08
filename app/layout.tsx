import type { Metadata } from "next";
import "./globals.css";
import { AuctionHallBackdrop } from "@/components/AuctionHallBackdrop";

export const metadata: Metadata = {
  title: "Zwanni",
  description: "Das 20$-Auktionsspiel für zwei – live gegeneinander bieten, andere stimmen ab.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <AuctionHallBackdrop />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
