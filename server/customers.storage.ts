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
   * [HELPER] Builds dynamic WHERE conditions for customer filtering.
   */
  private buildWhereConditions(filters: CustomerFilters) {
    const conditions = [];

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
   * [HELPER] Populates assignedUserName and createdByUserName for customers.
   * Assumes these might be denormalized but re-fetches for consistency.
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
    const userMap = new Map(usersList.map(u => [u.id, u.username]));

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

  // --- PUBLIC METHODS ---

  /**
   * Fetches paginated/filtered list of all customers (Admin).
   */
  async getCustomers(
    filters: CustomerFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Customer[]; totalcount: number }> { // Return structure matches frontend expectation
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;
    const whereConditions = this.buildWhereConditions(filters);
    const finalWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // --- Correct Total Count Query ---
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(customers).where(finalWhere);
    const totalcount = Number(totalResult[0]?.count ?? 0); // Safer count access

    // --- Data Query with Pagination ---
    let customersList: Customer[] = [];
    if (totalcount > 0 || offsetValue === 0) { // Avoid query if count is 0 and not first page
        customersList = await db.select().from(customers).where(finalWhere).orderBy(desc(customers.createdAt)).limit(limitValue).offset(offsetValue);
    }


    const populatedCustomers = await this.populateUserNames(customersList);

  
    return { result: populatedCustomers, totalcount }; // Return object
  }

  /**
   * Fetches paginated/filtered customers for a specific user (created or assigned).
   */
  async getCustomersByUser(
    userId: number,
    filters: CustomerFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Customer[]; totalcount: number }> { // Return structure matches frontend expectation
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;

    // Base condition needs to check username for createdBy if using denormalized field
    // Fetch the current user's username first
     const currentUser = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1);
     const currentUsername = currentUser[0]?.username;

     const baseUserConditions = [];
     baseUserConditions.push(eq(customers.assignedUserId, userId)); // Check assigned ID
     if (currentUsername) {
         baseUserConditions.push(eq(customers.createdByUserName, currentUsername)); // Check created Username
     }

    // Ensure there's at least one base condition before creating 'or'
    const baseUserCondition = baseUserConditions.length > 0 ? or(...baseUserConditions) : sql`1 = 0`; // Use false condition if no base match possible
    const filterConditions = this.buildWhereConditions(filters);

    // Combine base user condition with optional filters
    const finalWhere = filterConditions.length > 0 ? and(baseUserCondition, ...filterConditions) : baseUserCondition;


    // --- Correct Total Count Query ---
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(customers).where(finalWhere);
    const totalcount = Number(totalResult[0]?.count ?? 0);

    // --- Data Query with Pagination ---
    let customersList: Customer[] = [];
     if (totalcount > 0 || offsetValue === 0) {
        customersList = await db.select().from(customers).where(finalWhere).orderBy(desc(customers.createdAt)).limit(limitValue).offset(offsetValue);
     }

    const populatedCustomers = await this.populateUserNames(customersList);

    return { result: populatedCustomers, totalcount }; // Return object
  }

  /**
   * Fetches paginated/filtered customers for multiple users (Manager/Team Lead).
   */
  async getCustomersByUserIds(
    userIds: number[],
    filters: CustomerFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Customer[]; totalcount: number }> { // Return structure matches frontend expectation
    if (!userIds || userIds.length === 0) {
       console.warn("getCustomersByUserIds called with empty userIds array.");
       return { result: [], totalcount: 0 };
    }
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;

     // Get usernames for the given user IDs to filter createdByUserName
     const userRecords = await db.select({ username: users.username }).from(users).where(inArray(users.id, userIds));
     const usernames = userRecords.map(u => u.username).filter(Boolean); // Filter out potential nulls/empty strings


    const baseUserConditions = [];
    baseUserConditions.push(inArray(customers.assignedUserId, userIds)); // Check assigned IDs
    if (usernames.length > 0) {
        baseUserConditions.push(inArray(customers.createdByUserName, usernames)); // Check created Usernames
    }

    const baseUserCondition = baseUserConditions.length > 0 ? or(...baseUserConditions) : sql`1 = 0`; // False if no base match possible
    const filterConditions = this.buildWhereConditions(filters);

    // Combine base user condition with optional filters
    const finalWhere = filterConditions.length > 0 ? and(baseUserCondition, ...filterConditions) : baseUserCondition;


    // --- Correct Total Count Query ---
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(customers).where(finalWhere);
    const totalcount = Number(totalResult[0]?.count ?? 0);

    // --- Data Query with Pagination ---
    let customersList: Customer[] = [];
    if (totalcount > 0 || offsetValue === 0) {
        customersList = await db.select().from(customers).where(finalWhere).orderBy(desc(customers.createdAt)).limit(limitValue).offset(offsetValue);
    }

    const populatedCustomers = await this.populateUserNames(customersList);

    return { result: populatedCustomers, totalcount }; // Return object
  }
}

// Export a singleton instance
export const customersStorage = new CustomersStorage();

