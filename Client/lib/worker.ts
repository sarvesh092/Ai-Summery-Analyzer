import { Worker } from "bullmq";
import IORedis from "ioredis";
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { downloadFile } from "./gcpUtils";
import { getVectorStore } from "./vectorStore";

const connection = new IORedis({ maxRetriesPerRequest: null });
const vectorStore = getVectorStore();


const worker = new Worker(
  "fileProcessing",
  async (job) => {
    console.log("Processing job:", job.data);
    
    try {
      // Extract filename from the job payload
      const fileName = job.data.fileObj.fileName;

      if (!fileName) {
        throw new Error("Invalid file name: " + fileName);
      }

      console.log("Downloading file from GCS:", fileName);
      const fileBuffer = await downloadFile(fileName);
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${fileName}`);

      fs.writeFileSync(tempFilePath, fileBuffer);
      
      try {
        // Load PDF using the temporary file
        const loader = new PDFLoader(tempFilePath);
        const docs = await loader.load();
        const docsWithMeta = docs.map(d => ({
          ...d,
          metadata: { ...(d.metadata || {}), fileName }
        }));

        console.log("Docs loaded successfully", docs);

        await vectorStore.addDocuments(docsWithMeta);
        console.log("Documents processed successfully");
        
      } finally {
        try {
          fs.unlinkSync(tempFilePath);
          console.log("Temporary file cleaned up");
        } catch (cleanupError) {
          console.warn("Failed to clean up temporary file:", cleanupError);
        }
      }
      
    } catch (error) {
      console.error("Error processing file:", error);
      throw error;
    }
  },
  { connection }
);
