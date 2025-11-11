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
const bucket = storage.bucket(`${process.env.AVATAR_BUCKET}`);

if (!bucket) {
    throw new Error("Error in the bucket")
}

export const uploadCustomerProfile = async (
    profilePic: Express.Multer.File,
    userId: number
): Promise<string> => {

    const uploadedPath = `${userId}/${Date.now()}-${profilePic.originalname}`;
    const blob = bucket.file(uploadedPath);

    await blob.save(profilePic.buffer, {
        contentType: profilePic.mimetype,
        resumable: false,
    });


    return uploadedPath;
};

export const uploadFallback = async (
    profilePic: Express.Multer.File,
): Promise<string> => {

    const uploadedPath = `fallback`;
    const blob = bucket.file(uploadedPath);

    await blob.save(profilePic.buffer, {
        contentType: profilePic.mimetype,
        resumable: false,
    });
    const cloudUrl = `https://storage.googleapis.com/${process.env.AVATAR_BUCKET}/${uploadedPath}`



    return cloudUrl;
};

export const uploadProfile = async (
    profilePic: Express.Multer.File,
    prefix: string,
    id: number
): Promise<string> => {
    const uploadedPath = `${prefix}/${id}`;

    const blob = bucket.file(uploadedPath);
    const [exists] = await blob.exists();
    if (exists) {
        console.log('....Avatar already exists ', blob)
        await blob.delete({ ignoreNotFound: true });
        console.log('....Delete existing avatar ', blob)
    }

    await blob.save(profilePic.buffer, {
        contentType: profilePic.mimetype,
        resumable: false,
    });
    const cloudUrl = `https://storage.googleapis.com/${process.env.AVATAR_BUCKET}/${uploadedPath}`;
    console.log('....Created avatar avatar ', uploadedPath)
    // return cloudUrl;
    return `${cloudUrl}?t=${Date.now()}`;

};


export const getProfilePic = async (req: Request, res: Response) => {
    try {
        let { prefix } = req.query;

        if (!prefix || typeof prefix !== "string") {
            return res.status(400).json({ message: "Missing or invalid prefix" });
        }

        // Clean up the prefix
        prefix = prefix.replace(/\/+$/, "");

        const file = bucket.file(prefix);
        const [exists] = await file.exists();

        let targetFilePath = prefix;

        if (!exists) {
            // Construct a proper fallback path
            const basePath = prefix.includes("/") ? prefix.split("/")[0] : prefix;
            targetFilePath = `${basePath}/fallback`;
        }

        const [metadata] = await bucket.file(targetFilePath).getMetadata();

        const result = {
            name: targetFilePath.split("/").pop()?.replace(/^\d+-/, ""),
            path: targetFilePath,
            url: `https://storage.googleapis.com/${process.env.AVATAR_BUCKET}/${targetFilePath}`,
            size: metadata.size ? Number(metadata.size) : 0,
            contentType: metadata.contentType || "unknown",
            lastModified: metadata.updated
                ? new Date(metadata.updated).toISOString().slice(0, 19).replace("T", " ")
                : null,
        };

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("❌ Error retrieving profile picture:", error);
        return res.status(500).json({
            message: "Error retrieving profile picture",
            error: error.message,
        });
    }
};
export const deleteAvatar = async (
    prefix: string,
    id: number) => {
    try {
        if (!prefix || !id) {
            throw new Error("prefix and id are required to delete avatar")
        }
        const filePath = `${prefix}/${id}`;
        const file = bucket.file(filePath);
        await file.delete({ ignoreNotFound: true });
        const [exists] = await file.exists();
        if (exists) {

            console.log('deleted avatar still exists : ', filePath)
        } else {
            console.log('deleted avatar path : ', filePath)

        }
    }
    catch (error) {
        console.error("Error deleting files from GCP:", error);
    }
}

export const getFallbackProfilePic = async (req: Request, res: Response) => {
    try {
        let { prefix } = req.query;

        if (!prefix || typeof prefix !== "string") {
            return res.status(400).json({ message: "Missing or invalid prefix" });
        }
        const targetFilePath = `${prefix.replace(/\/$/, "")}/fallback`;

        const file = bucket.file(targetFilePath);
        const [exists] = await file.exists();

        if (!exists) {
            return res.status(404).json({
                message: `Fallback image not found for prefix '${prefix}'`,
            });
        }

        const result = {
            url: `https://storage.googleapis.com/${process.env.AVATAR_BUCKET}/${targetFilePath}`,
        };

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Error retrieving default profile picture:", error);
        return res.status(500).json({
            message: "Error retrieving default profile picture",
            error: error.message,
        });
    }
};


