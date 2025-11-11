import {
  eq,
  or,
  and,
  desc,
  inArray,
  sql,
  gte,
  lte,
  ilike,
  SQL, // Import SQL type
  isNotNull, // Import if needed for other filters
  isNull,  // Import if needed for other filters
} from "drizzle-orm";
// Use pg-core alias for PostgreSQL specific features if needed later
import { alias } from 'drizzle-orm/pg-core';
import { db } from "./db"; // Assuming your db export is here
import {
    leads,
    users,
    customers, // Import customers if searching companyName
    opportunities, // Import opportunities if searching opportunityName (if applicable to leads)
    type Lead
} from "@shared/schema"; // Assuming your schema is here

// --- Define the Filters Interface ---
export interface LeadFilters {
  search?: string;
  status?: string;
  source?: string;
  tags?: string[];
  valueRange?: (number | undefined)[];
  probabilityRange?: (number | undefined)[];
  dateRange?: (Date | undefined)[];
  assignedUser?: string; // Username
  createdBy?: string; // Username
  customerId?: number;
}

/**
 * Encapsulates all database logic related to fetching and filtering Leads.
 */
class LeadsStorage {

  // --- 👇 Aliases defined within the class for consistent use 👇 ---
  private assignedUserAlias = alias(users, "assignedUser_leads");
  private createdUserAlias = alias(users, "createdUser_leads");

  /**
   * [HELPER] Builds the dynamic WHERE conditions for lead filtering.
   * Returns an SQL object or undefined.
   */
  private buildWhereConditions(filters: LeadFilters, baseConditions?: SQL | SQL[]): SQL | undefined {
  
    const conditions: SQL[] = Array.isArray(baseConditions)
                                ? [...baseConditions]
                                : baseConditions ? [baseConditions] : [];

    // Search Term
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      const searchConditions: SQL[] = [];
      searchConditions.push(ilike(leads.name, searchPattern));
      searchConditions.push(ilike(leads.email, searchPattern));
      searchConditions.push(ilike(leads.companyName, searchPattern));
      searchConditions.push(ilike(leads.pointOfContactFirstName, searchPattern));
      // Add searches on joined tables (ensure joins exist in executeLeadQuery)
      searchConditions.push(ilike(this.assignedUserAlias.username, searchPattern));
      searchConditions.push(ilike(this.createdUserAlias.username, searchPattern));
      // searchConditions.push(ilike(customers.companyName, searchPattern)); // Requires customer join

      if (searchConditions.length > 0) {
          conditions.push(or(...searchConditions));
      }
    }

    // Other Filters
    if (filters.status && filters.status !== "all") {
      conditions.push(eq(leads.status, filters.status));
    }
    if (filters.source && filters.source !== "all") {
      conditions.push(eq(leads.source, filters.source));
    }
     if (filters.tags && filters.tags.length > 0) {
       conditions.push(sql`${leads.tags} @> ${filters.tags}`); // Assumes tags is text[]
     }
    if (filters.valueRange?.[0] !== undefined) {
      conditions.push(gte(leads.value, filters.valueRange[0].toString()));
    }
    if (filters.valueRange?.[1] !== undefined) {
      conditions.push(lte(leads.value, filters.valueRange[1].toString()));
    }
    if (filters.probabilityRange?.[0] !== undefined) {
      conditions.push(gte(leads.probability, filters.probabilityRange[0]));
    }
    if (filters.probabilityRange?.[1] !== undefined) {
      conditions.push(lte(leads.probability, filters.probabilityRange[1]));
    }

    // --- 👇 UPDATED User Filters to use Aliases 👇 ---
    // Filter by ASSIGNED USER's username using the alias
    if (filters.assignedUser && filters.assignedUser !== "all") {
      conditions.push(eq(this.assignedUserAlias.username, filters.assignedUser));
    }
    // Filter by CREATED BY USER's username using the alias
    if (filters.createdBy && filters.createdBy !== "all") {
      conditions.push(eq(this.createdUserAlias.username, filters.createdBy));
    }
    // --- End Update ---

    if (filters.dateRange?.[0]) {
      conditions.push(gte(leads.createdAt, filters.dateRange[0]));
    }
    if (filters.dateRange?.[1]) {
      conditions.push(lte(leads.createdAt, filters.dateRange[1]));
    }
    if (filters.customerId) {
      conditions.push(eq(leads.customerId, filters.customerId));
    }

