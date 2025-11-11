import { Storage } from "@google-cloud/storage";
import { Request, Response } from "express";

if (!process.env.GCP_KEY) {
  throw new Error("GCP_KEY environment variable not set.");
}

const rawCredentials = JSON.parse(process.env.GCP_KEY);
if (rawCredentials.private_key) {
  rawCredentials.private_key = rawCredentials.private_key.replace(/\\n/g, "\n");
}

const storage = new Storage({ credentials: rawCredentials });
const bucket = storage.bucket("crm_rsp");

/**
 * Upload files to GCP under a user-specific folder.
 * Returns an array of file paths.
 */
export const uploadFilesToGCP = async (
  files: Express.Multer.File[],
  userId: number
): Promise<string[]> => {
  const uploadedPaths: string[] = [];

  for (const file of files) {
    const destination = `${userId}/${Date.now()}-${file.originalname}`;
    const blob = bucket.file(destination);

    await blob.save(file.buffer, {
      contentType: file.mimetype,
      resumable: false,
    });

    // store only the relative path (not full URL)
    uploadedPaths.push(destination);
  }

  return uploadedPaths;
};

//**
//  * Delete specific files from GCP
//  */
export const deleteFilesFromGCP = async (filePaths: string[]) => {
  try {
    for (const path of filePaths) {
      await bucket.file(path).delete();
      console.log(`Deleted file: ${path}`);
    }
  } catch (error) {
    console.error("Error deleting files from GCP:", error);
  }
};




/**
 * Download a file from GCP by its stored path
 * Example URL: /api/customer-files/123%2F1728574930-contract.pdf
 */
export const downloadFileFromGCP = async (req: Request, res: Response) => {
  try {
    const { filePath } = req.params;

    if (!filePath) {
      return res.status(400).json({ message: "File path is required" });
    }

    // Decode because client-side encodes slashes
    const decodedPath = decodeURIComponent(filePath);

    const file = bucket.file(decodedPath);

    // Check if the file exists
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ message: "File not found" });
    }

    // Extract filename (for download name)
    const filename = decodedPath.split("/").pop() || "download";

    // Stream file directly to response
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    file.createReadStream().pipe(res);
  } catch (error: any) {
    console.error("❌ Error downloading file from GCP:", error);
    res.status(500).json({ message: "Error downloading file", error: error.message });
  }
};
// upload customer files
export const uploadCustomerFiles = async (
  files: Express.Multer.File[],
  customerId: number
): Promise<string[]> => {
  const uploadedPaths: string[] = [];

  for (const file of files) {
    // const destination = `${customerId}/${Date.now()}-${file.originalname}`;
    const destination = `customer/${customerId}/${Date.now()}-${file.originalname}`;
    const blob = bucket.file(destination);

    await blob.save(file.buffer, {
      contentType: file.mimetype,
      resumable: false,
    });

    // store only the relative path (not full URL)
    uploadedPaths.push(destination);
  }

  return uploadedPaths;
};
export const uploadOpportunityFiles = async (
  files: Express.Multer.File[],
  opportunityId: number
): Promise<string[]> => {
  const uploadedPaths: string[] = [];

  for (const file of files) {
    const destination = `opportunity/${opportunityId}/${Date.now()}-${file.originalname}`;
    const blob = bucket.file(destination);

    await blob.save(file.buffer, {
      contentType: file.mimetype,
      resumable: false,
    });

    // store only the relative path (not full URL)
    uploadedPaths.push(destination);
  }

  return uploadedPaths;
};

/**
 * List all files uploaded to GCP (optionally filtered by customer folder)
 */
export const listFilesFromGCP = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query;

    const prefix = `customer/${customerId}/`;

    // Get all files (optionally under that prefix)
    const [allFiles] = await bucket.getFiles();
    // console.log("All files in bucket:", allFiles.map(f => f.name));

    const [files] = await bucket.getFiles({ prefix });
    // console.log(`files are ${files}`)

    const result = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return {
          name: file.name.split("/").pop()?.replace(/^\d+-/, ""),
          path: file.name,
          size: metadata.size ? Number(metadata.size) : 0,
          contentType: metadata.contentType || "unknown",
          // lastModified: metadata.updated || null,
          lastModified: metadata.updated
            ? new Date(metadata.updated).toISOString().slice(0, 19).replace("T", " ")
            : null,

        };
      })
    );

    // console.log(`The result is ${JSON.stringify(result)}`)
    res.status(200).json(result);
  } catch (error: any) {
    console.error("❌ Error listing files from GCP:", error);
    res
      .status(500)
      .json({ message: "Error listing files", error: error.message });
  }
};
export const listTaskFiles = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query;

    const prefix = `customer/${customerId}/`;

    // Get all files (optionally under that prefix)
    const [allFiles] = await bucket.getFiles();
    // console.log("All files in bucket:", allFiles.map(f => f.name));

    const [files] = await bucket.getFiles({ prefix });
    // console.log(`files are ${files}`)

    const result = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return {
          name: file.name.split("/").pop()?.replace(/^\d+-/, ""),
          path: file.name,
          size: metadata.size ? Number(metadata.size) : 0,
          contentType: metadata.contentType || "unknown",
          // lastModified: metadata.updated || null,
          lastModified: metadata.updated
            ? new Date(metadata.updated).toISOString().slice(0, 19).replace("T", " ")
            : null,

        };
      })
    );

    // console.log(`The result is ${JSON.stringify(result)}`)
    res.status(200).json(result);
  } catch (error: any) {
    console.error("❌ Error listing files from GCP:", error);
    res
      .status(500)
      .json({ message: "Error listing files", error: error.message });
  }
};
export const listgcpfiles = async (req: Request, res: Response) => {
  try {
    const { id,pre } = req.query;
    const prefix = `${pre}/${id}/`;
    const [files] = await bucket.getFiles({ prefix });
    const result = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return {
          name: file.name.split("/").pop()?.replace(/^\d+-/, ""),
          path: file.name,
          size: metadata.size ? Number(metadata.size) : 0,
          contentType: metadata.contentType || "unknown",
          // lastModified: metadata.updated || null,
          lastModified: metadata.updated
            ? new Date(metadata.updated).toISOString().slice(0, 19).replace("T", " ")
            : null,
          // lastModified: metadata.updated
          //   ? new Date(metadata.updated).toLocaleDateString('en-US')
          //   : null,

        };
      })
    );
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error listing files from GCP:", error);
    res
      .status(500)
      .json({ message: "Error listing files", error: error.message });
  }
};

export const uploadMessageMedia = async (
  files: any,
  senderId: number,
  receiverId:number,
): Promise<string[]> => {
  const uploadedPaths: string[] = [];

  for (const file of files) {
    const destination = `messages/${senderId}/${receiverId}/${Date.now()}-${file.originalname}`;
    const blob = bucket.file(destination);

    await blob.save(file.buffer, {
      contentType: file.mimetype,
      resumable: false,
    });

    // store only the relative path (not full URL)
    uploadedPaths.push(destination);
  }

  return uploadedPaths;
};