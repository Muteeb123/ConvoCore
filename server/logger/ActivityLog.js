import { db } from "server/db"; // 👈 **Update this path**
import { activityLogs } from "shared/schema"; // 👈 **Update this path**

/**
 * Filters, formats, and saves a user-friendly activity log to the database.
 * @param {number} statusCode - The HTTP status code of the response.
 * @param {string} method - The HTTP method (e.g., 'POST', 'PUT').
 * @param {string} url - The original request URL.
 * @param {object} user - The user object from the request (e.g., req.user).
 * @param {object} responseBody - The JSON body of the response.
 */
export const saveActivityLog = async (
  statusCode,
  method,
  url,
  user,
  responseBody
) => {
  try {
    // 1. Filter out unsuccessful requests or those without a body.
    if (statusCode < 200 || statusCode >= 300 || !responseBody) {
      return;
    } // 2. Map the request method to a user-friendly action.

    const actionMap = { POST: "Created", PUT: "Updated", DELETE: "Deleted" };
    const action = actionMap[method];
    if (!action) {
      return; // Stop if the method is not one we want to log
    } // 3. Format the entity name from the URL.

    const urlPart = url.split("/")[2]?.split("?")[0] || "record";
    const entity = urlPart
      .replace("-with-files", "")
      .replace("-files", " File")
      // ✅ CORRECTED: Handle 'ies' -> 'y' AND 's' -> ''
      .replace(/ies$/, "y") // Turns 'opportunities' -> 'opportunity'
      .replace(/([^s])s$/, "$1") // Turns 'leads' -> 'lead' (but not 'status' -> 'statu')
      .replace(/\b\w/g, (l) => l.toUpperCase()); // 4. Find the name of the item for a clear description.

    let name =
      responseBody.name ||
      responseBody.title ||
      responseBody.companyName ||
      (responseBody.firstName
        ? `${responseBody.firstName} ${responseBody.lastName || ""}`.trim()
        : null); // 5. Build the final 'activity' and 'description' strings.

    const activity = `${entity} ${action}`;
    let description = `A ${entity} was ${action.toLowerCase()}.`;

    if (name) {
      description = `${entity} '${name}' was ${action.toLowerCase()}.`;
    } else if (entity.includes("File") && responseBody.filePath) {
      description = `A file was deleted. Path: ${responseBody.filePath}`;
    } else if (responseBody.id) {
      description = `A ${entity} with ID '${
        responseBody.id
      }' was ${action.toLowerCase()}.`;
    } // 6. Prepare the data object with keys matching your Drizzle schema.

    const logData = {
      performed: user?.username || "System",
      activity: activity,
      description: description, // No timestamp is needed; the database's `defaultNow()` will handle it.
    }; // 7. 💾 SAVE TO DATABASE using Drizzle.

    await db.insert(activityLogs).values(logData);
  } catch (err) {
    console.error("Failed to save activity log to database:", err);
  }
};
