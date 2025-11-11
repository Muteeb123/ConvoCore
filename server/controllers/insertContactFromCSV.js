import Papa from "papaparse";
import { db } from "../db.js";
import { contacts, customers } from "../../shared/schema.js";

export async function insertContactsFromCSV(fileBuffer) {
    const csvString = fileBuffer.toString();

    const { data, errors } = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
    });

    if (errors.length > 0) {
        throw new Error(`CSV Parsing error: ${errors[0].message}`);
    }

    console.log("Parsed CSV rows:", data.length);

    const customerRows = await db.select().from(customers);
    const companyMap = new Map();
    for (const customer of customerRows) {
        if (customer.companyName) {
            companyMap.set(customer.companyName.toLowerCase(), customer.id);
        }
    }

    const records = data.map((row, index) => {
        const companyNameRaw = row["Associated Company (Primary)"];
        const companyName = companyNameRaw?.trim().toLowerCase();

        let companyId = null;
        
        // Only try to find company ID if company name is provided
        if (companyName) {
            companyId = companyMap.get(companyName) || null;
        }

        return {
            firstName: row["firstName"] || null,
            lastName: row["lastName"] || null,
            assignedUserId: 1,
            companyWebsite: row["Company Website"] || null,
            contactUnworked: row["Contact unworked"]?.toLowerCase() === "true",
            countryRegion: row["Country/Region"] || null,
            createDate: row["Create Date"] ? new Date(row["Create Date"]) : null,
            createdByUserId: 1,
            email: row["email"] || null,
            employmentRole: row["Employment Role"] || null,
            gender: row["Gender"] || null,
            industry: row["Industry"] || null,
            jobTitle: row["Job Title"] || null,
            lastModifiedDate: row["Last Modified Date"] ? new Date(row["Last Modified Date"]) : null,
            latestTrafficSource: row["Latest Traffic Source"] || null,
            linkedinProfile: row["Linkedin profile"] || null,
            linkedinUrl: row["LinkedIn URL"] || null,
            listName: row["list_name"] || null,
            marketingContactStatus: row["Marketing contact status"] || null,
            numberOfSalesActivities: parseInt(row["Number of Sales Activities"]) || null,
            numberOfTimesContacted: parseInt(row["Number of times contacted"]) || null,
            phone: row["phone"] || null,
            postalCode: row["Postal Code"] || null,
            timeZone: row["Time Zone"] || null,
            updatedByUserId: parseInt(row["Updated by user ID"]) || null,
            websiteUrl: row["Website URL"] || null,
            companyId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    });

    const validRecords = records.filter(r => r.firstName || r.lastName || r.email);

    if (validRecords.length === 0) {
        throw new Error("No valid contact data found in CSV");
    }

    await db.insert(contacts).values(validRecords);
}