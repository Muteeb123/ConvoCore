import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "pgsql-ast-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateAIQuery = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in environment");

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const schemaPath = path.join(__dirname, "schema.txt");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  const systemInstruction = `
You are an expert SQL generator for a PostgreSQL CRM system.
Given a PostgreSQL schema, business flow information, and user request, produce a single safe SELECT query.

CRITICAL COLUMN NAMING RULES:
- ALL column names in PostgreSQL use SNAKE_CASE (lowercase with underscores)
- NO EXCEPTIONS - every column uses snake_case format
- Foreign key columns: lead_id, customer_id, contact_id, assigned_user_id, created_by_user_id, opportunity_id
- Timestamp columns: created_at, updated_at
- Boolean columns: is_active, is_closed_won, is_closed_lost, is_email_notification
- Company name columns: company_name (for all tables: customers, leads, opportunities)
- Role name column: role_name (for users table)
- When joining tables, use the EXACT column names from the schema - all in snake_case
- Examples: c.company_name, l.company_name, o.company_name, u.role_name

Business Flow:
- A lead is created either from existing customer or some customer details are added while creation
- A lead status is qualified to make it an opportunity (remember no opportunity can be created directly)
- An opportunity status is closed won that makes customer and contact automatically

Rules:
- Output only the SQL query, no markdown, code blocks, or explanation.
- If question is not about analytics or insights, respond exactly: not in scope.
- Only SELECT queries. No INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE/GRANT.
- Use proper JOINs to relate tables based on foreign keys.
- Consider the business flow when writing queries (leads → opportunities → customers).
- The schema is exact and is not to be modified or assumed beyond what is provided.
- Always use table aliases (e.g., l for leads, o for opportunities, c for customers, u for users)
- When referencing columns in JOINs or WHERE clauses, use the format: table_alias.column_name (e.g., o.lead_id, NOT o.leadId)

Database Schema:
${schema}
`;

  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: systemInstruction
  });

  const result = await model.generateContent(`User request: ${prompt}`);

  let query = result.response.text().trim();
  
  // Remove markdown code blocks if present
  query = query.replace(/^```sql\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  if (!query || query.toLowerCase().includes("not in scope")) return "not in scope";

  // Validate AST structure first - this is the most reliable check
  let ast;
  try {
    ast = parse(query);
  } catch (parseError) {
    throw new Error(`SQL parsing error: ${parseError.message || 'Invalid SQL syntax'}`);
  }
  
  // Check that all statements are SELECT statements
  const onlySelect = ast.every((stmt) => stmt.type === "select");
  if (!onlySelect) {
    throw new Error("Only SELECT queries are allowed");
  }

  // More precise check for unsafe SQL keywords as actual SQL statements
  // Use word boundaries to avoid matching column names like "created_at" or "updated_at"
  const unsafePatterns = [
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+\w+\s+SET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bDROP\s+(TABLE|DATABASE|INDEX|VIEW|SCHEMA)\b/i,
    /\bALTER\s+(TABLE|DATABASE|INDEX|VIEW)\b/i,
    /\bTRUNCATE\s+TABLE\b/i,
    /\bCREATE\s+(TABLE|DATABASE|INDEX|VIEW|SCHEMA|USER|ROLE)\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i,
    /\bEXEC\s*\(/i,
    /\bEXECUTE\s*\(/i,
    /\bCALL\s+\w+\s*\(/i,
  ];

  const queryUpper = query.toUpperCase();
  const hasUnsafeStatement = unsafePatterns.some(pattern => pattern.test(query));
  
  if (hasUnsafeStatement) {
    throw new Error("Unsafe SQL statements detected. Only SELECT queries are allowed.");
  }

  // Check for common camelCase column name errors (for snake_case columns that shouldn't be camelCase)
  const camelCasePatterns = [
    /\bleadId\b/i, /\bcustomerId\b/i, /\bcontactId\b/i,
    /\bassignedUserId\b/i, /\bcreatedByUserId\b/i, /\bopportunityId\b/i,
    /\bisClosedWon\b/i, /\bisClosedLost\b/i, /\bisActive\b/i,
    /\bcreatedAt\b/i, /\bupdatedAt\b/i, /\bfirstName\b/i, /\blastName\b/i,
    /\bcompanyId\b/i, /\bteamId\b/i, /\buserId\b/i, /\broleId\b/i
  ];
  
  const foundCamelCase = camelCasePatterns.some(pattern => pattern.test(query));
  if (foundCamelCase) {
    console.warn("[WARNING] Potential camelCase column names detected in query. PostgreSQL uses snake_case.");
    // Don't throw, but log warning - let the database error handle it with better message
  }

  console.log("[AI_ANALYTICS_QUERY]", query);
  return query;
};
