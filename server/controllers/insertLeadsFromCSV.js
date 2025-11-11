import Papa from "papaparse";
import { db } from "../db.js";
import { customers } from "../../shared/schema.js";

export async function insertLeadsFromCSV(fileBuffer) {
    const csvString = fileBuffer.toString();

    const { data, errors } = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
    });

    if (errors.length > 0) {
        throw new Error(`CSV Parsing error: ${errors[0].message}`);
    }

    console.log("data isn csv is", data)

    const records = data.map((row) => ({

    }));

    if (records.length === 0) {
        throw new Error("No data found in CSV");
    }


    await db.insert(leads).values(records);
}
