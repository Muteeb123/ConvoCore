import Papa from "papaparse";
import { db } from "../db.js";
import { customers } from "../../shared/schema.js";

export async function insertCustomersFromCSV(fileBuffer) {
    const csvString = fileBuffer.toString();

    // Parse CSV with Papa
    const { data, errors } = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
    });

    if (errors.length > 0) {
        throw new Error(`CSV Parsing error: ${errors[0].message}`);
    }

    console.log("data isn csv is", data)

    // Transform data to match the customers schema
    const records = data.map((row) => ({
        companyName: row.companyName || "",
        email: row.email || null,
        phone: row.phone || null,
        website: row.website || null,
        annualRevenue: row.annual_revenue ? parseInt(row.annual_revenue) : null,
        city: row.city || null,
        country: row.country || null,
        daysToClose: row.days_to_close ? parseInt(row.days_to_close) : null,
        description: row.description || null,
        facebookPage: row.facebook_page || null,
        industry: row.industry || null,
        lifecycleStage: row.lifecycle_stage || null,
        linkedInHandle: row.linkedin_handle || null,
        numOfContacts: row.num_of_contacts ? parseInt(row.num_of_contacts) : null,
        numOfEmployees: row.num_of_employees ? parseInt(row.num_of_employees) : null,
        numOfTimesContacted: row.num_of_times_contacted
            ? parseInt(row.num_of_times_contacted)
            : null,
        originalSource: row.original_source || null,
        parentCompany: row.parent_company || null,
        postalCode: row.postal_code || null,
        state: row.state || null,
        street: row.street || null,
        timeZone: row.time_zone || null,
        twitterHandle: row.twitter_handle || null,
        webTechnologies: row.web_technologies || null,
        yearFounded: row.year_founded ? parseInt(row.year_founded) : null,
        notes: row.notes || null,
    }));

    if (records.length === 0) {
        throw new Error("No data found in CSV");
    }


    // Insert all records
    await db.insert(customers).values(records);
}
