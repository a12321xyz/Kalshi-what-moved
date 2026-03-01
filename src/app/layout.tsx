import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "WhatMoved — Kalshi Daily Prediction Market Movers",
    description:
        "See what moved in prediction markets today. Biggest price swings, highest volume, and recently settled markets — powered by Kalshi.",
    openGraph: {
        title: "WhatMoved — Kalshi Daily Prediction Market Movers",
        description:
            "See what moved in prediction markets today. Biggest price swings, highest volume, and recently settled markets.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "WhatMoved — Kalshi Daily Prediction Market Movers",
        description:
            "See what moved in prediction markets today.",
    },
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
