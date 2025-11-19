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
  isNotNull,
  isNull,
} from "drizzle-orm";
import { db } from "./db"; // Assuming your db export is here
import {
  customers,
  users,
  type Customer
} from "@shared/schema"; // Assuming your schema is here

// --- 1. Define the Filters Interface ---
// Matches the filters available in the frontend and API
export interface CustomerFilters {
  search?: string;
  status?: string;
  industry?: string;
  country?: string;
  timeZone?: string;
  lifecycleStage?: string;
  employeeRange?: [number | undefined, number | undefined]; // Use undefined for optional bounds
  revenueRange?: [number | undefined, number | undefined]; // Use undefined for optional bounds
  assignedUser?: string; // Username
  createdBy?: string; // Username
  hasWebsite?: boolean | null; // null means 'all'
  hasEmail?: boolean | null; // null means 'all'
}

/**
 * Encapsulates database logic for fetching and filtering Customers.
 */
class CustomersStorage {
  /**
   * Build dynamic WHERE conditions from the provided filter object.
   * Returns an array of drizzle-orm expressions that can be combined
   * with `and(...)` or passed directly to `where()` when empty.
   * @param filters - Client-provided filter options
   */
  private buildWhereConditions(filters: CustomerFilters) {
    const conditions: any[] = [];

    // Search Term
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(customers.companyName, searchPattern),
          ilike(customers.email, searchPattern),
          ilike(customers.timeZone, searchPattern),
          ilike(customers.country, searchPattern),
          ilike(customers.industry, searchPattern),
          ilike(customers.contactName, searchPattern), // Assuming contactName exists
          ilike(customers.contactEmail, searchPattern) // Assuming contactEmail exists
        )
      );
    }

    // Single-select Filters
    if (filters.status && filters.status !== "all") {
      conditions.push(eq(customers.status, filters.status));
    }
    if (filters.industry && filters.industry !== "all") {
      conditions.push(eq(customers.industry, filters.industry));
    }
    if (filters.country && filters.country !== "all") {
      conditions.push(eq(customers.country, filters.country));
    }
    if (filters.timeZone && filters.timeZone !== "all") {
      conditions.push(eq(customers.timeZone, filters.timeZone));
    }
    if (filters.lifecycleStage && filters.lifecycleStage !== "all") {
      conditions.push(eq(customers.lifecycleStage, filters.lifecycleStage));
    }
    // Filter by USERNAME (assuming these fields exist on the customers table)
    if (filters.assignedUser && filters.assignedUser !== "all") {
      conditions.push(eq(customers.assignedUserName, filters.assignedUser));
    }
    if (filters.createdBy && filters.createdBy !== "all") {
      conditions.push(eq(customers.createdByUserName, filters.createdBy));
    }

    // Employee Range (Apply only if bounds are different from defaults implicitly handled by 'undefined')
     if (filters.employeeRange?.[0] !== undefined) {
         conditions.push(gte(customers.numOfEmployees, filters.employeeRange[0]));
     }
     if (filters.employeeRange?.[1] !== undefined) {
         conditions.push(lte(customers.numOfEmployees, filters.employeeRange[1]));
     }


    // Revenue Range (Apply only if bounds are different from defaults)
     if (filters.revenueRange?.[0] !== undefined) {
         // Assuming annualRevenue is a numeric or decimal type
         conditions.push(gte(customers.annualRevenue, filters.revenueRange[0]));
     }
     if (filters.revenueRange?.[1] !== undefined) {
         conditions.push(lte(customers.annualRevenue, filters.revenueRange[1]));
     }


    // Has Website / Has Email
    if (filters.hasWebsite === true) {
      conditions.push(isNotNull(customers.website)); // Check if website is not null or empty string
      conditions.push(sql`${customers.website} != ''`);
    } else if (filters.hasWebsite === false) {
      conditions.push(or(isNull(customers.website), eq(customers.website, ''))); // Check if website is null or empty
    }

    if (filters.hasEmail === true) {
      conditions.push(isNotNull(customers.email));
      conditions.push(sql`${customers.email} != ''`);
    } else if (filters.hasEmail === false) {
       conditions.push(or(isNull(customers.email), eq(customers.email, '')));
    }


    return conditions;
  }

  /**
   * Populate denormalized username fields for the customers in `customersList`.
   * Fetches minimal user rows and merges usernames back into the customer objects.
   * @param customersList - Records returned from the customers table
   * @returns The same records augmented with `assignedUserName` and `createdByUserName`
   */
  private async populateUserNames(customersList: Customer[]): Promise<Customer[]> {
    if (customersList.length === 0) return [];

    const userIds = new Set<number>();
    customersList.forEach(c => {
      if (c.assignedUserId) userIds.add(c.assignedUserId);
      // Some Customer shapes may not include createdByUserId (only createdByUserName),
      // so safely read it via a type assertion to avoid TS errors.
      const createdById = (c as any).createdByUserId as number | undefined;
      if (createdById) userIds.add(createdById);
    });

    if (userIds.size === 0) return customersList; // No users to populate

    const usersList = await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, Array.from(userIds)));
    const userMap = new Map(usersList.map((u: any) => [u.id, u.username]));

    return customersList.map(c => {
      const createdById = (c as any).createdByUserId as number | undefined;
      return {
        ...c,
        // Use fetched username, fallback to existing username if any, then null
        assignedUserName: c.assignedUserId ? userMap.get(c.assignedUserId) || c.assignedUserName || null : null,
        createdByUserName: createdById ? userMap.get(createdById) || c.createdByUserName || null : (c.createdByUserName ?? null),
      };
    });
  }
  /**
   * Execute a count + paginated data query for a given WHERE clause.
   * Centralizes the repeated pattern used in the public list methods.
   * @param whereExpr - Optional drizzle-orm expression for WHERE
   * @param limitValue - Max rows to return
   * @param offsetValue - Offset for pagination
   */
  private async queryWithPagination(whereExpr: any, limitValue: number, offsetValue: number) {
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(customers).where(whereExpr);
    const totalcount = Number(totalResult[0]?.count ?? 0);

    let rows: Customer[] = [];
    if (totalcount > 0 || offsetValue === 0) {
      rows = await db.select().from(customers).where(whereExpr).orderBy(desc(customers.createdAt)).limit(limitValue).offset(offsetValue);
    }

    return { rows, totalcount };
  }

  /**
   * Fetch paginated customers applying provided filters.
   * Returns an object with `result` (the rows) and `totalcount`.
   */
  async getCustomers(
    filters: CustomerFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Customer[]; totalcount: number }> {
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;
    const whereConditions = this.buildWhereConditions(filters);
    const finalWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const { rows, totalcount } = await this.queryWithPagination(finalWhere, limitValue, offsetValue);
    const populatedCustomers = await this.populateUserNames(rows);

    return { result: populatedCustomers, totalcount };
  }

  /**
   * Fetch paginated customers for a single user (created or assigned).
   * Uses the user's id and denormalized username where available to build the scope.
   */
  async getCustomersByUser(
    userId: number,
    filters: CustomerFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Customer[]; totalcount: number }> {
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;

    // Get the username for this user if present so we can filter denormalized createdByUserName
    const currentUser = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1);
    const currentUsername = currentUser[0]?.username;

    const baseUserConditions: any[] = [eq(customers.assignedUserId, userId)];
    if (currentUsername) baseUserConditions.push(eq(customers.createdByUserName, currentUsername));

    const baseUserCondition = baseUserConditions.length > 0 ? or(...baseUserConditions) : sql`1 = 0`;
    const filterConditions = this.buildWhereConditions(filters);
    const finalWhere = filterConditions.length > 0 ? and(baseUserCondition, ...filterConditions) : baseUserCondition;

    const { rows, totalcount } = await this.queryWithPagination(finalWhere, limitValue, offsetValue);
    const populatedCustomers = await this.populateUserNames(rows);
    return { result: populatedCustomers, totalcount };
  }

  /**
   * Fetch paginated customers for multiple user ids (team scope).
   * This method resolves usernames for the provided user IDs and uses
   * them to filter denormalized `createdByUserName` when possible.
   */
  async getCustomersByUserIds(
    userIds: number[],
    filters: CustomerFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Customer[]; totalcount: number }> {
    if (!userIds || userIds.length === 0) {
      console.warn("getCustomersByUserIds called with empty userIds array.");
      return { result: [], totalcount: 0 };
    }

    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;

    // Resolve usernames for createdBy filtering only when needed
    const userRecords = await db.select({ username: users.username }).from(users).where(inArray(users.id, userIds));
    const usernames = userRecords.map((u: any) => u.username).filter(Boolean);

    const baseUserConditions: any[] = [inArray(customers.assignedUserId, userIds)];
    if (usernames.length > 0) baseUserConditions.push(inArray(customers.createdByUserName, usernames));

    const baseUserCondition = baseUserConditions.length > 0 ? or(...baseUserConditions) : sql`1 = 0`;
    const filterConditions = this.buildWhereConditions(filters);
    const finalWhere = filterConditions.length > 0 ? and(baseUserCondition, ...filterConditions) : baseUserCondition;

    const { rows, totalcount } = await this.queryWithPagination(finalWhere, limitValue, offsetValue);
    const populatedCustomers = await this.populateUserNames(rows);
    return { result: populatedCustomers, totalcount };
  }
}

export const customersStorage = new CustomersStorage();

