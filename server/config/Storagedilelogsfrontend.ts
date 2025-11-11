import { Request, Response } from "express";
import { Storage } from "@google-cloud/storage";

if (!process.env.GCP_KEY) {
  throw new Error("GCP_KEY environment variable not set.");
}

const rawCredentials = JSON.parse(process.env.GCP_KEY);
if (rawCredentials.private_key) {
  rawCredentials.private_key = rawCredentials.private_key.replace(/\\n/g, "\n");
}

const storage = new Storage({ credentials: rawCredentials });
const bucket = storage.bucket("crmlogs");

export const listLogs = async (req: Request, res: Response) => {
  try {
    const [files] = await bucket.getFiles();

    const result = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();

        return {
          name: file.name,
          path: file.name,
          size: metadata.size ? Number(metadata.size) : 0, 
          lastModified: metadata.updated || null,         
        };
      })
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error listing logs:", error);
    res.status(500).json({ message: "Error listing logs", error: error.message });
  }
};

// export const listLogs = async (req: Request, res: Response) => {
//   try {
//     const [files] = await bucket.getFiles();

//     const result = files.map((file) => ({
//       name: file.name,
//       path: file.name,
//     }));

//     res.status(200).json(result);
//   } catch (error: any) {
//     console.error("Error listing logs:", error);
//     res.status(500).json({ message: "Error listing logs", error: error.message });
//   }
// };

// ⬇️ Download a specific log (by filename in query)
export const downloadLog = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({ message: "Filename is required" });
    }

    const file = bucket.file(filename);

    // Check if exists
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ message: "File not found" });
    }

    // Pipe download stream directly
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    file.createReadStream().pipe(res);
  } catch (error: any) {
    console.error("Error downloading log:", error);
    res.status(500).json({ message: "Error downloading log", error: error.message });
  }
};
