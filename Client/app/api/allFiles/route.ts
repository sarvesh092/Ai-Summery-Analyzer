import { NextResponse } from "next/server";
import { getAllFiles } from "@/lib/gcpUtils";
export async function GET() {
  try {
    const files = await getAllFiles();
    return NextResponse.json({ files }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch files"
      },
      { status: 500 }
    );
  }
}
