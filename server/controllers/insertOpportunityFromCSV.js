import Papa from "papaparse";
import { db } from "../db.js";
import { eq } from "drizzle-orm";
import { opportunities } from "../../shared/schema.js";
import { contacts } from "../../shared/schema.js";

export async function insertOpportunitiesFromCSV(fileBuffer) {
  const csvString = fileBuffer.toString();

  const { data, errors } = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (errors.length > 0) {
    throw new Error(`CSV Parsing error: ${errors[0].message}`);
  }

  const parseDate = (str) => {
    const date = str ? new Date(str) : null;
    return isNaN(date?.getTime()) ? null : date;
  };
  const parseIntOrNull = (val) => (val ? parseInt(val) : null);
  const parseFloatOrNull = (val) => (val ? parseFloat(val) : null);
  const parseBool = (val) => val?.toString().toLowerCase() === "true";

  const records = [];

  for (const row of data) {
    const contactEmail = row["Associated Contact"]?.trim();
    let associatedContactId = null;

    if (contactEmail) {
      const contact = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.email, contactEmail))
        .limit(1);

      if (contact.length > 0) {
        associatedContactId = contact[0].id;
      }
    }

    records.push({
      value: parseIntOrNull(row["value"]),
      actualCloseDate: parseDate(row["actualCloseDate"]),
      createdAt: parseDate(row["Create Date"]),
      createdByUserId: 1,
      description: row["description"] || null,
      name: row["name"] || "Unnamed Opportunity",
      assignedUserId: 1,
      probability: Math.round(parseFloatOrNull(row["probability"]) * 100) || 0,
      stage: row["stage"] || null,
      tags: row["tags"] || null,
      type: row["Type"] || null,
      isClosedLost: parseBool(row["Is closed lost"]),
      isClosedWon: parseBool(row["Is Closed Won"]),
      isDealClosed: parseBool(row["Is Deal Closed?"]),
      lastContacted: parseDate(row["Last Contacted"]),
      latestTrafficSource: row["Latest Traffic Source"] || null,
      nextStep: row["Next step"] || null,
      numberOfAssociatedContacts: parseIntOrNull(row["Number of Associated Contacts"]),
      numberOfSalesActivities: parseIntOrNull(row["Number of Sales Activities"]),
      numberOfTimesContacted: parseIntOrNull(row["Number of times contacted"]),
      ownerAssignedDate: parseDate(row["Owner assigned date"]),
      pipeline: row["Pipeline"] || null,
      priority: row["Priority"] || null,
      updatedAt: new Date(),
      associatedTask: null,
      associatedMeeting: null,
      associatedNote: row["Associated Note"] || null,
      associatedContact: associatedContactId, 
    });
  }

  if (records.length === 0) {
    throw new Error("No valid records found in CSV.");
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(opportunities).values(records);
    });
  } catch (err) {
    throw new Error("Insert failed: " + err.message);
  }
}
