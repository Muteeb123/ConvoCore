

if (!process.env.PHONE_NUMBER_ID || !process.env.WB_TOKEN) {
    throw new Error("environment variables not set for whatsapp");
}
const WA_API_URL = `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`;

export async function sendTemplateMessage(to: any, templateName: any, languageCode: any) {
    try {
        const res = await fetch(
            WA_API_URL,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.WB_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to,
                    type: "template",
                    template: {
                        name: templateName,
                        language: { code: languageCode }
                    }
                })
            }
        );

        const data = await res.json();

        if (!res.ok) {
            console.error("❌ Error sending message:", data);
            return;
        }

        console.log("✅ Message sent successfully:", data);
    } catch (error) {
        console.error("🚨 Fetch error:", error);
    }
}
export async function sendMessage(to: any, body: any) {
    try {
        const res = await fetch(WA_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to,
                type: "text",
                text: {
                    body
                }
            })
        });
        // console.log('message sent successfully',res)
    } catch (error) {
        console.log('error while sending message', error)
    }
}
export async function replyMessage(to: any, body: any, messageId: any) {
    try {
        const res = await fetch(WA_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to,
                type: "text",
                text: {
                    body
                },
                context: {
                    message_id: messageId
                }
            })
        });
        // console.log('message sent successfully',res)
    } catch (error) {
        console.log('error while sending message', error)
    }
}

export async function uploadMedia(fileBuffer: any, mimeType: any) {
    try {
        if (mimeType === "audio/x-m4a") {
            mimeType = "audio/mp4"; // WhatsApp supports audio/mp4 instead
        }
        const formData = new FormData();
        // formData.append("file", new Blob([fileBuffer]), "file");
        formData.append(
            "file",
            new Blob([fileBuffer], { type: mimeType }), // ✅ Preserve actual MIME type
            "file"
        );
        formData.append("messaging_product", "whatsapp");

        const res = await fetch(
            `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/media`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.WB_TOKEN}`,
                },
                body: formData,
            }
        );

        const data = await res.json();

        if (!res.ok) throw new Error(data.error?.message || "Media upload failed");

        console.log("Uploaded media:", data);
        return data.id; // This is media_id
    } catch (err) {
        console.error("Error uploading media:", err);
        throw err;
    }
}


// export async function sendMediaMessage(to: any, mediaId: any, type: any, caption = "") {
//     try {
//         const res = await fetch(
//             `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
//             {
//                 method: "POST",
//                 headers: {
//                     Authorization: `Bearer ${process.env.WB_TOKEN}`,
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({
//                     messaging_product: "whatsapp",
//                     to,
//                     type,
//                     [type]: {
//                         id: mediaId,
//                         caption,
//                     },
//                 }),
//             }
//         );

//         const data = await res.json();

//         if (!res.ok) throw new Error(data.error?.message || "Message send failed");

//         console.log("Message sent:", data);
//         return data;
//     } catch (err) {
//         console.error("Error sending media message:", err);
//         throw err;
//     }
// }
export async function sendMediaMessage(to: any, mediaId: any, type: any, caption = "", filename = "") {
    try {
        let mediaPayload: any = { id: mediaId };

        if (type === "image" || type === "video") {
            if (caption) mediaPayload.caption = caption;
        } else if (type === "document") {
            if (caption) mediaPayload.caption = caption;
            if (filename) mediaPayload.filename = filename;
        }

        const res = await fetch(
            `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.WB_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to,
                    type,
                    [type]: mediaPayload,
                }),
            }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Message send failed");

        console.log("✅ Media message sent:", data);
        return data;
    } catch (err) {
        console.error("❌ Error sending media message:", err);
        throw err;
    }
}