    // Combine all conditions with AND if there are any
    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Executes the main lead query with filters and pagination.
   */
    private async executeLeadQuery(
        finalWhere: SQL | undefined,
        pagination: { limit: number; offset: number }
    ): Promise<{ results: Lead[]; totalcount: number }> {

        // --- Total Count Query (WITH filters and necessary JOINS) ---
        const totalResult = await db.select({ count: sql<number>`count(*)`.mapWith(Number) })
            .from(leads)
            // --- 👇 ALWAYS include joins needed for filtering or selecting 👇 ---
            .leftJoin(this.assignedUserAlias, eq(leads.assignedUserId, this.assignedUserAlias.id))
            .leftJoin(this.createdUserAlias, eq(leads.createdByUserId, this.createdUserAlias.id))
            // Add customer join if searching customer name: .leftJoin(customers, eq(leads.customerId, customers.id))
            .where(finalWhere); // Apply filters to count

        const totalcount = totalResult[0]?.count ?? 0;

        // --- Data Query (WITH filters, JOINS, and pagination) ---
        let results: Lead[] = [];
        if (totalcount > 0 || pagination.offset === 0) {
            results = await db.select({ // Select needed fields + usernames from aliases
                 ...leads, // Select all columns from leads table
                 assignedUserName: this.assignedUserAlias.username, // Get username via join
                 createdByUserName: this.createdUserAlias.username, // Get username via join
            })
                .from(leads)
                // --- 👇 ALWAYS include joins needed for filtering or selecting 👇 ---
                .leftJoin(this.assignedUserAlias, eq(leads.assignedUserId, this.assignedUserAlias.id))
                .leftJoin(this.createdUserAlias, eq(leads.createdByUserId, this.createdUserAlias.id))
                 // Add customer join if searching customer name: .leftJoin(customers, eq(leads.customerId, customers.id))
                .where(finalWhere) // Apply same filters
                .orderBy(desc(leads.createdAt))
                .limit(pagination.limit)
                .offset(pagination.offset);
        }


        // Attach totalcount to each result row
        const resultsWithCount = results.map(lead => ({
            ...lead,
            // Ensure null safety for potentially missing joined usernames
            assignedUserName: lead.assignedUserName ?? null,
            createdByUserName: lead.createdByUserName ?? null,
            totalcount: totalcount,
        }));

        return { results: resultsWithCount, totalcount };
    }


  // --- PUBLIC METHODS (Remain largely the same, calling executeLeadQuery) ---


async getLeadsForDashboard(userId?: number, limit?: number): Promise<Lead[]> {
  // Build where condition based on whether userId is provided
  const whereCondition = userId 
    ? eq(leads.createdByUserId, userId)
    : undefined;

  // Execute the query
  let query = db
    .select()
    .from(leads);

  // Add where clause only if userId is provided
  if (whereCondition) {
    query = query.where(whereCondition) as any;
  }

  // Add limit if provided
  if (limit) {
    query = query.limit(limit) as any;
  }

  const results = await query;

  return results;
}

  /**
   * Fetches paginated/filtered list of all leads (Admin).
   */
  async getLeads(
    filters: LeadFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<Lead[]> {
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;
    const finalWhere = this.buildWhereConditions(filters);

    const { results } = await this.executeLeadQuery(finalWhere, { limit: limitValue, offset: offsetValue });
    return results;
  }

  /**
   * Fetches paginated/filtered leads for a specific user (created or assigned).
   */
  async getLeadsByUser(
    userId: number,
    filters: LeadFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<Lead[]> {
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;
    const baseCondition = or(
        eq(leads.assignedUserId, userId),
        eq(leads.createdByUserId, userId) // Filter by ID here
    );
    const finalWhere = this.buildWhereConditions(filters, baseCondition);

    const { results } = await this.executeLeadQuery(finalWhere, { limit: limitValue, offset: offsetValue });
    return results;
  }

  /**
   * Fetches paginated/filtered leads for multiple users (Manager/Team Lead).
   */
  async getLeadsByUsers(
    userIds: number[],
    filters: LeadFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<Lead[]> {
    if (!userIds || userIds.length === 0) return [];
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;
    const baseCondition = or(
        inArray(leads.assignedUserId, userIds),
        inArray(leads.createdByUserId, userIds) // Filter by IDs here
    );
    const finalWhere = this.buildWhereConditions(filters, baseCondition);

    const { results } = await this.executeLeadQuery(finalWhere, { limit: limitValue, offset: offsetValue });
    return results;
  }
}

// Export a singleton instance
export const leadsStorage = new LeadsStorage();

