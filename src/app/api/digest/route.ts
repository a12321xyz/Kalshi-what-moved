import { NextResponse } from "next/server";
import dns from "node:dns";
import { getDigest } from "@/lib/digest";

dns.setDefaultResultOrder("ipv4first");

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel hobby plan cap

export async function GET() {
    try {
        const digest = await getDigest();
        return NextResponse.json(digest, {
            headers: {
                // Cache at CDN for 60s; serve stale for up to 5 min while revalidating
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
        });
    } catch (err) {
        console.error("[api/digest] Error:", err);
        return NextResponse.json(
            { error: "Failed to fetch digest" },
            { status: 502 }
        );
    }
}
