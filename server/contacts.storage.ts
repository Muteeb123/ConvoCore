import {
  eq,
  or,
  and,
  desc,
  inArray,
  sql,
  ilike,
} from "drizzle-orm";
import { db } from "./db";
import {
  contacts,
  users,
  customers,
  type Contact,
} from "@shared/schema";

/**
 * Filters that can be applied when querying contacts.
 * Fields are optional and correspond to UI filter controls.
 */
export interface ContactFilters {
  search?: string;
  status?: boolean | null;
  assignedUser?: string;
  createdBy?: string;
  jobTitle?: string;
  industry?: string;
  countryRegion?: string;
  timeZone?: string;
  marketingStatus?: string;
  customerId?: number;
}

/**
 * ContactsStorage encapsulates database access for contact records.
 * It provides helpers to build query conditions, enrich contact rows
 * with related data, and public methods to fetch contacts with
 * pagination and filters applied.
 */
class ContactsStorage {
  /**
   * Build an array of WHERE conditions from the provided filters.
   * The returned array can be spread into `and(...)` or used directly
   * when there are no conditions.
   * @param filters - Filtering options from the client
   * @returns Array of expressions usable by drizzle-orm where()
   */
  private buildWhereConditions(filters: ContactFilters) {
    const conditions: any[] = [];

    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          sql`concat(${contacts.firstName}, ' ', ${contacts.lastName}) ilike ${searchPattern}`,
          ilike(contacts.email, searchPattern),
          ilike(contacts.jobTitle, searchPattern),
          ilike(contacts.companyName, searchPattern),
          ilike(contacts.phone, searchPattern),
          ilike(contacts.industry, searchPattern),
          ilike(contacts.countryRegion, searchPattern)
        )
      );
    }

    if (filters.status !== null && filters.status !== undefined) {
      conditions.push(eq(contacts.isActive, filters.status));
    }

    if (filters.assignedUser && filters.assignedUser !== "all") {
      conditions.push(eq(contacts.assignedUserName, filters.assignedUser));
    }
    if (filters.createdBy && filters.createdBy !== "all") {
      conditions.push(eq(contacts.createdUserName, filters.createdBy));
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

    if (filters.customerId) {
      conditions.push(eq(contacts.companyId, filters.customerId));
    }

    return conditions;
  }

  /**
   * Enrich a list of contact rows with related user and company names.
   * This performs minimal queries to fetch usernames and company names
   * for the ids referenced on the contact rows and merges them back in.
   * @param contactList - Array of contact records from the DB
   * @returns The same contact objects augmented with name fields
   */
  private async populateContactDetails(contactList: Contact[]): Promise<Contact[]> {
    if (contactList.length === 0) return [];

    const userIds = new Set<number>();
    const companyIds = new Set<number>();

    contactList.forEach((c) => {
      if (c.assignedUserId) userIds.add(c.assignedUserId);
      if (c.createdByUserId) userIds.add(c.createdByUserId);
      if (c.updatedByUserId) userIds.add(c.updatedByUserId);
      if (c.companyId) companyIds.add(c.companyId);
    });

    const [usersList, companiesList] = await Promise.all([
      userIds.size > 0
        ? db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, Array.from(userIds)))
        : Promise.resolve([]),
      companyIds.size > 0
        ? db.select({ id: customers.id, companyName: customers.companyName }).from(customers).where(inArray(customers.id, Array.from(companyIds)))
        : Promise.resolve([]),
    ]);

    const userMap = new Map(usersList.map((u: any) => [u.id, u.username]));
    const companyMap = new Map(companiesList.map((c: any) => [c.id, c.companyName]));

    return contactList.map((c) => ({
      ...c,
      assignedUserName: c.assignedUserId ? userMap.get(c.assignedUserId) || c.assignedUserName || null : null,
      createdUserName: c.createdByUserId ? userMap.get(c.createdByUserId) || c.createdUserName || null : null,
      updatedUserName: c.updatedByUserId ? userMap.get(c.updatedByUserId) || c.updatedUserName || null : null,
      companyName: c.companyId ? companyMap.get(c.companyId) || c.companyName || null : null,
    }));
  }

  /**
   * Query all contacts with optional filters and pagination.
   * Returns the paginated result and the total count matching the filters.
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
   * Query contacts that are either created by or assigned to a specific user.
   * Applies the same filters and pagination as `getContacts`.
   */
  async getContactsByUser(
    userId: number,
    filters: ContactFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Contact[]; totalcount: number }> {
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;

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
   * Query contacts for multiple users (e.g., team members) by their IDs.
   * Useful for manager/team views where multiple user scopes are combined.
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

export const contactsStorage = new ContactsStorage();
