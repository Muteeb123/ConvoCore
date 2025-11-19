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
  ne,
} from "drizzle-orm";
import { db } from "./db"; // Assuming your db export is here
import {
  opportunities,
  users,
  leads,
  customers,
  contacts,
  type Opportunity,
} from "@shared/schema"; // Assuming your schema is here

// --- 1. Define the Filters Interface ---
// Matches the filters available in the frontend and API
export interface OpportunityFilters {
  search?: string;
  stage?: string;
  priority?: string;
  type?: string;
  closeDateRange?: { from?: Date; to?: Date };
  createdDateRange?: { from?: Date; to?: Date };
  valueRange?: { min?: number; max?: number };
  closedStatus?: {
    all: boolean;
    closedWon: boolean;
    closedLost: boolean;
    open: boolean;
  };
  assignedUser?: string; // Username
  createdBy?: string; // Username
  companyName?: string;
  pipeline?: string;
  customerId?: number; // Kept from original functions
}

/**
 * Encapsulates database logic for fetching and filtering Opportunities.
 */
class OpportunitiesStorage {
  /**
   * [HELPER] Builds dynamic WHERE conditions for opportunity filtering.
   */
  private buildWhereConditions(filters: OpportunityFilters) {
    // Log the filters received by this specific helper
    const conditions = [];

    // Search Term
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(opportunities.name, searchPattern),
          ilike(opportunities.description, searchPattern),
          ilike(opportunities.stage, searchPattern),
          // Assuming companyName exists directly on the opportunities table for simpler filtering
          // If not, you'd need a subquery or join here, which complicates things.
          ilike(opportunities.companyName, searchPattern)
        )
      );
    }

    // Single-select Filters
    if (filters.stage && filters.stage !== "all") {
      conditions.push(eq(opportunities.stage, filters.stage));
    }
    if (filters.priority && filters.priority !== "all") {
      conditions.push(eq(opportunities.priority, filters.priority));
    }
    if (filters.type && filters.type !== "all") {
      conditions.push(eq(opportunities.type, filters.type));
    }
    // Filter by USERNAME (assuming these fields exist on the opportunities table)
    if (filters.assignedUser && filters.assignedUser !== "all") {
      conditions.push(eq(opportunities.assignedUserName, filters.assignedUser));
    }
    if (filters.createdBy && filters.createdBy !== "all") {
      conditions.push(eq(opportunities.createdByUserName, filters.createdBy));
    }
     // Filter by Company Name (assuming it exists on the table)
     if (filters.companyName && filters.companyName !== "all") {
       conditions.push(eq(opportunities.companyName, filters.companyName));
     }
     // Filter by Pipeline
     if (filters.pipeline && filters.pipeline !== "all") {
       if (filters.pipeline === 'none') {
         // Handle filtering for NULL pipeline values
         conditions.push(sql`${opportunities.pipeline} IS NULL`);
       } else {
         conditions.push(eq(opportunities.pipeline, filters.pipeline));
       }
     }


    // Value Range
    if (filters.valueRange?.min !== undefined) {
      conditions.push(gte(opportunities.value, filters.valueRange.min));
    }
    if (filters.valueRange?.max !== undefined) {
      conditions.push(lte(opportunities.value, filters.valueRange.max));
    }

    // Close Date Range
    if (filters.closeDateRange?.from) {
      const fromDate = filters.closeDateRange.from instanceof Date
        ? filters.closeDateRange.from.toISOString().slice(0, 10)
        : String(filters.closeDateRange.from);
      conditions.push(gte(opportunities.expectedCloseDate, fromDate));
    }
    if (filters.closeDateRange?.to) {
      const toDate = filters.closeDateRange.to instanceof Date
        ? filters.closeDateRange.to.toISOString().slice(0, 10)
        : String(filters.closeDateRange.to);
      conditions.push(lte(opportunities.expectedCloseDate, toDate));
    }

    // Created Date Range
     if (filters.createdDateRange?.from) {
       conditions.push(gte(opportunities.createdAt, filters.createdDateRange.from));
     }
     if (filters.createdDateRange?.to) {
       conditions.push(lte(opportunities.createdAt, filters.createdDateRange.to));
     }

    // Closed Status
    if (filters.closedStatus && !filters.closedStatus.all) {
      if (filters.closedStatus.open) {
        // Condition for 'open' (neither won nor lost)
        conditions.push(and(eq(opportunities.isClosedWon, false), eq(opportunities.isClosedLost, false)));
      } else if (filters.closedStatus.closedWon) {
        conditions.push(eq(opportunities.isClosedWon, true));
      } else if (filters.closedStatus.closedLost) {
        conditions.push(eq(opportunities.isClosedLost, true));
      }
    }

    // Customer ID
    if (filters.customerId) {
      conditions.push(eq(opportunities.customerId, filters.customerId));
    }

    return conditions;
  }

  /**
   * Populate related details (lead, contact, users, customer) for a batch
   * of opportunities. Performs minimal batch queries for IDs referenced
   * on the opportunities to avoid N+1 queries.
   * @param oppsList - Array of opportunity rows returned by a paginated query
   * @returns Array of opportunity rows augmented with human-readable names
   */
