import { log } from "console";
import appendToCurrentDateFile from "server/config/StorageConnection";
import { saveActivityLog } from "./ActivityLog";

const logRequests = (req, res, next) => {
  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    let responseBody; 

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      responseBody = body; 
      return originalJson(body);
    };

    const originalSend = res.send.bind(res);
    res.send = (body) => {
      try {
        responseBody = JSON.parse(body);
      } catch {
        responseBody = body;
      }
      return originalSend(body);
    };

    res.on("finish", async () => {
      const pad = (n) => String(n).padStart(2, "0");
      const date = new Date();
      const dateStr = `${pad(date.getDate())}:${pad(date.getMonth() + 1)}:${date.getFullYear()}`;
      const timeStr = date.toLocaleTimeString("en-US");

      const detailsStr = responseBody ? JSON.stringify(responseBody) : "";

      const logString = `${dateStr} : ${timeStr} :: ${req.method} ${req.originalUrl} ${res.statusCode} by :: ${
        req.user?.username || "anonymous"
      } :: ${detailsStr}`;

 
      await saveActivityLog(
        res.statusCode,
        req.method,
        req.originalUrl,
        req.user,
        responseBody
      )

      try {
        await appendToCurrentDateFile(logString);
        console.log(logString);
      } catch (err) {
        console.error("Failed to upload log:", err);
      }
    });
  }
  next();
};

export default logRequests;
