import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EH Chat Leads · Asha Dashboard",
  description: "Realtime daily dashboard for EzyHelpers chatbot leads.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