private async populateOpportunityDetails(oppsList: Opportunity[]): Promise<Opportunity[]> {
  if (oppsList.length === 0) return [];

  const leadIds = new Set<number>();
  const contactIds = new Set<number>();
  const createdByIds = new Set<number>();
  const assignedByIds = new Set<number>();
  const customerIds = new Set<number>();

  oppsList.forEach((opp) => {
    if (opp.leadId) leadIds.add(opp.leadId);
    if (opp.associatedContact) contactIds.add(opp.associatedContact);
    if (opp.createdByUserId) createdByIds.add(opp.createdByUserId);
    if (opp.assignedUserId) assignedByIds.add(opp.assignedUserId);
    if (opp.customerId) customerIds.add(opp.customerId);
  });

  const [leadsList, contactsList, createdUsersList, assignedUsersList, customersList] = await Promise.all([
    leadIds.size > 0
      ? db.select({ id: leads.id, name: leads.name }).from(leads).where(inArray(leads.id, Array.from(leadIds)))
      : Promise.resolve([]),

    contactIds.size > 0
      ? db
          .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
          .from(contacts)
          .where(inArray(contacts.id, Array.from(contactIds)))
      : Promise.resolve([]),

    createdByIds.size > 0
      ? db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(inArray(users.id, Array.from(createdByIds)))
      : Promise.resolve([]),

    assignedByIds.size > 0
      ? db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(inArray(users.id, Array.from(assignedByIds)))
      : Promise.resolve([]),

    customerIds.size > 0
      ? db
          .select({ id: customers.id, name: customers.companyName })
          .from(customers)
          .where(inArray(customers.id, Array.from(customerIds)))
      : Promise.resolve([]),
  ]);

  const leadMap = new Map<number, string>(leadsList.map((l: any) => [l.id, l.name]));
  const contactMap = new Map<number, string>(contactsList.map((c: any) => [c.id, `${c.firstName || ""} ${c.lastName || ""}`.trim()]));
  const createdUserMap = new Map<number, string>(createdUsersList.map((u: any) => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim()]));
  const assignedUserMap = new Map<number, string>(assignedUsersList.map((u: any) => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim()]));
  const customerMap = new Map<number, string>(customersList.map((c: any) => [c.id, c.name]));

  return oppsList.map((opp) => ({
    ...opp,
    leadName: opp.leadId ? leadMap.get(opp.leadId) || null : null,
    associatedContactName: opp.associatedContact ? contactMap.get(opp.associatedContact) || null : null,
    createdByUserName: opp.createdByUserId ? createdUserMap.get(opp.createdByUserId) || null : null,
    assignedUserName: opp.assignedUserId ? assignedUserMap.get(opp.assignedUserId) || null : null,
    companyName: opp.customerId ? customerMap.get(opp.customerId) || null : null,
  }));
}

  /**
   * Execute the common count + paginated data query for opportunities.
   * Centralizes pagination logic so public methods stay concise.
   * @param whereExpr - optional WHERE expression
   * @param limitValue - number of records per page
   * @param offsetValue - pagination offset
   */
  private async queryWithPagination(whereExpr: any, limitValue: number, offsetValue: number) {
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(opportunities).where(whereExpr);
    const totalcount = Number(totalResult[0]?.count ?? 0);

    let rows: Opportunity[] = [];
    if (totalcount > 0 || offsetValue === 0) {
      rows = await db.select().from(opportunities).where(whereExpr).orderBy(desc(opportunities.createdAt)).limit(limitValue).offset(offsetValue);
    }

    return { rows, totalcount };
  }

  // --- PUBLIC METHODS ---


  /**
   * Fetches paginated/filtered list of all opportunities (Admin).
   */
  async getOpportunities(
    filters: OpportunityFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<Opportunity[]> {
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;
    const whereConditions = this.buildWhereConditions(filters);
    const finalWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const { rows, totalcount } = await this.queryWithPagination(finalWhere, limitValue, offsetValue);
    if (rows.length === 0) return [];
    const populatedOpps = await this.populateOpportunityDetails(rows);
    return populatedOpps.map((o) => ({ ...o, totalcount }));
  }

  /**
   * Fetches paginated/filtered opportunities for a specific user (created or assigned).
   */
  async getOpportunitiesByUser(
    userId: number,
    filters: OpportunityFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<Opportunity[]> {
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;
    const baseUserCondition = or(eq(opportunities.createdByUserId, userId), eq(opportunities.assignedUserId, userId));
    const filterConditions = this.buildWhereConditions(filters);
    // Combine base user condition with optional filters
    const finalWhere = filterConditions.length > 0 ? and(baseUserCondition, ...filterConditions) : baseUserCondition;

    const { rows, totalcount } = await this.queryWithPagination(finalWhere, limitValue, offsetValue);
    if (rows.length === 0) return [];
    const populatedOpps = await this.populateOpportunityDetails(rows);
    return populatedOpps.map((o) => ({ ...o, totalcount }));
  }

  /**
   * Fetches paginated/filtered opportunities for multiple users (Manager/Team Lead).
   */
  async getOpportunitiesByUserIds(
    userIds: number[],
    filters: OpportunityFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<Opportunity[]> {
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;
    const baseUserCondition = or(inArray(opportunities.createdByUserId, userIds), inArray(opportunities.assignedUserId, userIds));
    const filterConditions = this.buildWhereConditions(filters);
    // Combine base user condition with optional filters
    const finalWhere = filterConditions.length > 0 ? and(baseUserCondition, ...filterConditions) : baseUserCondition;

    const { rows, totalcount } = await this.queryWithPagination(finalWhere, limitValue, offsetValue);
    if (rows.length === 0) return [];
    const populatedOpps = await this.populateOpportunityDetails(rows);
    return populatedOpps.map((o) => ({ ...o, totalcount }));
  }
}

// Export a singleton instance
export const opportunitiesStorage = new OpportunitiesStorage();