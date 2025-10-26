import { NextResponse, NextRequest } from "next/server";
import { uploadFile } from "@/lib/gcpUtils";

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file = data.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded or invalid file" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const originalName = file.name;
    const cleanFileName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Upload to GCS
    const fileObj = await uploadFile(
      Buffer.from(buffer),
      cleanFileName,
      file.type
    );

    return NextResponse.json(
      { message: "File uploaded successfully", fileObj },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error uploading file:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload file"
      },
      { status: 500 }
    );
  }
}
