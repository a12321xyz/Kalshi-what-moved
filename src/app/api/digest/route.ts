import { NextResponse } from "next/server";
import { getDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
    try {
        const digest = await getDigest();
        return NextResponse.json(digest, {
            headers: {
                "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
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
