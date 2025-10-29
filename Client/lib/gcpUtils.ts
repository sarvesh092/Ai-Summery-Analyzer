import dotenv from 'dotenv';
dotenv.config();
import { Storage } from "@google-cloud/storage";
import path from "path";
import mime from "mime-types";

const bucketName = process.env.GCLOUD_BUCKET_NAME;
const keyFilePath = process.env.GCLOUD_KEYFILE_PATH;


if (!bucketName || !keyFilePath) {
  throw new Error(
    "missing gcloud bucket name or key file path in environment variables"
  );
}

const storage = new Storage({
  keyFilename: path.resolve(process.cwd(), keyFilePath)
});

const bucket = storage.bucket(bucketName);

const allowedMimeTypes = [
  "application/pdf",
];

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType?: string
) {
  const allowedContent =
    contentType || mime.lookup(fileName) || "application/octet-stream";
  if (!allowedMimeTypes.includes(allowedContent)) {
    throw new Error("Unsupported file type: " + allowedContent);
  }
  try {
    const file = bucket.file(fileName);

    const stream = file.createWriteStream({
      resumable: false,
      contentType: allowedContent
    });

    return new Promise((resolve, reject) => {
      stream.on("finish", () => {
        resolve({ fileName, fileUrl: `gs://${bucketName}/${fileName}` });
      });

      stream.on("error", (error) => {
        console.error("Upload error:", error);
        reject(error);
      });

      stream.end(fileBuffer);
    });
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}

// get file from Google Cloud Storage
export async function downloadFile(fileName: string): Promise<Buffer> {
  if (!fileName || typeof fileName !== "string" || fileName.trim() === "") {
    throw new Error("Invalid file name provided for download");
  }
  try {
    const file = bucket.file(fileName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new Error("File not found in GCS");
    }

    const [fileBuffer] = await file.download();
    return fileBuffer;
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
}

export async function getAllFiles(): Promise<string[]> {
  try {
    const [files] = await bucket.getFiles();
    return files.map((file) => file.name);
  } catch (error) {
    console.error("Error fetching file list:", error);
    throw error;
  }
}
