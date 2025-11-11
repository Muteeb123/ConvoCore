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
  contacts,
  users,
  customers,
  type Contact
} from "@shared/schema"; // Assuming your schema is here

// --- 1. Define the Filters Interface ---
// Matches the filters available in the frontend and API
export interface ContactFilters {
  search?: string;
  status?: boolean | null; // true=active, false=inactive, null=all
  assignedUser?: string; // Username
  createdBy?: string; // Username
  jobTitle?: string;
  industry?: string;
  countryRegion?: string;
  timeZone?: string;
  marketingStatus?: string;
  customerId?: number; // Kept from original getContacts filter
  // tags?: string[]; // Add if needed
}

/**
 * Encapsulates database logic for fetching and filtering Contacts.
 */
class ContactsStorage {
  /**
   * [HELPER] Builds dynamic WHERE conditions for contact filtering.
   */
  private buildWhereConditions(filters: ContactFilters) {
    const conditions = [];

    // Search Term
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          // Search first name, last name, email, job title, company name, phone, industry, country
          sql`concat(${contacts.firstName}, ' ', ${contacts.lastName}) ilike ${searchPattern}`,
          ilike(contacts.email, searchPattern),
          ilike(contacts.jobTitle, searchPattern),
          ilike(contacts.companyName, searchPattern), // Assuming denormalized
          ilike(contacts.phone, searchPattern),
          ilike(contacts.industry, searchPattern), // Assuming denormalized
          ilike(contacts.countryRegion, searchPattern) // Assuming denormalized
        )
      );
    }

    // Status Filter (isActive boolean)
    if (filters.status !== null && filters.status !== undefined) {
      conditions.push(eq(contacts.isActive, filters.status));
    }

    // Single-select Filters (handle 'all' case by not adding condition)
    if (filters.assignedUser && filters.assignedUser !== "all") {
      conditions.push(eq(contacts.assignedUserName, filters.assignedUser)); // Filter by username
    }
    if (filters.createdBy && filters.createdBy !== "all") {
      conditions.push(eq(contacts.createdUserName, filters.createdBy)); // Filter by username
    }
     if (filters.jobTitle && filters.jobTitle !== "all") {
       conditions.push(eq(contacts.jobTitle, filters.jobTitle));
     }
     if (filters.industry && filters.industry !== "all") {
       conditions.push(eq(contacts.industry, filters.industry));
     }
     if (filters.countryRegion && filters.countryRegion !== "all") {
       conditions.push(eq(contacts.countryRegion, filters.countryRegion));
     }
     if (filters.timeZone && filters.timeZone !== "all") {
       conditions.push(eq(contacts.timeZone, filters.timeZone));
     }
     if (filters.marketingStatus && filters.marketingStatus !== "all") {
       conditions.push(eq(contacts.marketingContactStatus, filters.marketingStatus));
     }

    // Customer ID (from original getContacts filter)
    if (filters.customerId) {
      conditions.push(eq(contacts.companyId, filters.customerId)); // companyId likely references customers.id
    }

    // Add tags filter if implemented later
    // if (filters.tags && filters.tags.length > 0) {
    //   conditions.push(sql`${contacts.tags} @> ${filters.tags}`); // Assuming tags is text[]
    // }

    return conditions;
  }

  /**
   * [HELPER] Populates related details (user names, company name) for contacts.
   */
  private async populateContactDetails(contactList: Contact[]): Promise<Contact[]> {
    if (contactList.length === 0) return [];

    const userIds = new Set<number>();
    const companyIds = new Set<number>(); // Assuming companyId links to customers table

    contactList.forEach(c => {
      if (c.assignedUserId) userIds.add(c.assignedUserId);
      if (c.createdByUserId) userIds.add(c.createdByUserId);
      if (c.updatedByUserId) userIds.add(c.updatedByUserId); // Include updatedBy if needed
      if (c.companyId) companyIds.add(c.companyId);
    });

    // Fetch related data in parallel
    const [usersList, companiesList] = await Promise.all([
       userIds.size > 0 ? db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, Array.from(userIds))) : Promise.resolve([]),
       companyIds.size > 0 ? db.select({ id: customers.id, companyName: customers.companyName }).from(customers).where(inArray(customers.id, Array.from(companyIds))) : Promise.resolve([]),
    ]);

    // Create maps for quick lookup
    const userMap = new Map(usersList.map(u => [u.id, u.username]));
    const companyMap = new Map(companiesList.map(c => [c.id, c.companyName]));

    // Map through contacts and add the populated data
    return contactList.map(c => ({
      ...c,
      assignedUserName: c.assignedUserId ? userMap.get(c.assignedUserId) || c.assignedUserName || null : null,
      createdUserName: c.createdByUserId ? userMap.get(c.createdByUserId) || c.createdUserName || null : null,
      updatedUserName: c.updatedByUserId ? userMap.get(c.updatedByUserId) || c.updatedUserName || null : null, // Populate if needed
      companyName: c.companyId ? companyMap.get(c.companyId) || c.companyName || null : null, // Populate company name
    }));
  }

  // --- PUBLIC METHODS ---

  /**
   * Fetches paginated/filtered list of all contacts (Admin).
   */
  async getContacts(
    filters: ContactFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Contact[]; totalcount: number }> {
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;
    const whereConditions = this.buildWhereConditions(filters);
    const finalWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(contacts).where(finalWhere);
    const totalcount = Number(totalResult[0]?.count ?? 0);

    let contactList: Contact[] = [];
    if (totalcount > 0 || offsetValue === 0) {
      contactList = await db.select().from(contacts).where(finalWhere).orderBy(desc(contacts.createdAt)).limit(limitValue).offset(offsetValue);
    }

    const populatedContacts = await this.populateContactDetails(contactList);
    return { result: populatedContacts, totalcount };
  }

  /**
   * Fetches paginated/filtered contacts for a specific user (created or assigned).
   */
  async getContactsByUser(
    userId: number,
    filters: ContactFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Contact[]; totalcount: number }> {
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;

    // Base user condition
    const baseUserCondition = or(eq(contacts.createdByUserId, userId), eq(contacts.assignedUserId, userId));
    const filterConditions = this.buildWhereConditions(filters);
    const finalWhere = filterConditions.length > 0 ? and(baseUserCondition, ...filterConditions) : baseUserCondition;

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(contacts).where(finalWhere);
    const totalcount = Number(totalResult[0]?.count ?? 0);

    let contactList: Contact[] = [];
     if (totalcount > 0 || offsetValue === 0) {
       contactList = await db.select().from(contacts).where(finalWhere).orderBy(desc(contacts.createdAt)).limit(limitValue).offset(offsetValue);
     }

    const populatedContacts = await this.populateContactDetails(contactList);
    return { result: populatedContacts, totalcount };
  }

  /**
   * Fetches paginated/filtered contacts for multiple users (Manager/Team Lead).
   */
  async getContactsByUserIds(
    userIds: number[],
    filters: ContactFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Contact[]; totalcount: number }> {
    if (!userIds || userIds.length === 0) {
        console.warn("getContactsByUserIds called with empty userIds array.");
        return { result: [], totalcount: 0 };
    }
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;

    // Base user condition
    const baseUserCondition = or(inArray(contacts.createdByUserId, userIds), inArray(contacts.assignedUserId, userIds));
    const filterConditions = this.buildWhereConditions(filters);
    const finalWhere = filterConditions.length > 0 ? and(baseUserCondition, ...filterConditions) : baseUserCondition;

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(contacts).where(finalWhere);
    const totalcount = Number(totalResult[0]?.count ?? 0);

    let contactList: Contact[] = [];
    if (totalcount > 0 || offsetValue === 0) {
        contactList = await db.select().from(contacts).where(finalWhere).orderBy(desc(contacts.createdAt)).limit(limitValue).offset(offsetValue);
    }

    const populatedContacts = await this.populateContactDetails(contactList);
    return { result: populatedContacts, totalcount };
  }
}

// Export a singleton instance
export const contactsStorage = new ContactsStorage();
