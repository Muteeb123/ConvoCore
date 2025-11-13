import {
  users, roles, customers, leads, opportunities, contacts, tasks,
  emailConfigurations, emails, emailTemplates, activities, meetings, notifications, teams, teamMembers,
  type User, type InsertUser, type Role, type InsertRole, type Customer, type InsertCustomer,
  type Lead, type InsertLead, type Opportunity, type InsertOpportunity, type Contact, type InsertContact,
  type Task, type InsertTask, type EmailConfiguration, type InsertEmailConfiguration,
  type Email, type InsertEmail, type EmailTemplate, type InsertEmailTemplate,
  type Activity, type InsertActivity, type Meeting, type InsertMeeting,
  type Notification, type InsertNotification, type Team, type TeamMember, type InsertTeam, type InsertTeamMember,
  TeamWithMembers,
  UserType,
  InsertMessage,
  messages,
} from "@shared/schema";
import { db } from "./db";
import { lt, eq, desc, and, or, like, gte, lte, isNull, count, ne, sql, inArray, ilike } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { alias } from "drizzle-orm/mysql-core";
import { leadsStorage, type LeadFilters } from './leads.storage';
import { opportunitiesStorage, type OpportunityFilters } from './opportunities.storage'; // Adjust path if needed
import { customersStorage, type CustomerFilters } from './customers.storage';
import { contactsStorage, type ContactFilters } from './contacts.storage';
import { tasksStorage, type TaskFilters } from './tasks.storage';

const PostgresSessionStore = connectPg(session);
export interface LeadsToOpportunity {
  totalLeads: number;
  qualifiedLeads: number;
  qualifiedPercentage: number;
  period: string;
}
export interface OpportunityToCustomer {
  totalOpportunities: number;
  closedWonOpportunities: number;
  closedWonPercentage: number;
  period: string;
}
export interface LeadToCustomerConversionStats {
  totalLeads: number;
  qualifiedClosedWonLeads: number;
  conversionPercentage: number;
  period: string;
}
export interface UserAnalytics {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  userType: "associate" | "manager" | "team-lead" | "admin";
  totalLeadsCreated: number;
  totalLeadsAssigned: number;
  totalTasksAssigned: number;
  opportunitiesCreated: number;
  opportunitiesAssigned: number;
  customerAssigned: number;
  tasksAssigned: number;
  tasksCreated: number;
}

export interface IStorage {
  sessionStore: InstanceType<typeof PostgresSessionStore>;

  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getUsers(): Promise<User[]>;

  getRole(id: number): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: number): Promise<void>;
  getRoles(): Promise<Role[]>;

  getCustomer(id: number): Promise<Customer | undefined>;
  // TODO: createCustomer implementation notes:
  // - Accept an `InsertCustomer` (or DTO) validated by a shared schema
  // - Persist the record in the `customers` table and return the created Customer
  // - Ensure related denormalized fields (assignedUserName, createdByUserName) are set
  // - Return proper errors for duplicate or invalid input
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;

  getCustomers(
    filters?: CustomerFilters, // Use correct filter type
    pagination?: { limit?: number; offset?: number }
  ): Promise<{ result: Customer[]; totalcount: number }>; // Match return type

  getCustomersByUser(
    userId: number,
    filters?: CustomerFilters, // Use correct filter type
    pagination?: { limit?: number; offset?: number }
  ): Promise<{ result: Customer[]; totalcount: number }>; // Match return type

  getCustomersByUserIds(
    userIds: number[],
    filters?: CustomerFilters, // Use correct filter type
    pagination?: { limit?: number; offset?: number }
  ): Promise<{ result: Customer[]; totalcount: number }>;


  // Lead management
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead>;
  deleteLead(id: number): Promise<void>;

  getLeads(
    filters?: LeadFilters,
    pagination?: { limit?: number; offset?: number }
  ): Promise<Lead[]>;

  getLeadsByUser(
    userId: number,
    filters?: LeadFilters,
    pagination?: { limit?: number; offset?: number }
  ): Promise<Lead[]>;

  getLeadsForDashboard(
    userId?: number,
    limit?: number
  ): Promise<Lead[]>;

  getLeadsByUsers(
    userIds: number[],
    filters?: LeadFilters,
    pagination?: { limit?: number; offset?: number }
  ): Promise<Lead[]>;


  // Opportunity management
  getOpportunity(id: number): Promise<Opportunity | undefined>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  updateOpportunity(id: number, opportunity: Partial<InsertOpportunity>): Promise<Opportunity>;
  deleteOpportunity(id: number): Promise<void>;

  // --- 👇 UPDATE THESE THREE METHOD SIGNATURES 👇 ---
  getOpportunities(
    filters?: OpportunityFilters, // Use correct filter type
    pagination?: { limit?: number; offset?: number }
  ): Promise<Opportunity[]>;

  getOpportunitiesByUser(
    userId: number,
    filters?: OpportunityFilters, // Use correct filter type
    pagination?: { limit?: number; offset?: number }
  ): Promise<Opportunity[]>;

  getOpportunitiesByUserIds(
    userIds: number[],
    filters?: OpportunityFilters, // Use correct filter type
    pagination?: { limit?: number; offset?: number }
  ): Promise<Opportunity[]>;
  // --- END OF UPDATED SECTION ---

  // Contact management
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;

  getContacts(
    filters?: ContactFilters, // Use correct filter type
    pagination?: { limit?: number; offset?: number }
  ): Promise<{ result: Contact[]; totalcount: number }>; // Match return type

  getContactsByUser(
    userId: number,
    filters?: ContactFilters, // Use correct filter type
    pagination?: { limit?: number; offset?: number }
  ): Promise<{ result: Contact[]; totalcount: number }>; // Match return type

  getContactsByUserIds(
    userIds: number[],
    filters?: ContactFilters, // Use correct filter type
    pagination?: { limit?: number; offset?: number }
  ): Promise<{ result: Contact[]; totalcount: number }>; // Match return type
  // --- END OF UPDATED SECTION ---
  // Task management
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  getTasks(filters?: { assignedUserId?: number; status?: string; dueDate?: Date }): Promise<Task[]>;


  getTasks(
    filters?: TaskFilters, // Use correct filter type
    pagination?: { limit?: number; offset?: number }
  ): Promise<any[]>; // Keep generic return type or define specific one

  getTasksByUser(
    userId: number,
    filters?: TaskFilters, // Use correct filter type
    pagination?: { limit?: number; offset?: number }
  ): Promise<any[]>; // Keep generic return type

  getTasksByUserIds(
    userIds: number[],
    filters?: TaskFilters, // Use correct filter type
    pagination?: { limit?: number; offset?: number }
  ): Promise<any[]>;


  // Email configuration
  getEmailConfiguration(id: number): Promise<EmailConfiguration | undefined>;
  getEmailConfigurationByUserId(userId: number): Promise<EmailConfiguration | undefined>;
  createEmailConfiguration(config: InsertEmailConfiguration): Promise<EmailConfiguration>;
  updateEmailConfiguration(id: number, config: Partial<InsertEmailConfiguration>): Promise<EmailConfiguration>;
  deleteEmailConfiguration(id: number): Promise<void>;

  // Email management
  getEmail(id: number): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: number, email: Partial<InsertEmail>): Promise<Email>;
  deleteEmail(id: number): Promise<void>;
  getEmails(filters?: { userId?: number; status?: string; leadId?: number; customerId?: number }): Promise<Email[]>;

  // Email template management
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate>;
  deleteEmailTemplate(id: number): Promise<void>;
  getEmailTemplates(userId?: number): Promise<EmailTemplate[]>;

  // Activity tracking
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivities(filters?: { userId?: number; entityType?: string; entityId?: number }): Promise<Activity[]>;

  // Meeting management
  getMeeting(id: number): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting>;
  deleteMeeting(id: number): Promise<void>;
  getMeetings(filters?: { organizedByUserId?: number; startTime?: Date; endTime?: Date }): Promise<Meeting[]>;

  // Notification management
  getNotification(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, notification: Partial<InsertNotification>): Promise<Notification>;
  deleteNotification(id: number): Promise<void>;
  getNotifications(userId: number, isRead?: boolean): Promise<Notification[]>;

  // Analytics
  getDashboardStats(userId?: number): Promise<{
    totalLeads: number;
    totalCustomers: number;
    totalOpportunities: number;
    totalRevenue: number;
    conversionRate: number;
    tasksCompleted: number;
    leadChange: number;          // Percentage change in leads
    customerChange: number;      // Percentage change in customers
    opportunityChange: number;   // Percentage change in opportunities
    revenueChange: number;       // Percentage change in revenue
    taskChange: number;          // Percentage change in tasks completed
  }>;


  getSalesPipeline(): Promise<{
    stage: string;
    count: number;
    value: number;
  }[]>;

  getLeadsToOpportunityStats(
    startDate: Date,
    endDate: Date,
    teamId?: number
  ): Promise<LeadsToOpportunity>;

  getOpportunityToCustomer(
    startDate: Date,
    endDate: Date,
    teamId?: number
  ): Promise<OpportunityToCustomer>;
  getLeadToCustomerConversion(
    startDate: Date,
    endDate: Date,
    teamId?: number
  ): Promise<LeadToCustomerConversionStats>;
  getUsersAnalytics(
    pagination?: { limit?: number; offset?: number }
  ): Promise<{ users: UserAnalytics[]; totalCount: number }>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: InstanceType<typeof PostgresSessionStore>;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }


  async updateUser(id: number, user: Partial<Omit<InsertUser, "userType"> & { userType?: UserType | null }>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...user,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  }


  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsers(): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: users.roleId,
        rolename: roles.name,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        userType: users.userType,
        isEmailNotification: users.isEmailNotification,
        avatar: users.avatar
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .orderBy(desc(users.createdAt));

    return result as User[];
  }

  async getAdminUsers(): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: users.roleId,
        rolename: roles.name,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        isEmailNotification: users.isEmailNotification,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(roles.name, "admin"))
      .orderBy(desc(users.createdAt));

    return result as User[];
  }


  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    return role;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }

  async updateRole(id: number, role: Partial<InsertRole>): Promise<Role> {
    const [updatedRole] = await db.update(roles).set(role).where(eq(roles.id, id)).returning();
    return updatedRole;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(desc(roles.createdAt));
  }


  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerbyName(name: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.companyName, name));
    return customer;
  }
  async getCustomerbyPhone(phone: any): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.phone, phone));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db.update(customers).set({
      ...customer,
      updatedAt: new Date()
    }).where(eq(customers.id, id)).returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }


  // async getCustomers(filters?: { assignedUserId?: number; status?: string }, pagination?: { limit?: number; offset?: number }): Promise<Customer[]> {
  //   let query = db.select().from(customers);

  //   //pagination
  //   // pagination?: { limit?: number; offset?: number }

  //   const limitValue = pagination?.limit ?? 25; // default: 10 results per page
  //   const offsetValue = pagination?.offset ?? 0; // default: start at 0

  //   //  const totalresult = await query
  //   // .orderBy(desc(opportunities.createdAt))

  //   // const totalcount = totalresult.length;

  //   //   const results = await query
  //   // .orderBy(desc(opportunities.createdAt))
  //   // .limit(limitValue)
  //   // .offset(offsetValue);

  //   // totalcount:totalcount

  //   if (filters?.assignedUserId) {
  //     query = query.where(eq(customers.assignedUserId, filters.assignedUserId));
  //   }

  //   if (filters?.status) {
  //     query = query.where(eq(customers.status, filters.status));
  //   }

  //   //bad me chnage kar lena

  //   // const totalresult = await query.orderBy(desc(customers.createdAt));

  //   // const totalcount = totalresult.length;

  //   const totalresult = await db
  //     .select({ count: sql<number>`count(*)` })
  //     .from(customers)

  //   console.log("totalcResult in GetCustomers : ", totalresult)



  //   const totalcount = Number(totalresult[0].count);

  //   console.log("totalcount", totalcount)

  //   const result = await query.orderBy(desc(customers.createdAt)).limit(limitValue).offset(offsetValue)

  //   return { result, totalcount };
  // }
  async getCustomerAssociations(customerId: number): Promise<{
    customer: Customer;
    leads: Lead[];
    contacts: Contact[];
    opportunities: Opportunity[];
    tasks: Task[];
  }> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));

    const [
      customerLeads,
      customerContacts,
      customerOpportunities,
      customerTasks,
    ]: [Lead[], Contact[], Opportunity[], Task[]] = await Promise.all([
      db.select().from(leads).where(eq(leads.customerId, customerId)),
      db.select().from(contacts).where(eq(contacts.companyId, customerId)),
      db.select().from(opportunities).where(eq(opportunities.customerId, customerId)),
      db.select().from(tasks).where(eq(tasks.customerId, customerId)),
    ]);

    return {
      customer,
      leads: (customerLeads && customerLeads.length > 0) ? customerLeads : [],
      contacts: (customerContacts && customerContacts.length > 0) ? customerContacts : [],
      opportunities: (customerOpportunities && customerOpportunities.length > 0) ? customerOpportunities : [],
      tasks: (customerTasks && customerTasks.length > 0) ? customerTasks : []
    };
  }


  async getCustomersByUserss(

  ) {


    // // 2. Build the dynamic where clause (your existing logic is good)
    const conditions: any = [];

    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(or(...conditions));

    const totalcount = Number(totalCountResult[0].count);


    // 4. Get the PAGINATED list of customers
    const result = await db
      .select()
      .from(customers)
      .where(or(...conditions))
      .orderBy(desc(customers.createdAt)) // Added for consistent ordering


    return { customers: result, total: totalcount };
  }

  async getCustomers(
    filters: CustomerFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Customer[]; totalcount: number }> {
    return customersStorage.getCustomers(filters, pagination);
  }

  async getCustomersByUser(
    userId: number,
    filters: CustomerFilters = {}, // Use CustomerFilters here
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Customer[]; totalcount: number }> {
    return customersStorage.getCustomersByUser(userId, filters, pagination);
  }

  async getCustomersByUserIds(
    userIds: number[],
    filters: CustomerFilters = {}, // Use CustomerFilters here
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Customer[]; totalcount: number }> {
    // Pass filters correctly
    return customersStorage.getCustomersByUserIds(userIds, filters, pagination);
  }

  async emailPhoneUniqueLead(companyId: number, email?: string, phone?: string) {
    const promises = [];

    if (email) {
      promises.push(db.select().from(contacts).where(and(ilike(contacts.email, email), eq(contacts.companyId, companyId))));
    } else {
      promises.push([]);
    }

    if (phone) {
      promises.push(db.select().from(contacts).where(and(ilike(contacts.phone, phone), eq(contacts.companyId, companyId))));
    } else {
      promises.push([]);
    }

    const [existingEmail, existingPhone] = await Promise.all(promises);

    return {
      email: existingEmail.length > 0,
      phone: existingPhone.length > 0,
    };
  }
  async emailPhoneUnique(
  email?: string,
  phone?: string,
  excludeId?: number // <-- 1. Accept the ID
) {
  const promises = [];

  // --- Check Email ---
  if (email) {
    // 2. Build conditions for email
    const emailConditions = [ilike(contacts.email, email)];
    if (excludeId) {
      emailConditions.push(ne(contacts.id, excludeId)); // <-- Skip this ID
    }
    promises.push(
      db.select().from(contacts).where(and(...emailConditions)) // Use 'and'
    );
  } else {
    promises.push(Promise.resolve([])); // Use Promise.resolve for consistency
  }

  // --- Check Phone ---
  if (phone) {
    // 3. Build conditions for phone
    const phoneConditions = [ilike(contacts.phone, phone)];
    if (excludeId) {
      phoneConditions.push(ne(contacts.id, excludeId)); // <-- Skip this ID
    }
    promises.push(
      db.select().from(contacts).where(and(...phoneConditions)) // Use 'and'
    );
  } else {
    promises.push(Promise.resolve([]));
  }

  // --- No change needed below ---
  const [existingEmail, existingPhone] = await Promise.all(promises);

  return {
    email: existingEmail.length > 0,
    phone: existingPhone.length > 0,
  };
}

  async opportunityNameUniqueness(opportunityName: string) {
    // Run all checks in parallel for better performance
    const [existingCustomer, existingContact, existingOpportunity] = await Promise.all([
      db.select().from(customers).where(ilike(customers.companyName, opportunityName)),
      db.select().from(contacts).where(ilike(contacts.companyName, opportunityName)),
      db.select().from(opportunities).where(ilike(opportunities.name, opportunityName)),
    ]);

    return {
      customer: existingCustomer.length > 0,
      contact: existingContact.length > 0,
      opportunity: existingOpportunity.length > 0
    };
  }
  async uniqueCompanyName(name: string) {
    const exists = await db.select().from(customers).where(ilike(customers.companyName, name));
    return exists.length > 0;
  }

  async uniqueLeadName(name: string, id?: number) {
    let condition;

    if (id) {
      condition = and(ilike(leads.name, name), ne(leads.id, id));
    } else {
      condition = ilike(leads.name, name);
    }

    const exists = await db.select().from(leads).where(condition);
    return exists.length > 0;
  }



  async getRoleBasedTaskData(userId: number, userRole: string, userName: string) {
    let allLeads: Lead[] = [];
    let allCustomers: Customer[] = [];
    let allOpportunities: Opportunity[] = [];

    // ADMIN — can see everything
    if (userRole === "admin") {
      allLeads = await db.select().from(leads);
      allCustomers = await db.select().from(customers);
      allOpportunities = await db.select().from(opportunities);
    }

    // ASSOCIATE — only own data
    else if (userRole === "associate") {
      allLeads = await db
        .select()
        .from(leads)
        .where(
          or(
            eq(leads.createdByUserId, userId),
            eq(leads.assignedUserId, userId),
          )
        );

      allCustomers = await db
        .select()
        .from(customers)
        .where(or(
          eq(customers.createdByUserName, userName),
          eq(customers.assignedUserId, userId)
        ));

      allOpportunities = await db
        .select()
        .from(opportunities)
        .where(or(
          eq(opportunities.createdByUserId, userId),
          eq(opportunities.assignedUserId, userId),
        ));
    }

    // MANAGER — their own + all team-leads + associates in same teams
    else if (userRole === "manager") {
      const teamResults = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));

      if (teamResults.length === 0) {
        allLeads = await db.select().from(leads).where(
          or(
            eq(leads.createdByUserId, userId),
            eq(leads.assignedUserId, userId),
          )
        );
        allCustomers = await db.select().from(customers).where(
          or(
            eq(customers.createdByUserName, userName),
            eq(customers.assignedUserId, userId)

          )
        );
        allOpportunities = await db.select().from(opportunities).where(
          or(
            eq(opportunities.createdByUserId, userId),
            eq(opportunities.assignedUserId, userId)
          )
        );
        return { allLeads, allCustomers, allOpportunities };
      }

      const teamIds = teamResults.map(t => t.teamId);

      const memberResults = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(inArray(teamMembers.teamId, teamIds));

      const memberIds = memberResults.map(m => m.userId);

      const allowedUsers = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(
          and(
            inArray(users.id, memberIds),
            inArray(users.userType, ["associate", "team-lead"])
          )
        );

      const allowedUserIds = [userId, ...allowedUsers.map(u => u.id)];
      const allowedUsernames = [userName, ...allowedUsers.map(u => u.username)];

      allLeads = await db.select().from(leads).where(
        or(
          inArray(leads.createdByUserId, allowedUserIds),
          inArray(leads.assignedUserId, allowedUserIds)
        )
      );
      allCustomers = await db.select().from(customers).where(
        or(
          inArray(customers.createdByUserName, allowedUsernames),
          inArray(customers.assignedUserName, allowedUsernames),

        )
      );
      allOpportunities = await db.select().from(opportunities).where(
        or(
          inArray(opportunities.createdByUserId, allowedUserIds),
          inArray(opportunities.assignedUserId, allowedUserIds)
        )

      )
    }

    // TEAM-LEAD — their own + associates in same teams
    else if (userRole === "team-lead") {
      const teamResults = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));

      if (teamResults.length === 0) {
        allLeads = await db.select().from(leads).where(
          or(
            eq(leads.createdByUserId, userId),
            eq(leads.assignedUserId, userId),

          )
        );
        allCustomers = await db.select().from(customers).where(
          or(
            eq(customers.createdByUserName, userName),
            eq(customers.assignedUserName, userName)

          )
        );
        allOpportunities = await db.select().from(opportunities).where(
          or(
            eq(opportunities.createdByUserId, userId),
            eq(opportunities.assignedUserId, userId)

          )
        );
        return { allLeads, allCustomers, allOpportunities };
      }

      const teamIds = teamResults.map(t => t.teamId);

      const memberResults = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(inArray(teamMembers.teamId, teamIds));

      const memberIds = memberResults.map(m => m.userId);

      const associateUsers = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(
          and(
            inArray(users.id, memberIds),
            eq(users.userType, "associate")
          )
        );

      const associateIds = associateUsers.map(u => u.id);
      const associateUsernames = associateUsers.map(u => u.username);

      const allowedUserIds = [userId, ...associateIds];
      const allowedUsernames = [userName, ...associateUsernames];

      allLeads = await db.select().from(leads).where(
        or(
          inArray(leads.createdByUserId, allowedUserIds),
          inArray(leads.assignedUserId, allowedUserIds),
        )
      );
      allCustomers = await db.select().from(customers).where(
        or(
          inArray(customers.createdByUserName, allowedUsernames),
          inArray(customers.assignedUserName, allowedUsernames)

        )
      );
      allOpportunities = await db.select().from(opportunities).where(
        or(
          inArray(opportunities.createdByUserId, allowedUserIds),
          inArray(opportunities.assignedUserId, allowedUserIds),

        )
      );
    }
    // Helper to remove duplicates by id
    const uniqueById = <T extends { id: number }>(arr: T[]): T[] => {
      const map = new Map<number, T>();
      arr.forEach(item => map.set(item.id, item));
      return Array.from(map.values());
    };
    // Make all results unique
    allLeads = uniqueById(allLeads);
    allCustomers = uniqueById(allCustomers);
    allOpportunities = uniqueById(allOpportunities);


    return { allLeads, allCustomers, allOpportunities };
  }



  async checkCustomerUniqueness({
  companyName,
  email,
  phone,
  excludeId, // <-- 1. Accept the ID here
}: {
  companyName?: string;
  email?: string;
  phone?: string;
  excludeId?: number; // <-- Make it optional
}): Promise<{ companyName: boolean; email: boolean; phone: boolean }> {
  const exists = { companyName: false, email: false, phone: false };

  // --- Build OR conditions dynamically ---
  const orConditions: any[] = [];

  if (companyName) {
    orConditions.push(ilike(customers.companyName, companyName));
  }
  if (email) {
    orConditions.push(ilike(customers.email, email));
  }
  if (phone) {
    orConditions.push(eq(customers.phone, phone));
  }

  if (orConditions.length === 0) return exists;

  // --- Build the main query conditions ---
  const mainConditions = [
    or(...orConditions), // Must match one of the fields
  ];

  // --- 2. Add the "NOT EQUAL" condition if excludeId exists ---
  if (excludeId) {
    mainConditions.push(ne(customers.id, excludeId)); // <-- This skips the row
  }

  // --- 3. Query using 'and' to combine the conditions ---
  const results = await db
    .select({
      id: customers.id,
      companyName: customers.companyName,
      email: customers.email,
      phone: customers.phone,
    })
    .from(customers)
    .where(and(...mainConditions)); // <-- Use 'and' here

  // --- Determine which fields already exist ---
  for (const row of results) {
    if (
      companyName &&
      row.companyName?.toLowerCase() === companyName.toLowerCase()
    )
      exists.companyName = true;

      if (email && row.email?.toLowerCase() === email.toLowerCase())
        exists.email = true;

      if (phone && row.phone === phone)
        exists.phone = true;
    }

  return exists;
}

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    if (!lead) return undefined;
    let assignedUserName: string | null = null;
    if (lead.assignedUserId) {
      const [assignedUser] = await db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, lead.assignedUserId));

      if (assignedUser) {
        assignedUserName = `${assignedUser.username}`;
      }
    }
    let createdByUserName: string | null = null;
    if (lead.createdByUserId) {
      const [createdByUser] = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, lead.createdByUserId));

      if (createdByUser) {
        createdByUserName = `${createdByUser.firstName} ${createdByUser.lastName}`;
      }
    }
    return {
      ...lead,
      assignedUserName,
      createdByUserName,
    };
  }

  async getLeadsByUser(
    userId: number,
    filters: LeadFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<Lead[]> {
    return leadsStorage.getLeadsByUser(userId, filters, pagination);
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead> {
    const [updatedLead] = await db.update(leads).set({
      ...lead,
      updatedAt: new Date()
    }).where(eq(leads.id, id)).returning();
    return updatedLead;
  }

  async deleteLead(id: number): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  // Admin functions for newDashboardStats
  async getnewDashboardStats() {
    const now = new Date();

    // Calendar month boundaries
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // --- Helper function to compute percentage and trend ---
    const computeChange = (current: number, previous: number) => {
      if (previous === 0) {
        return { change: "100%", trend: "Higher than last month" };
      }
      const percent = ((current - previous) / previous) * 100;
      const formatted = `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
      const trend = percent >= 0 ? "Higher than last month" : "Lower than last month";
      return { change: formatted, trend };
    };

    // --- Helper: fetch counts for current month (1st -> now) and previous month (full previous month) ---
    const getCount = async (table: any, whereClause?: any) => {
      const [current] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            whereClause ?? sql`1=1`,
            gte(sql`${table.createdAt}`, startOfCurrentMonth),
            lte(sql`${table.createdAt}`, now) // up to now in current month
          )
        );

      const [previous] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            whereClause ?? sql`1=1`,
            gte(sql`${table.createdAt}`, startOfPreviousMonth),
            lt(sql`${table.createdAt}`, startOfCurrentMonth) // full previous month
          )
        );

      return {
        current: Number(current.count),
        previous: Number(previous.count),
      };
    };

    // --- Compute all four metrics ---
    const leadsData = await getCount(leads);
    const opportunitiesData = await getCount(opportunities); // adjust if opportunities live in another table or need a whereClause
    const customersData = await getCount(customers);
    const convertedData = await getCount(opportunities, sql`stage = 'closed won'`);


    // --- Total counts (regardless of date) ---
    const totalLeadsResult = await db.select({ count: sql<number>`count(*)` }).from(leads);
    const totalOpportunitiesResult = await db.select({ count: sql<number>`count(*)` }).from(opportunities);
    const totalCustomersResult = await db.select({ count: sql<number>`count(*)` }).from(customers);
    const convertedClientsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities)
      .where(sql`stage = 'closed won'`);

    const totalLeads = Number(totalLeadsResult[0].count);
    const totalOpportunities = Number(totalOpportunitiesResult[0].count);
    const totalCustomers = Number(totalCustomersResult[0].count);
    const convertedClients = Number(convertedClientsResult[0].count);

    // --- Calculate percentage/trend dynamically ---
    const leadsChange = computeChange(leadsData.current, leadsData.previous);
    const opportunitiesChange = computeChange(opportunitiesData.current, opportunitiesData.previous);
    const customersChange = computeChange(customersData.current, customersData.previous);
    const convertedChange = computeChange(convertedData.current, convertedData.previous);

    // --- If no previous month data, fallback to 100% ---
    const fallback = { change: "100%", trend: "Higher than last month" };
    const stats = {
      totaleads: {
        value: totalLeads,
        ...(leadsData.previous === 0 ? fallback : leadsChange),
      },
      totalOpportunities: {
        value: totalOpportunities,
        ...(opportunitiesData.previous === 0 ? fallback : opportunitiesChange),
      },
      totalCustomers: {
        value: totalCustomers,
        ...(customersData.previous === 0 ? fallback : customersChange),
      },
      convertedClients: {
        value: convertedClients,
        ...(convertedData.previous === 0 ? fallback : convertedChange),
      },
    };

    return stats;
  }

  async getLeadQualityAndSourceStatsAdmin() {
    // --- Total counts ---
    const totalLeadsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads);
    const totalLeadsResult1 = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads);
    const totalLeads = Number(totalLeadsResult1[0].count);

    // total opportunities (from opportunities table)
    const totalOpportunitiesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities);
    const totalOpportunities = Number(totalOpportunitiesResult[0].count);

    // total customers (not used for these particular ratios but kept if needed)
    const totalCustomersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers);
    const totalCustomers = Number(totalCustomersResult[0].count);

    // counts for qualified/unqualified based on lead.status
    const qualifiedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(sql`status = 'qualified'`);
    const qualifiedCount = Number(qualifiedResult[0].count);

    const unqualifiedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(sql`status = 'new'`);
    const unqualifiedCount = Number(unqualifiedResult[0].count);

    // clients (opportunities that are closed won)
    const closedWonResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities)
      .where(sql`is_closed_won = true`);
    const closedWonCount = Number(closedWonResult[0].count);

    // --- Lead Sources counts ---
    const sourceCounts = async (source: string) => {
      const r = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(sql`source = ${source}`);
      return Number(r[0].count);
    };

    const websiteLeads = await sourceCounts("website");
    const referralLeads = await sourceCounts("referral");
    const socialLeads = await sourceCounts("social_media");
    const coldCallLeads = await sourceCounts("cold_call");

    // --- helpers ---
    const safePercent = (part: number, total: number) =>
      total > 0 ? ((part / total) * 100).toFixed(2) + "%" : "0.00%";

    // compute percentages according to your updated rules:
    const qualifiedLeadsPct = safePercent(qualifiedCount, totalLeads);
    const unqualifiedLeadsPct = safePercent(unqualifiedCount, totalLeads);
    // clients ratio = closedWonCount / totalOpportunities
    const clientsPct = safePercent(closedWonCount, totalOpportunities);

    const websitePct = safePercent(websiteLeads, totalLeads);
    const referralPct = safePercent(referralLeads, totalLeads);
    const socialPct = safePercent(socialLeads, totalLeads);
    const coldCallPct = safePercent(coldCallLeads, totalLeads);

    return {
      qualifiedLeads: {
        count: qualifiedCount,
        percentage: qualifiedLeadsPct,
        description: "Leads whose status = 'qualified' (vs total leads)",
      },
      unqualifiedLeads: {
        count: unqualifiedCount,
        percentage: unqualifiedLeadsPct,
        description: "Leads whose status = 'new' (vs total leads)",
      },
      clients: {
        count: closedWonCount,
        percentage: clientsPct,
        description: "Opportunities where is_closed_won = true (vs total opportunities)",
      },
      websiteInquiries: {
        count: websiteLeads,
        percentage: websitePct,
        description: "Leads with source = 'Website' (vs total leads)",
      },
      referrals: {
        count: referralLeads,
        percentage: referralPct,
        description: "Leads with source = 'Referral' (vs total leads)",
      },
      socialMedia: {
        count: socialLeads,
        percentage: socialPct,
        description: "Leads with source = 'Social Media' (vs total leads)",
      },
      coldCall: {
        count: coldCallLeads,
        percentage: coldCallPct,
        description: "Leads with source = 'Cold Call' (vs total leads)",
      },
      meta: {
        totalLeads,
        totalOpportunities,
        totalCustomers,
      },
    };
  }

  async getLeadAndOpportunityStats() {
    const now = new Date();

    // Calendar month boundaries
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // --- Helper to compute change and trend ---
    const computeChange = (current: number, previous: number) => {
      if (previous === 0) {
        return { change: "100%", trend: "Higher than last month" };
      }
      const percent = ((current - previous) / previous) * 100;
      const formatted = `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
      const trend = percent >= 0 ? "Higher than last month" : "Lower than last month";
      return { change: formatted, trend };
    };

    // --- Helper: get counts for current month (1st -> now) and full previous month ---
    const getCount = async (whereClause?: any) => {
      const [current] = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(
          and(
            whereClause ?? sql`1=1`,
            gte(sql`${leads.createdAt}`, startOfCurrentMonth),
            lte(sql`${leads.createdAt}`, now) // current month up to now
          )
        );

      const [previous] = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(
          and(
            whereClause ?? sql`1=1`,
            gte(sql`${leads.createdAt}`, startOfPreviousMonth),
            lt(sql`${leads.createdAt}`, startOfCurrentMonth) // full previous month
          )
        );

      return {
        current: Number(current.count),
        previous: Number(previous.count),
      };
    };

    // --- Total counts (all time) ---
    const totalLeadsResult = await db.select({ count: sql<number>`count(*)` }).from(leads);
    const totalOpportunitiesResult = await db.select({ count: sql<number>`count(*)` }).from(opportunities);

    const totalLeads = Number(totalLeadsResult[0].count);
    const totalOpportunities = Number(totalOpportunitiesResult[0].count);

    // --- Data for current month vs previous month ---
    const leadsData = await getCount();
    const opportunitiesData = await getCount(); // if opportunities are stored separately, change table/whereClause

    // --- Compute percentage change and trend ---
    const leadsChange = computeChange(leadsData.current, leadsData.previous);
    const opportunitiesChange = computeChange(opportunitiesData.current, opportunitiesData.previous);

    // --- Fallback for insufficient history ---
    const fallback = { change: "100%", trend: "Higher than last month" };

    const stats = {
      totalLeads: {
        value: totalLeads,
        ...(leadsData.previous === 0 ? fallback : leadsChange),
      },
      totalOpportunities: {
        value: totalOpportunities,
        ...(opportunitiesData.previous === 0 ? fallback : opportunitiesChange),
      },
    };

    return stats;
  }
  // Manager functions for newDashboardStats
  async getLeadQualityAndSourceStatsManager(userId: number) {
    // --- 1. Fetch Current User's Info ---
    // We need username, id, and userType for the logic
    const userResult = await db
      .select({
        username: users.username,
        id: users.id,
        userType: users.userType,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult.length) throw new Error("User not found");
    const user = userResult[0];
    const username = user.username;

    const teammembers = await this.getTeamsByUserId(userId);


    // --- 2. STATS BASED *ONLY* ON CURRENT USER ---

    // --- Total Leads (Current User) ---
    const totalLeadsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.createdByUserId, userId));
    // .where(eq(customers.createdByUserName, username));
    const totalLeads = Number(totalLeadsResult[0].count);

    // --- Total Customers (Current User) ---
    const totalCustomersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.createdByUserName, username));
    const totalCustomers = Number(totalCustomersResult[0].count);

    // --- Qualified Leads (Current User) ---
    const qualifiedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.createdByUserId, userId),
          eq(leads.status, 'qualified') // Using eq() for safety
        )
      );
    const qualifiedCount = Number(qualifiedResult[0].count);

    // --- Unqualified Leads (Current User) ---
    const unqualifiedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.createdByUserId, userId),
          eq(leads.status, 'new') // Using eq() for safety
        )
      );
    const unqualifiedCount = Number(unqualifiedResult[0].count);

    // --- Lead Source Counts Helper (Current User) ---
    const sourceCounts = async (source: string) => {
      const r = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(
          and(
            eq(leads.createdByUserId, userId),
            eq(leads.source, source) // Using eq() for safety
          )
        );
      return Number(r[0].count);
    };

    // --- Lead Sources (Current User) ---
    const websiteLeads = await sourceCounts("website");
    const referralLeads = await sourceCounts("referral");
    const socialLeads = await sourceCounts("social_media");
    const coldCallLeads = await sourceCounts("cold_call");

    // --- 3. STATS BASED ON TEAM'S *QUALIFIED LEADS* ---

    // Initialize counts for the new logic
    let totalOpportunities = 0;
    let closedWonCount = 0;

    // 3a. Build Team Member ID List
    let memberIds: number[] = [];
    if (!teammembers || teammembers.length === 0) {
      memberIds.push(userId); // No teams, so just include the user
    } else {
      for (const t of teammembers) { // Use teammembers variable from above
        if (t.team && t.team.members) {
          for (const m of t.team.members) {
            if (m.user) {
              const memberUserType = m.user.userType;
              if (user.userType === "team-lead" && memberUserType === "associate") {
                memberIds.push(m.user.id);
              }
              if (
                user.userType === "manager" &&
                typeof memberUserType === "string" &&
                ["associate", "team-lead", "manager"].includes(memberUserType)
              ) {
                memberIds.push(m.user.id);
              }
            }
          }
        }
      }
      memberIds.push(userId); // Always include the user themselves
    }
    // dedupe without using Set iteration (avoids '--downlevelIteration' requirement)
    const uniqueMemberIds = memberIds.reduce((acc, id) => {
      if (acc.indexOf(id) === -1) acc.push(id);
      return acc;
    }, [] as number[]);
    // console.log(`[Stats-Opp] Querying for qualified leads from user IDs: ${uniqueMemberIds.join(', ')}`);

    // 3b. Find all QUALIFIED leads from this team
    let qualifiedTeamLeadIds: number[] = [];
    if (uniqueMemberIds.length > 0) {
      const qualifiedTeamLeads = await db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            inArray(leads.createdByUserId, uniqueMemberIds),
            eq(leads.status, 'qualified')
          )
        );
      qualifiedTeamLeadIds = qualifiedTeamLeads.map(l => l.id);
    }

    // 3c. Calculate Total Opportunities based on team's qualified leads
    if (qualifiedTeamLeadIds.length > 0) {
      const totalOpportunitiesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(inArray(opportunities.leadId, qualifiedTeamLeadIds)); // ✅ NEW LOGIC
      totalOpportunities = Number(totalOpportunitiesResult[0].count);
    }

    // 3d. Calculate Closed Won based on *those* opportunities
    if (qualifiedTeamLeadIds.length > 0) {
      const closedWonResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(
          and(
            inArray(opportunities.leadId, qualifiedTeamLeadIds), // ✅ NEW LOGIC
            eq(opportunities.isClosedWon, true)
          )
        );
      closedWonCount = Number(closedWonResult[0].count);
    }

    // --- 4. FINAL CALCULATIONS ---

    // --- Helper for Percentage ---
    const safePercent = (part: number, total: number) =>
      total > 0 ? ((part / total) * 100).toFixed(2) + "%" : "0.00%";

    // --- Percentages ---
    const qualifiedLeadsPct = safePercent(qualifiedCount, totalLeads);
    const unqualifiedLeadsPct = safePercent(unqualifiedCount, totalLeads);
    // ✅ This now correctly uses the team-based opportunity count
    const clientsPct = safePercent(closedWonCount, totalOpportunities);
    const websitePct = safePercent(websiteLeads, totalLeads);
    const referralPct = safePercent(referralLeads, totalLeads);
    const socialPct = safePercent(socialLeads, totalLeads);
    const coldCallPct = safePercent(coldCallLeads, totalLeads);

    // --- 5. Final Return Object ---
    return {
      qualifiedLeads: {
        count: qualifiedCount,
        percentage: qualifiedLeadsPct,
        description: "Leads (current user) whose status = 'qualified' (vs total user leads)",
      },
      unqualifiedLeads: {
        count: unqualifiedCount,
        percentage: unqualifiedLeadsPct,
        description: "Leads (current user) whose status = 'new' (vs total user leads)",
      },
      clients: {
        count: closedWonCount,
        percentage: clientsPct,
        description:
          "Opportunities (from team-qualified leads) where is_closed_won = true (vs total team opportunities)",
      },
      websiteInquiries: {
        count: websiteLeads,
        percentage: websitePct,
        description: "Leads (current user) with source = 'Website' (vs total user leads)",
      },
      referrals: {
        count: referralLeads,
        percentage: referralPct,
        description: "Leads (current user) with source = 'Referral' (vs total user leads)",
      },
      socialMedia: {
        count: socialLeads,
        percentage: socialPct,
        description: "Leads (current user) with source = 'Social Media' (vs total user leads)",
      },
      coldCall: {
        count: coldCallLeads,
        percentage: coldCallPct,
        description: "Leads (current user) with source = 'Cold Call' (vs total user leads)",
      },
      meta: {
        totalLeads, // User's total leads
        totalOpportunities, // Team's total opportunities
        totalCustomers, // User's total customers
        queriedMemberIds: uniqueMemberIds,
      },
    };
  }

  async getLeadAndOpportunityStatsForManager(userId: number) {
    const now = new Date();

    // Month boundaries
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // --- Helper: compute % change ---
    const computeChange = (current: number, previous: number) => {
      if (previous === 0) {
        return { change: "100%", trend: "Higher than last month" };
      }
      const percent = ((current - previous) / previous) * 100;
      const formatted = `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
      const trend = percent >= 0 ? "Higher than last month" : "Lower than last month";
      return { change: formatted, trend };
    };

    // --- Step 1: Get manager’s team members ---
    const teamData = await this.getTeamsByUserId(userId);
    let memberIds: number[] = [];

    if (!teamData || teamData.length === 0) {
      memberIds.push(userId); // No team — only self
    } else {
      for (const t of teamData) {
        if (t.team && t.team.members) {
          for (const m of t.team.members) {
            if (m.user) {
              const memberType = m.user.userType;
              if (["associate", "manager", "team-lead"].includes(memberType)) {
                memberIds.push(m.user.id);
              }
            }
          }
        }
      }
      memberIds.push(userId); // Always include self
    }

    // Remove duplicates
    const uniqueMemberIds = memberIds.filter((v, i, a) => a.indexOf(v) === i);
    // console.log(`[ManagerStats] Member IDs for stats:`, uniqueMemberIds);

    // --- Step 2: Helper to get lead/opportunity counts ---
    const getCount = async (table: any, whereClause?: any) => {
      const [current] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            inArray(table.createdByUserId, uniqueMemberIds),
            whereClause ?? sql`1=1`,
            gte(sql`${table}.created_at`, startOfCurrentMonth),
            lte(sql`${table}.created_at`, now)
          )
        );

      const [previous] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            inArray(table.createdByUserId, uniqueMemberIds),
            whereClause ?? sql`1=1`,
            gte(sql`${table}.created_at`, startOfPreviousMonth),
            lt(sql`${table}.created_at`, startOfCurrentMonth)
          )
        );

      return {
        current: Number(current.count),
        previous: Number(previous.count),
      };
    };

    // --- Step 3: Compute current & previous month data ---
    const leadsData = await getCount(leads);
    const opportunitiesData = await getCount(opportunities);

    // --- Step 4: Compute totals (all time) ---
    const [totalLeadsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(inArray(leads.createdByUserId, uniqueMemberIds));

    const [totalOpportunitiesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities)
      .where(inArray(opportunities.createdByUserId, uniqueMemberIds));

    const totalLeads = Number(totalLeadsResult.count);
    const totalOpportunities = Number(totalOpportunitiesResult.count);

    // --- Step 5: Compute % changes ---
    const leadsChange = computeChange(leadsData.current, leadsData.previous);
    const opportunitiesChange = computeChange(opportunitiesData.current, opportunitiesData.previous);

    const fallback = { change: "100%", trend: "Higher than last month" };

    // --- Step 6: Build final response ---
    const stats = {
      totalLeads: {
        value: totalLeads,
        ...(leadsData.previous === 0 ? fallback : leadsChange),
      },
      totalOpportunities: {
        value: totalOpportunities,
        ...(opportunitiesData.previous === 0 ? fallback : opportunitiesChange),
      },
    };

    return stats;
  }

  async getnewDashboardStatsManager(userId: number) {
    // --- Get user ---
    const userResult = await db
      .select({
        username: users.username,
        id: users.id,
        userType: users.userType,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult.length) throw new Error("User not found");
    const user = userResult[0];
    const username = user.username;

    // --- Get team members ---
    const teammembers = await this.getTeamsByUserId(userId);
    // console.log("teammembers", teammembers);

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // --- Helper: compute change percentage (unchanged) ---
    const computeChange = (current: number, previous: number) => {
      if (previous === 0) {
        return { change: "100%", trend: "Higher than last month" };
      }
      const percent = ((current - previous) / previous) * 100;
      const formatted = `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
      const trend = percent >= 0 ? "Higher than last month" : "Lower than last month";
      return { change: formatted, trend };
    };

    // --- Build member id list (team-based) ---
    let memberIds: number[] = [];
    let memberUsernames: string[] = [];

    if (!teammembers || teammembers.length === 0) {
      memberIds.push(userId);
      memberUsernames.push(username);
    } else {
      for (const t of teammembers) {
        if (t.team && t.team.members) {
          for (const m of t.team.members) {
            if (m.user) {
              const memberType = m.user.userType;
              // follow the same member-type inclusion logic like getLeadAndOpportunityStatsForManager
              if (["associate", "manager", "team-lead"].includes(memberType)) {
                if (m.user.id) memberIds.push(m.user.id);
                if (m.user.username) memberUsernames.push(m.user.username);
              }
            }
          }
        }
      }
      // always include self
      memberIds.push(userId);
      memberUsernames.push(username);
    }

    // Deduplicate ids and usernames
    const uniqueMemberIds = memberIds.filter((v, i, a) => a.indexOf(v) === i);
    const uniqueMemberUsernames = memberUsernames.filter((v, i, a) => a.indexOf(v) === i);

    // console.log(`[Stats-Opp] Querying for qualified leads from user IDs: ${uniqueMemberIds.join(", ")}`);

    // --- Generic helper to fetch monthly counts filtered by a specified "createdBy" column and a set of allowed values ---
    // createdByCol: column reference (e.g., leads.createdByUserId or customers.createdByUserName)
    // createdByValues: array of values (numbers or strings) to use with inArray
    // whereClause: optional additional where clause (e.g., status = 'converted')
    const getCount = async (table: any, createdByCol: any, createdByValues: Array<number | string>, whereClause?: any) => {
      // ensure there's at least one createdByValues entry so inArray works
      const createdByFilter = createdByValues && createdByValues.length > 0
        ? inArray(createdByCol, createdByValues)
        : sql`1=1`;

      const [current] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            createdByFilter,
            whereClause ?? sql`1=1`,
            gte(sql`${table}.created_at`, startOfCurrentMonth),
            lte(sql`${table}.created_at`, now)
          )
        );

      const [previous] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            createdByFilter,
            whereClause ?? sql`1=1`,
            gte(sql`${table}.created_at`, startOfPreviousMonth),
            lte(sql`${table}.created_at`, startOfCurrentMonth)
          )
        );

      return {
        current: Number(current.count),
        previous: Number(previous.count),
      };
    };

    // --- Compute metrics using team-based filters ---
    const leadsData = await getCount(leads, leads.createdByUserId, uniqueMemberIds);
    const opportunitiesData = await getCount(opportunities, opportunities.createdByUserId, uniqueMemberIds);
    const customersData = await getCount(customers, customers.createdByUserName, uniqueMemberUsernames);
    const convertedData = await getCount(opportunities, opportunities.createdByUserId, uniqueMemberIds, sql`stage = 'closed won'`);
    // --- Total counts (team-based) ---
    const [totalLeadsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(inArray(leads.createdByUserId, uniqueMemberIds));

    const [totalCustomersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(inArray(customers.createdByUserName, uniqueMemberUsernames));

    const [convertedClientsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities)
      .where(
        and(
          inArray(opportunities.createdByUserId, uniqueMemberIds),
          eq(opportunities.stage, "closed won")
        )
      );

    const totalLeads = Number(totalLeadsResult.count);
    const totalCustomers = Number(totalCustomersResult.count);
    const convertedClients = Number(convertedClientsResult.count);

    // --- Compute opportunities (qualified leads -> opportunities) ---
    let totalOpportunities = 0;
    let qualifiedTeamLeadIds: number[] = [];

    if (uniqueMemberIds.length > 0) {
      const qualifiedTeamLeads = await db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            inArray(leads.createdByUserId, uniqueMemberIds),
            eq(leads.status, "qualified")
          )
        );
      qualifiedTeamLeadIds = qualifiedTeamLeads.map((l) => l.id);
    }

    if (qualifiedTeamLeadIds.length > 0) {
      const [totalOpportunitiesResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(inArray(opportunities.leadId, qualifiedTeamLeadIds));

      totalOpportunities = Number(totalOpportunitiesResult.count);
    }

    // --- Compute changes ---
    const leadsChange = computeChange(leadsData.current, leadsData.previous);
    const opportunitiesChange = computeChange(opportunitiesData.current, opportunitiesData.previous);
    const customersChange = computeChange(customersData.current, customersData.previous);
    const convertedChange = computeChange(convertedData.current, convertedData.previous);

    const fallback = { change: "100%", trend: "Higher than last month" };

    const stats = {
      totaleads: {
        value: totalLeads,
        ...(leadsData.previous === 0 ? fallback : leadsChange),
      },
      totalOpportunities: {
        value: totalOpportunities,
        ...(opportunitiesData.previous === 0 ? fallback : opportunitiesChange),
      },
      totalCustomers: {
        value: totalCustomers,
        ...(customersData.previous === 0 ? fallback : customersChange),
      },
      convertedClients: {
        value: convertedClients,
        ...(convertedData.previous === 0 ? fallback : convertedChange),
      },
    };

    return stats;
  }
  // Team-lead functions for newDashboardStats
  async getLeadQualityAndSourceStatsTeamlead(userId: number) {
    // --- 1. Fetch Current User's Info ---
    // We need username, id, and userType for the logic
    const userResult = await db
      .select({
        username: users.username,
        id: users.id,
        userType: users.userType,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult.length) throw new Error("User not found");
    const user = userResult[0];
    const username = user.username;

    const teammembers = await this.getTeamsByUserId(userId);
    // console.log("teammembers", teammembers);

    // --- 2. STATS BASED *ONLY* ON CURRENT USER ---

    // --- Total Leads (Current User) ---
    const totalLeadsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.createdByUserId, userId));
    // .where(eq(customers.createdByUserName, username));
    const totalLeads = Number(totalLeadsResult[0].count);

    // --- Total Customers (Current User) ---
    const totalCustomersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.createdByUserName, username));
    const totalCustomers = Number(totalCustomersResult[0].count);

    // --- Qualified Leads (Current User) ---
    const qualifiedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.createdByUserId, userId),
          eq(leads.status, 'qualified') // Using eq() for safety
        )
      );
    const qualifiedCount = Number(qualifiedResult[0].count);

    // --- Unqualified Leads (Current User) ---
    const unqualifiedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.createdByUserId, userId),
          eq(leads.status, 'new') // Using eq() for safety
        )
      );
    const unqualifiedCount = Number(unqualifiedResult[0].count);

    // --- Lead Source Counts Helper (Current User) ---
    const sourceCounts = async (source: string) => {
      const r = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(
          and(
            eq(leads.createdByUserId, userId),
            eq(leads.source, source) // Using eq() for safety
          )
        );
      return Number(r[0].count);
    };

    // --- Lead Sources (Current User) ---
    const websiteLeads = await sourceCounts("website");
    const referralLeads = await sourceCounts("referral");
    const socialLeads = await sourceCounts("social_media");
    const coldCallLeads = await sourceCounts("cold_call");

    // --- 3. STATS BASED ON TEAM'S *QUALIFIED LEADS* ---

    // Initialize counts for the new logic
    let totalOpportunities = 0;
    let closedWonCount = 0;

    // 3a. Build Team Member ID List
    let memberIds: number[] = [];
    if (!teammembers || teammembers.length === 0) {
      memberIds.push(userId); // No teams, so just include the user
    } else {
      for (const t of teammembers) { // Use teammembers variable from above
        if (t.team && t.team.members) {
          for (const m of t.team.members) {
            if (m.user) {
              const memberUserType = m.user.userType;
              if (memberUserType === "associate") {
                memberIds.push(m.user.id);
              }
              if (
                user.userType === "team-lead" &&
                typeof memberUserType === "string" &&
                ["associate", "team-lead"].includes(memberUserType)
              ) {
                memberIds.push(m.user.id);
              }
            }
          }
        }
      }
      memberIds.push(userId); // Always include the user themselves
    }
    // dedupe without using Set iteration (avoids '--downlevelIteration' requirement)
    const uniqueMemberIds = memberIds.reduce((acc, id) => {
      if (acc.indexOf(id) === -1) acc.push(id);
      return acc;
    }, [] as number[]);
    // console.log(`[Stats-Opp] Querying for qualified leads from user IDs: ${uniqueMemberIds.join(', ')}`);

    // 3b. Find all QUALIFIED leads from this team
    let qualifiedTeamLeadIds: number[] = [];
    if (uniqueMemberIds.length > 0) {
      const qualifiedTeamLeads = await db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            inArray(leads.createdByUserId, uniqueMemberIds),
            eq(leads.status, 'qualified')
          )
        );
      qualifiedTeamLeadIds = qualifiedTeamLeads.map(l => l.id);
    }

    // 3c. Calculate Total Opportunities based on team's qualified leads
    if (qualifiedTeamLeadIds.length > 0) {
      const totalOpportunitiesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(inArray(opportunities.leadId, qualifiedTeamLeadIds)); // ✅ NEW LOGIC
      totalOpportunities = Number(totalOpportunitiesResult[0].count);
    }

    // 3d. Calculate Closed Won based on *those* opportunities
    if (qualifiedTeamLeadIds.length > 0) {
      const closedWonResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(
          and(
            inArray(opportunities.leadId, qualifiedTeamLeadIds), // ✅ NEW LOGIC
            eq(opportunities.isClosedWon, true)
          )
        );
      closedWonCount = Number(closedWonResult[0].count);
    }

    // --- 4. FINAL CALCULATIONS ---

    // --- Helper for Percentage ---
    const safePercent = (part: number, total: number) =>
      total > 0 ? ((part / total) * 100).toFixed(2) + "%" : "0.00%";

    // --- Percentages ---
    const qualifiedLeadsPct = safePercent(qualifiedCount, totalLeads);
    const unqualifiedLeadsPct = safePercent(unqualifiedCount, totalLeads);
    // ✅ This now correctly uses the team-based opportunity count
    const clientsPct = safePercent(closedWonCount, totalOpportunities);
    const websitePct = safePercent(websiteLeads, totalLeads);
    const referralPct = safePercent(referralLeads, totalLeads);
    const socialPct = safePercent(socialLeads, totalLeads);
    const coldCallPct = safePercent(coldCallLeads, totalLeads);

    // --- 5. Final Return Object ---
    return {
      qualifiedLeads: {
        count: qualifiedCount,
        percentage: qualifiedLeadsPct,
        description: "Leads (current user) whose status = 'qualified' (vs total user leads)",
      },
      unqualifiedLeads: {
        count: unqualifiedCount,
        percentage: unqualifiedLeadsPct,
        description: "Leads (current user) whose status = 'new' (vs total user leads)",
      },
      clients: {
        count: closedWonCount,
        percentage: clientsPct,
        description:
          "Opportunities (from team-qualified leads) where is_closed_won = true (vs total team opportunities)",
      },
      websiteInquiries: {
        count: websiteLeads,
        percentage: websitePct,
        description: "Leads (current user) with source = 'Website' (vs total user leads)",
      },
      referrals: {
        count: referralLeads,
        percentage: referralPct,
        description: "Leads (current user) with source = 'Referral' (vs total user leads)",
      },
      socialMedia: {
        count: socialLeads,
        percentage: socialPct,
        description: "Leads (current user) with source = 'Social Media' (vs total user leads)",
      },
      coldCall: {
        count: coldCallLeads,
        percentage: coldCallPct,
        description: "Leads (current user) with source = 'Cold Call' (vs total user leads)",
      },
      meta: {
        totalLeads, // User's total leads
        totalOpportunities, // Team's total opportunities
        totalCustomers, // User's total customers
        queriedMemberIds: uniqueMemberIds,
      },
    };
  }

  async getLeadAndOpportunityStatsForTeamlead(userId: number) {
    const now = new Date();

    // Month boundaries
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // --- Helper: compute % change ---
    const computeChange = (current: number, previous: number) => {
      if (previous === 0) {
        return { change: "100%", trend: "Higher than last month" };
      }
      const percent = ((current - previous) / previous) * 100;
      const formatted = `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
      const trend = percent >= 0 ? "Higher than last month" : "Lower than last month";
      return { change: formatted, trend };
    };

    // --- Step 1: Get manager’s team members ---
    const teamData = await this.getTeamsByUserId(userId);
    let memberIds: number[] = [];

    if (!teamData || teamData.length === 0) {
      memberIds.push(userId); // No team — only self
    } else {
      for (const t of teamData) {
        if (t.team && t.team.members) {
          for (const m of t.team.members) {
            if (m.user) {
              const memberType = m.user.userType;
              if (["associate", "team-lead"].includes(memberType)) {
                memberIds.push(m.user.id);
              }
            }
          }
        }
      }
      memberIds.push(userId); // Always include self
    }

    // Remove duplicates
    const uniqueMemberIds = memberIds.filter((v, i, a) => a.indexOf(v) === i);
    // console.log(`[ManagerStats] Member IDs for stats:`, uniqueMemberIds);

    // --- Step 2: Helper to get lead/opportunity counts ---
    const getCount = async (table: any, whereClause?: any) => {
      const [current] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            inArray(table.createdByUserId, uniqueMemberIds),
            whereClause ?? sql`1=1`,
            gte(sql`${table}.created_at`, startOfCurrentMonth),
            lte(sql`${table}.created_at`, now)
          )
        );

      const [previous] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            inArray(table.createdByUserId, uniqueMemberIds),
            whereClause ?? sql`1=1`,
            gte(sql`${table}.created_at`, startOfPreviousMonth),
            lt(sql`${table}.created_at`, startOfCurrentMonth)
          )
        );

      return {
        current: Number(current.count),
        previous: Number(previous.count),
      };
    };

    // --- Step 3: Compute current & previous month data ---
    const leadsData = await getCount(leads);
    const opportunitiesData = await getCount(opportunities);

    // --- Step 4: Compute totals (all time) ---
    const [totalLeadsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(inArray(leads.createdByUserId, uniqueMemberIds));

    const [totalOpportunitiesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities)
      .where(inArray(opportunities.createdByUserId, uniqueMemberIds));

    const totalLeads = Number(totalLeadsResult.count);
    const totalOpportunities = Number(totalOpportunitiesResult.count);

    // --- Step 5: Compute % changes ---
    const leadsChange = computeChange(leadsData.current, leadsData.previous);
    const opportunitiesChange = computeChange(opportunitiesData.current, opportunitiesData.previous);

    const fallback = { change: "100%", trend: "Higher than last month" };

    // --- Step 6: Build final response ---
    const stats = {
      totalLeads: {
        value: totalLeads,
        ...(leadsData.previous === 0 ? fallback : leadsChange),
      },
      totalOpportunities: {
        value: totalOpportunities,
        ...(opportunitiesData.previous === 0 ? fallback : opportunitiesChange),
      },
    };

    return stats;
  }

  async getnewDashboardStatsTeamlead(userId: number) {
    // --- Get user ---
    const userResult = await db
      .select({
        username: users.username,
        id: users.id,
        userType: users.userType,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult.length) throw new Error("User not found");
    const user = userResult[0];
    const username = user.username;

    // --- Get team members ---
    const teammembers = await this.getTeamsByUserId(userId);
    // console.log("teammembers", teammembers);

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // --- Helper: compute change percentage (unchanged) ---
    const computeChange = (current: number, previous: number) => {
      if (previous === 0) {
        return { change: "100%", trend: "Higher than last month" };
      }
      const percent = ((current - previous) / previous) * 100;
      const formatted = `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
      const trend = percent >= 0 ? "Higher than last month" : "Lower than last month";
      return { change: formatted, trend };
    };

    // --- Build member id list (team-based) ---
    let memberIds: number[] = [];
    let memberUsernames: string[] = [];

    if (!teammembers || teammembers.length === 0) {
      memberIds.push(userId);
      memberUsernames.push(username);
    } else {
      for (const t of teammembers) {
        if (t.team && t.team.members) {
          for (const m of t.team.members) {
            if (m.user) {
              const memberType = m.user.userType;
              // follow the same member-type inclusion logic like getLeadAndOpportunityStatsForManager
              if (["associate", "team-lead"].includes(memberType)) {
                if (m.user.id) memberIds.push(m.user.id);
                if (m.user.username) memberUsernames.push(m.user.username);
              }
            }
          }
        }
      }
      // always include self
      memberIds.push(userId);
      memberUsernames.push(username);
    }

    // Deduplicate ids and usernames
    const uniqueMemberIds = memberIds.filter((v, i, a) => a.indexOf(v) === i);
    const uniqueMemberUsernames = memberUsernames.filter((v, i, a) => a.indexOf(v) === i);

    // console.log(`[Stats-Opp] Querying for qualified leads from user IDs: ${uniqueMemberIds.join(", ")}`);

    // --- Generic helper to fetch monthly counts filtered by a specified "createdBy" column and a set of allowed values ---
    // createdByCol: column reference (e.g., leads.createdByUserId or customers.createdByUserName)
    // createdByValues: array of values (numbers or strings) to use with inArray
    // whereClause: optional additional where clause (e.g., status = 'converted')
    const getCount = async (table: any, createdByCol: any, createdByValues: Array<number | string>, whereClause?: any) => {
      // ensure there's at least one createdByValues entry so inArray works
      const createdByFilter = createdByValues && createdByValues.length > 0
        ? inArray(createdByCol, createdByValues)
        : sql`1=1`;

      const [current] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            createdByFilter,
            whereClause ?? sql`1=1`,
            gte(sql`${table}.created_at`, startOfCurrentMonth),
            lte(sql`${table}.created_at`, now)
          )
        );

      const [previous] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            createdByFilter,
            whereClause ?? sql`1=1`,
            gte(sql`${table}.created_at`, startOfPreviousMonth),
            lte(sql`${table}.created_at`, startOfCurrentMonth)
          )
        );

      return {
        current: Number(current.count),
        previous: Number(previous.count),
      };
    };

    // --- Compute metrics using team-based filters ---
    const leadsData = await getCount(leads, leads.createdByUserId, uniqueMemberIds);
    const opportunitiesData = await getCount(opportunities, opportunities.createdByUserId, uniqueMemberIds);
    const customersData = await getCount(customers, customers.createdByUserName, uniqueMemberUsernames);
    const convertedData = await getCount(opportunities, opportunities.createdByUserId, uniqueMemberIds, sql`stage = 'closed won'`);

    // --- Total counts (team-based) ---
    const [totalLeadsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(inArray(leads.createdByUserId, uniqueMemberIds));

    const [totalCustomersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(inArray(customers.createdByUserName, uniqueMemberUsernames));

    const [convertedClientsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities)
      .where(
        and(
          inArray(opportunities.createdByUserId, uniqueMemberIds),
          eq(opportunities.stage, "closed won")
        )
      );

    const totalLeads = Number(totalLeadsResult.count);
    const totalCustomers = Number(totalCustomersResult.count);
    const convertedClients = Number(convertedClientsResult.count);

    // --- Compute opportunities (qualified leads -> opportunities) ---
    let totalOpportunities = 0;
    let qualifiedTeamLeadIds: number[] = [];

    if (uniqueMemberIds.length > 0) {
      const qualifiedTeamLeads = await db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            inArray(leads.createdByUserId, uniqueMemberIds),
            eq(leads.status, "qualified")
          )
        );
      qualifiedTeamLeadIds = qualifiedTeamLeads.map((l) => l.id);
    }

    if (qualifiedTeamLeadIds.length > 0) {
      const [totalOpportunitiesResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(inArray(opportunities.leadId, qualifiedTeamLeadIds));

      totalOpportunities = Number(totalOpportunitiesResult.count);
    }

    // --- Compute changes ---
    const leadsChange = computeChange(leadsData.current, leadsData.previous);
    const opportunitiesChange = computeChange(opportunitiesData.current, opportunitiesData.previous);
    const customersChange = computeChange(customersData.current, customersData.previous);
    const convertedChange = computeChange(convertedData.current, convertedData.previous);

    const fallback = { change: "100%", trend: "Higher than last month" };

    const stats = {
      totaleads: {
        value: totalLeads,
        ...(leadsData.previous === 0 ? fallback : leadsChange),
      },
      totalOpportunities: {
        value: totalOpportunities,
        ...(opportunitiesData.previous === 0 ? fallback : opportunitiesChange),
      },
      totalCustomers: {
        value: totalCustomers,
        ...(customersData.previous === 0 ? fallback : customersChange),
      },
      convertedClients: {
        value: convertedClients,
        ...(convertedData.previous === 0 ? fallback : convertedChange),
      },
    };

    return stats;
  }
  // Asssociate functions for newDashboard

  async getLeadQualityAndSourceStatsAssociate(userId: number) {
    // --- 1. Fetch Current User's Info ---
    const userResult = await db
      .select({
        username: users.username,
        id: users.id,
        userType: users.userType,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult.length) throw new Error("User not found");
    const user = userResult[0];
    const username = user.username;

    // --- 2. STATS BASED *ONLY* ON CURRENT USER ---

    // --- Total Leads (Current User) ---
    const totalLeadsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.createdByUserId, userId));
    const totalLeads = Number(totalLeadsResult[0].count);

    // --- Total Customers (Current User) ---
    const totalCustomersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.createdByUserName, username));
    const totalCustomers = Number(totalCustomersResult[0].count);

    // --- Qualified Leads (Current User) ---
    const qualifiedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.createdByUserId, userId),
          eq(leads.status, 'qualified')
        )
      );
    const qualifiedCount = Number(qualifiedResult[0].count);

    // --- Unqualified Leads (Current User) ---
    const unqualifiedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.createdByUserId, userId),
          eq(leads.status, 'new')
        )
      );
    const unqualifiedCount = Number(unqualifiedResult[0].count);

    // --- Lead Source Counts Helper (Current User) ---
    const sourceCounts = async (source: string) => {
      const r = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(
          and(
            eq(leads.createdByUserId, userId),
            eq(leads.source, source)
          )
        );
      return Number(r[0].count);
    };

    // --- Lead Sources (Current User) ---
    const websiteLeads = await sourceCounts("website");
    const referralLeads = await sourceCounts("referral");
    const socialLeads = await sourceCounts("social_media");
    const coldCallLeads = await sourceCounts("cold_call");

    // --- 3. STATS BASED ON *USER'S OWN* QUALIFIED LEADS ---

    let totalOpportunities = 0;
    let closedWonCount = 0;

    // 3a. Find all QUALIFIED leads from this user
    const qualifiedUserLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.createdByUserId, userId),
          eq(leads.status, 'qualified')
        )
      );
    const qualifiedUserLeadIds = qualifiedUserLeads.map(l => l.id);

    // 3b. Calculate Total Opportunities based on user's qualified leads
    if (qualifiedUserLeadIds.length > 0) {
      const totalOpportunitiesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(inArray(opportunities.leadId, qualifiedUserLeadIds));
      totalOpportunities = Number(totalOpportunitiesResult[0].count);
    }

    // 3c. Calculate Closed Won based on *those* opportunities
    if (qualifiedUserLeadIds.length > 0) {
      const closedWonResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(
          and(
            inArray(opportunities.leadId, qualifiedUserLeadIds),
            eq(opportunities.isClosedWon, true)
          )
        );
      closedWonCount = Number(closedWonResult[0].count);
    }

    // --- 4. FINAL CALCULATIONS ---
    const safePercent = (part: number, total: number) =>
      total > 0 ? ((part / total) * 100).toFixed(2) + "%" : "0.00%";

    const qualifiedLeadsPct = safePercent(qualifiedCount, totalLeads);
    const unqualifiedLeadsPct = safePercent(unqualifiedCount, totalLeads);
    const clientsPct = safePercent(closedWonCount, totalOpportunities);
    const websitePct = safePercent(websiteLeads, totalLeads);
    const referralPct = safePercent(referralLeads, totalLeads);
    const socialPct = safePercent(socialLeads, totalLeads);
    const coldCallPct = safePercent(coldCallLeads, totalLeads);

    // --- 5. Final Return Object ---
    return {
      qualifiedLeads: {
        count: qualifiedCount,
        percentage: qualifiedLeadsPct,
        description: "Leads (current user) whose status = 'qualified' (vs total user leads)",
      },
      unqualifiedLeads: {
        count: unqualifiedCount,
        percentage: unqualifiedLeadsPct,
        description: "Leads (current user) whose status = 'new' (vs total user leads)",
      },
      clients: {
        count: closedWonCount,
        percentage: clientsPct,
        description:
          "Opportunities (from user's qualified leads) where is_closed_won = true (vs total user opportunities)",
      },
      websiteInquiries: {
        count: websiteLeads,
        percentage: websitePct,
        description: "Leads (current user) with source = 'Website' (vs total user leads)",
      },
      referrals: {
        count: referralLeads,
        percentage: referralPct,
        description: "Leads (current user) with source = 'Referral' (vs total user leads)",
      },
      socialMedia: {
        count: socialLeads,
        percentage: socialPct,
        description: "Leads (current user) with source = 'Social Media' (vs total user leads)",
      },
      coldCall: {
        count: coldCallLeads,
        percentage: coldCallPct,
        description: "Leads (current user) with source = 'Cold Call' (vs total user leads)",
      },
      meta: {
        totalLeads,
        totalOpportunities,
        totalCustomers,
      },
    };
  }

  async getLeadAndOpportunityStatsForAssociate(userId: number) {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // --- Helper: compute % change ---
    const computeChange = (current: number, previous: number) => {
      if (previous === 0) {
        if (current > 0) {
          return { change: "100%", trend: "Higher than last month" };
        }
        return { change: "0.00%", trend: "No change from last month" };
      }
      const percent = ((current - previous) / previous) * 100;
      const formatted = `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
      const trend = percent >= 0 ? "Higher than last month" : "Lower than last month";
      return { change: formatted, trend };
    };

    // --- Step 1: Define the Where Clause for the user ---
    // All queries will be filtered by the associate's own ID
    const userWhere = eq(leads.createdByUserId, userId);
    // We use leads.createdByUserId here, but getCount applies it to the table passed in.

    // --- Step 2: Helper to get lead/opportunity counts ---
    const getCount = async (table: any, whereClause?: any) => {
      const [current] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            eq(table.createdByUserId, userId), // ✅ Associate-only logic
            whereClause ?? sql`1=1`,
            gte(table.createdAt, startOfCurrentMonth),
            lte(table.createdAt, now)
          )
        );

      const [previous] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            eq(table.createdByUserId, userId), // ✅ Associate-only logic
            whereClause ?? sql`1=1`,
            gte(table.createdAt, startOfPreviousMonth),
            lt(table.createdAt, startOfCurrentMonth)
          )
        );

      return {
        current: Number(current.count),
        previous: Number(previous.count),
      };
    };

    // --- Step 3: Compute current & previous month data ---
    const leadsData = await getCount(leads);
    const opportunitiesData = await getCount(opportunities);

    // --- Step 4: Compute totals (all time) ---
    const [totalLeadsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.createdByUserId, userId)); // ✅ Associate-only logic

    const [totalOpportunitiesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities)
      .where(eq(opportunities.createdByUserId, userId)); // ✅ Associate-only logic

    const totalLeads = Number(totalLeadsResult.count);
    const totalOpportunities = Number(totalOpportunitiesResult.count);

    // --- Step 5: Compute % changes ---
    const leadsChange = computeChange(leadsData.current, leadsData.previous);
    const opportunitiesChange = computeChange(opportunitiesData.current, opportunitiesData.previous);

    const fallback = { change: "100%", trend: "Higher than last month" };

    // --- Step 6: Build final response ---
    const stats = {
      totalLeads: {
        value: totalLeads,
        ...(leadsData.previous === 0 && leadsData.current > 0 ? fallback : leadsChange),
      },
      totalOpportunities: {
        value: totalOpportunities,
        ...(opportunitiesData.previous === 0 && opportunitiesData.current > 0 ? fallback : opportunitiesChange),
      },
    };

    return stats;
  }

  async getnewDashboardStatsAssociate(userId: number) {
    // --- 1. Get user ---
    const userResult = await db
      .select({
        username: users.username,
        id: users.id,
        userType: users.userType,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult.length) throw new Error("User not found");
    const user = userResult[0];
    const username = user.username;

    // --- 2. Get User's Qualified Lead IDs (for Opportunity filter) ---
    const qualifiedUserLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.createdByUserId, userId),
          eq(leads.status, "qualified")
        )
      );
    const qualifiedUserLeadIds = qualifiedUserLeads.map((l) => l.id);


    // --- 3. Define ALL Where Clauses ---
    const leadsWhere = eq(leads.createdByUserId, userId);
    const convertedWhere = and(
      eq(opportunities.createdByUserId, userId),
      eq(opportunities.stage, "closed won")
    );
    const customersWhere = eq(customers.createdByUserName, username);
    const opportunitiesWhere = inArray(opportunities.leadId, qualifiedUserLeadIds);


    // --- 4. Date & Trend Helpers ---
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const computeChange = (current: number, previous: number) => {
      if (previous === 0) {
        if (current > 0) {
          return { change: "100%", trend: "Higher than last month" };
        }
        return { change: "0.00%", trend: "No change from last month" };
      }
      const percent = ((current - previous) / previous) * 100;
      const formatted = `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
      const trend = percent >= 0 ? "Higher than last month" : "Lower than last month";
      return { change: formatted, trend };
    };

    // --- Helper: fetch monthly counts ---
    const getCount = async (table: any, whereClause: any) => {
      const [current] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            whereClause,
            gte(table.createdAt, startOfCurrentMonth),
            lte(table.createdAt, now)
          )
        );

      const [previous] = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(
          and(
            whereClause,
            gte(table.createdAt, startOfPreviousMonth),
            lt(table.createdAt, startOfCurrentMonth)
          )
        );

      return {
        current: Number(current.count),
        previous: Number(previous.count),
      };
    };

    // --- 6. Compute all metrics ---
    const leadsData = await getCount(leads, leadsWhere);
    const opportunitiesData = await getCount(opportunities, opportunitiesWhere);
    const customersData = await getCount(customers, customersWhere);
    const convertedData = await getCount(opportunities, convertedWhere);

    // --- 7. Total counts (regardless of date) ---
    const totalLeadsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(leadsWhere);

    const totalOpportunitiesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities)
      .where(opportunitiesWhere);

    const totalCustomersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(customersWhere);

    const convertedClientsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(opportunities)
      .where(convertedWhere);

    const totalLeads = Number(totalLeadsResult[0]?.count || 0);
    const totalOpportunities = Number(totalOpportunitiesResult[0]?.count || 0);
    const totalCustomers = Number(totalCustomersResult[0]?.count || 0);
    const convertedClients = Number(convertedClientsResult[0]?.count || 0);

    // --- 8. Calculate percentage/trend dynamically ---
    const leadsChange = computeChange(leadsData.current, leadsData.previous);
    const opportunitiesChange = computeChange(
      opportunitiesData.current,
      opportunitiesData.previous
    );
    const customersChange = computeChange(
      customersData.current,
      customersData.previous
    );
    const convertedChange = computeChange(
      convertedData.current,
      convertedData.previous
    );

    // --- 9. Fallback if previous = 0 ---
    const fallback = { change: "100%", trend: "Higher than last month" };

    const stats = {
      totaleads: {
        value: totalLeads,
        ...(leadsData.previous === 0 && leadsData.current > 0 ? fallback : leadsChange),
      },
      totalOpportunities: {
        value: totalOpportunities,
        ...(opportunitiesData.previous === 0 && opportunitiesData.current > 0 ? fallback : opportunitiesChange),
      },
      totalCustomers: {
        value: totalCustomers,
        ...(customersData.previous === 0 && customersData.current > 0 ? fallback : customersChange),
      },
      convertedClients: {
        value: convertedClients,
        ...(convertedData.previous === 0 && convertedData.current > 0 ? fallback : convertedChange),
      },
    };

    return stats;
  }

  async getnewMeetingdata() {
    try {
      // --- Get Leads ---
      const leadsQuery = await db
        .select({
          id: leads.id,
          name: leads.name,
          email: leads.email,
          phone: leads.phone,
          probability: leads.probability,
          companyName: leads.companyName,
          assignedUserName: leads.assignedUserName,
        })
        .from(leads);

      // --- Get Opportunities (Essential Fields Only) ---
      const opportunitiesQuery = await db
        .select({
          id: opportunities.id,
          name: opportunities.name,
          value: opportunities.value,
          stage: opportunities.stage,
          companyName: opportunities.companyName,
          assignedUserName: opportunities.assignedUserName,
        })
        .from(opportunities);

      // --- Get Contacts (Essential Fields Only) ---
      const contactsQuery = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          phone: contacts.phone,
          companyName: contacts.companyName,
          assignedUserName: contacts.assignedUserName,
        })
        .from(contacts);

      // --- Return all data ---
      return {
        leads: leadsQuery,
        opportunities: opportunitiesQuery,
        contacts: contactsQuery,
      };
    } catch (error) {
      console.error("Error fetching meeting data:", error);
      throw new Error("Failed to retrieve meeting data.");
    }
  }

  // getLeadsForDashboard
  async getLeadById(leadId: number) {
    const lead = await db.select().from(leads).where(
      eq(leads.id, leadId)
    );
    return lead;
  }
  async getLeadsForDashboard(
    userId?: number,
    limit?: number
  ): Promise<Lead[]> {
    // console.log("Getting leads for user:", userId, "with limit:", limit);
    return leadsStorage.getLeadsForDashboard(userId, limit);
  }

  // inside your storage class (storage.ts)

  async getLeads(
    filters: LeadFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<Lead[]> {
    // console.log("Filters in storage layer:", filters);
    return leadsStorage.getLeads(filters, pagination);
  }
  async getOpportunity(id: number): Promise<Opportunity | undefined> {
    const [opportunity] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id));

    if (!opportunity) return undefined;

    const createdByUserPromise = opportunity.createdByUserId
      ? db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, opportunity.createdByUserId))
      : Promise.resolve([]);

    const assignedUserPromise = opportunity.assignedUserId
      ? db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, opportunity.assignedUserId))
      : Promise.resolve([]);

    const leadPromise = opportunity.leadId
      ? db
        .select({ name: leads.name })
        .from(leads)
        .where(eq(leads.id, opportunity.leadId))
      : Promise.resolve([]);

    const companyPromise = opportunity.customerId
      ? db
        .select({ companyName: customers.companyName })
        .from(customers)
        .where(eq(customers.id, opportunity.customerId))
      : Promise.resolve([]);

    const [[createdByUser], [assignedUser], [lead], [customer]] =
      await Promise.all([
        createdByUserPromise,
        assignedUserPromise,
        leadPromise,
        companyPromise,
      ]);

    return {
      ...opportunity,
      createdByUserName: createdByUser?.username ?? null,
      assignedUserName: assignedUser?.username ?? null,
      leadName: lead?.name ?? null,
      companyName: customer?.companyName ?? null,
    };
  }


  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const [newOpportunity] = await db.insert(opportunities).values(opportunity).returning();
    return newOpportunity;
  }

  async updateOpportunity(id: number, opportunity: Partial<InsertOpportunity>): Promise<Opportunity> {
    const [updatedOpportunity] = await db.update(opportunities).set({
      ...opportunity,
      updatedAt: new Date()
    }).where(eq(opportunities.id, id)).returning();
    return updatedOpportunity;
  }

  async deleteOpportunity(id: number): Promise<void> {
    await db.delete(opportunities).where(eq(opportunities.id, id));
  }

  async getOpportunitiesByUser(
    userId: number,
    filters: OpportunityFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<Opportunity[]> {
    // Just call the dedicated storage module
    return opportunitiesStorage.getOpportunitiesByUser(userId, filters, pagination);
  }

  async getOpportunities(
    filters: OpportunityFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<Opportunity[]> {
    // Just call the dedicated storage module
    return opportunitiesStorage.getOpportunities(filters, pagination);
  }
  async getContactsByCompany(id: number) {
    const fetchedContacts = await db.select().from(contacts).where(eq(contacts.companyId, id));
    return fetchedContacts.length > 0 ? fetchedContacts : []
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));

    if (!contact) return undefined;

    const assignedUserPromise = contact.assignedUserId
      ? db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, contact.assignedUserId))
      : Promise.resolve([]);

    const companyPromise = contact.companyId
      ? db
        .select({ companyName: customers.companyName })
        .from(customers)
        .where(eq(customers.id, contact.companyId))
      : Promise.resolve([]);

    const createdUserPromise = contact.createdByUserId
      ? db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, contact.createdByUserId))
      : Promise.resolve([]);

    const updatedUserPromise = contact.updatedByUserId
      ? db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, contact.updatedByUserId))
      : Promise.resolve([]);

    const [[assignedUser], [company], [createdUser], [updatedUser]] =
      await Promise.all([
        assignedUserPromise,
        companyPromise,
        createdUserPromise,
        updatedUserPromise,
      ]);

    return {
      ...contact,
      assignedUserName: assignedUser?.username ?? null,
      companyName: company?.companyName ?? null,
      createdUserName: createdUser?.username ?? null,
      updatedUserName: updatedUser?.username ?? null,
    };
  }


  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact> {
    const [updatedContact] = await db.update(contacts).set({
      ...contact,
      updatedAt: new Date()
    }).where(eq(contacts.id, id)).returning();
    return updatedContact;
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }


  async getContacts(
    filters: ContactFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Contact[]; totalcount: number }> {
    // console.log("storage.ts calling contactsStorage.getContacts with filters:", filters);
    // Just call the dedicated storage module
    return contactsStorage.getContacts(filters, pagination);
  }

  async getContactsByUser(
    userId: number,
    filters: ContactFilters = {}, // Add filters param
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Contact[]; totalcount: number }> {
    //  console.log(`storage.ts calling contactsStorage.getContactsByUser (User: ${userId}) with filters:`, filters);
    // Just call the dedicated storage module, passing filters
    return contactsStorage.getContactsByUser(userId, filters, pagination);
  }

  async getContactsByUserIds(
    userIds: number[],
    filters: ContactFilters = {}, // Add filters param
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ result: Contact[]; totalcount: number }> {
    //  console.log(`storage.ts calling contactsStorage.getContactsByUserIds (Users: ${userIds.join(',')}) with filters:`, filters);
    // Just call the dedicated storage module, passing filters
    return contactsStorage.getContactsByUserIds(userIds, filters, pagination);
  }


  // Task management
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db.update(tasks).set({
      ...task,
      updatedAt: new Date()
    }).where(eq(tasks.id, id)).returning();
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getTasks(
    filters: TaskFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    // console.log("storage.ts calling tasksStorage.getTasks with filters:", filters);
    // Just call the dedicated storage module
    return tasksStorage.getTasks(filters, pagination);
  }

  async getTasksByUser(
    userId: number,
    filters: TaskFilters = {}, // Add filters param
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    //  console.log(`storage.ts calling tasksStorage.getTasksByUser (User: ${userId}) with filters:`, filters);
    // Just call the dedicated storage module, passing filters
    return tasksStorage.getTasksByUser(userId, filters, pagination);
  }

  async getTasksByUserIds(
    userIds: number[],
    filters: TaskFilters = {}, // Add filters param
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    //  console.log(`storage.ts calling tasksStorage.getTasksByUserIds (Users: ${userIds.join(',')}) with filters:`, filters);
    // Just call the dedicated storage module, passing filters
    return tasksStorage.getTasksByUserIds(userIds, filters, pagination);
  }

  // Email configuration
  async getEmailConfiguration(id: number): Promise<EmailConfiguration | undefined> {
    const [config] = await db.select().from(emailConfigurations).where(eq(emailConfigurations.id, id));
    return config;
  }

  async getEmailConfigurationByUserId(userId: number): Promise<EmailConfiguration | undefined> {
    const [config] = await db.select().from(emailConfigurations).where(eq(emailConfigurations.userId, userId));
    return config;
  }

  async createEmailConfiguration(config: InsertEmailConfiguration): Promise<EmailConfiguration> {
    const [newConfig] = await db.insert(emailConfigurations).values(config).returning();
    return newConfig;
  }

  async updateEmailConfiguration(id: number, config: Partial<InsertEmailConfiguration>): Promise<EmailConfiguration> {
    const [updatedConfig] = await db.update(emailConfigurations).set(config).where(eq(emailConfigurations.id, id)).returning();
    return updatedConfig;
  }

  async deleteEmailConfiguration(id: number): Promise<void> {
    await db.delete(emailConfigurations).where(eq(emailConfigurations.id, id));
  }

  // Email management
  async getEmail(id: number): Promise<Email | undefined> {
    const [email] = await db.select().from(emails).where(eq(emails.id, id));
    return email;
  }

  async createEmail(email: InsertEmail): Promise<Email> {
    const [newEmail] = await db.insert(emails).values(email).returning();
    return newEmail;
  }

  async updateEmail(id: number, email: Partial<InsertEmail>): Promise<Email> {
    const [updatedEmail] = await db.update(emails).set(email).where(eq(emails.id, id)).returning();
    return updatedEmail;
  }

  async deleteEmail(id: number): Promise<void> {
    await db.delete(emails).where(eq(emails.id, id));
  }

  async getEmails(filters?: { userId?: number; status?: string; leadId?: number; customerId?: number }): Promise<Email[]> {
    let query = db.select().from(emails);

    if (filters?.userId) {
      query = query.where(eq(emails.userId, filters.userId));
    }

    if (filters?.status) {
      query = query.where(eq(emails.status, filters.status));
    }

    if (filters?.leadId) {
      query = query.where(eq(emails.leadId, filters.leadId));
    }

    if (filters?.customerId) {
      query = query.where(eq(emails.customerId, filters.customerId));
    }

    return await query.orderBy(desc(emails.createdAt));
  }

  // Email template management
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates).values(template).returning();
    return newTemplate;
  }

  async updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate> {
    const [updatedTemplate] = await db.update(emailTemplates).set(template).where(eq(emailTemplates.id, id)).returning();
    return updatedTemplate;
  }

  async deleteEmailTemplate(id: number): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  async getEmailTemplates(userId?: number): Promise<EmailTemplate[]> {
    let query = db.select().from(emailTemplates);

    if (userId) {
      query = query.where(eq(emailTemplates.userId, userId));
    }

    return await query.orderBy(desc(emailTemplates.createdAt));
  }

  // Activity tracking
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async getActivities(filters?: { userId?: number; entityType?: string; entityId?: number }): Promise<Activity[]> {
    let query = db.select().from(activities);

    if (filters?.userId) {
      query = query.where(eq(activities.userId, filters.userId));
    }

    if (filters?.entityType) {
      query = query.where(eq(activities.entityType, filters.entityType));
    }

    if (filters?.entityId) {
      query = query.where(eq(activities.entityId, filters.entityId));
    }

    return await query.orderBy(desc(activities.createdAt));
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting;
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    try {
      const [newMeeting] = await db.insert(meetings).values(meeting).returning();
      return newMeeting;
    } catch (error) {
      throw error;
    }
  }

  async updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting> {
    const [updatedMeeting] = await db.update(meetings).set(meeting).where(eq(meetings.id, id)).returning();
    return updatedMeeting;
  }

  async deleteMeeting(id: number): Promise<void> {
    await db.delete(meetings).where(eq(meetings.id, id));
  }

  async getMeetings(filters?: { organizedByUserId?: number; startTime?: Date; endTime?: Date }): Promise<Meeting[]> {
    let query = db.select().from(meetings);

    if (filters?.organizedByUserId) {
      query = query.where(eq(meetings.organizedByUserId, filters.organizedByUserId));
    }

    if (filters?.startTime) {
      query = query.where(gte(meetings.startTime, filters.startTime));
    }

    if (filters?.endTime) {
      query = query.where(lte(meetings.endTime, filters.endTime));
    }

    return await query.orderBy(desc(meetings.createdAt));
  }

  // Notification management
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async Notificationmarkasread(userId: number): Promise<number | undefined> {
    const updatedResults = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      )
      .returning({ updatedId: notifications.id }); // This returns an array

    // 4. Return the *count* of updated notifications, which is more useful.
    return updatedResults.length;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async updateNotification(id: number, notification: Partial<InsertNotification>): Promise<Notification> {
    const [updatedNotification] = await db.update(notifications).set(notification).where(eq(notifications.id, id)).returning();
    return updatedNotification;
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async getNotifications(userId: number, isRead?: boolean): Promise<Notification[]> {
    let query = db.select().from(notifications).where(eq(notifications.userId, userId));

    if (isRead !== undefined) {
      query = query.where(eq(notifications.isRead, isRead));
    }

    return await query.orderBy(desc(notifications.createdAt));
  }

  async getNotificationsUnread(userId: number): Promise<Notification[]> {
    const query = db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      )
      .orderBy(desc(notifications.createdAt));

    return await query;
  }

  async getNotificationsRead(userId: number): Promise<Notification[]> {
    const query = db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, true)
        )
      )
      .orderBy(desc(notifications.createdAt));

    return await query;
  }

  async getNotificationsReadWithLimit(userId: number): Promise<Notification[]> {
    const query = db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, true)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(10);

    return await query;
  }
  async getTeams() {
    console.log("Fetching all teams from the database", db.select().from(teams));
    return await db.select().from(teams);
  }
  // async getLeadsQualified(){
  //   return await db.select().from(leads).where(eq(leads.status, 'qualified'));
  // }
  // async getOpportunitiesClosedWon(){
  //   return await db.select().from(opportunities).where(eq(opportunities.isClosedWon, true));
  // }
  // async getLeadIdFromOpportunities(){
  //   return await db.select({leadId: opportunities.leadId}).from(opportunities);
  // }
  //------------Analytics Data---------------


  async getAllTeamsWithMembers() {
    const allTeams = await db.query.teams.findMany({
      with: {
        members: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                roleId: true,
                rolename: true,
                isActive: true,
                lastLogin: true,
                userType: true,
              },
            },
          },
        },
      },
    });

    return allTeams;
  }

  // async getLeadsByUsers(userIds: number[]) {

  //   return await db.query.leads.findMany({
  //     where: or(
  //       inArray(leads.createdByUserId, userIds),
  //       inArray(leads.assignedUserId, userIds)
  //     )
  //   });
  // }

  async getLeadsByUsers(
    userIds: number[],
    filters: LeadFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<Lead[]> {

    return leadsStorage.getLeadsByUsers(userIds, filters, pagination);
  }
  async createTeam(data: InsertTeam) {
    const [newTeam] = await db.insert(teams).values(data).returning();
    return newTeam;
  }
  async createMessage(data: InsertMessage) {
    const [newMessage] = await db.insert(messages).values(data).returning();
    return newMessage;
  }
  async getMessages(senderId: number, receiverId: number) {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId)),
          and(eq(messages.senderId, receiverId), eq(messages.receiverId, senderId))
        )
      )
      .orderBy(messages.createdAt);
  }

  async getLastIncomingMessage(senderId: number, receiverId: number) {
    const result = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.direction, "incoming"),
          and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId)),
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(1);

    return result[0] || null;
  }
  async getRecentMessage(senderId: number, receiverId: number) {
    const result = await db
      .select()
      .from(messages)
      .where(
        and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId)),

      )
      .orderBy(desc(messages.createdAt))
      .limit(1);

    return result[0] || null;
  }
  async getUnreadMessages(senderId: number, receiverId: number) {
    // Fetch unread messages (only wamid column)
    const unreadMessages = await db
      .select({
        wamid: messages.wamid,
      })
      .from(messages)
      .where(
        and(
          eq(messages.direction, "incoming"),
          eq(messages.senderId, senderId),
          eq(messages.receiverId, receiverId),
          eq(messages.status, 'delivered')
        )
      );

    // Extract wamid list and count
    const wamids = unreadMessages.map(msg => msg.wamid);
    const count = wamids.length;

    return { count, wamids };
  }

  async markMessagesAsRead(senderId: number, receiverId: number): Promise<{ updatedCount: number }> {
    if (!senderId || !receiverId) {
      return { updatedCount: 0 };
    }

    const result = await db
      .update(messages)
      .set({ status: "read" })
      .where(
        and(
          eq(messages.direction, "incoming"),
          eq(messages.senderId, senderId),
          eq(messages.receiverId, receiverId),
          eq(messages.status, "delivered")
        )
      );

    const updatedCount = result.rowCount ?? 0;

    return { updatedCount };
  }



  async updateMessage(id: string, data: Partial<InsertMessage>) {
    const [updated] = await db.update(messages).set(data).where(eq(messages.wamid, id)).returning();
    return updated;
  }

  // Get opportunities by a list of user IDs
  async getTeamsByUserId(userId: number) {
    // ✅ Teams where user is a member
    const memberTeams = await db.query.teamMembers.findMany({
      where: eq(teamMembers.userId, userId),
      with: {
        team: {
          with: {
            members: {
              with: {
                user: {
                  columns: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    roleId: true,
                    rolename: true,
                    isActive: true,
                    lastLogin: true,
                    userType: true,
                    isEmailNotification: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // ✅ Teams created by this user
    const createdTeams = await db.query.teams.findMany({
      where: eq(teams.createdByUserId, userId),
      with: {
        members: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                roleId: true,
                rolename: true,
                isActive: true,
                lastLogin: true,
                userType: true,
              },
            },
          },
        },
      },
    });

    // ✅ Normalize createdTeams to match the same structure as memberTeams
    const createdTeamsFormatted = createdTeams.map((t) => ({
      team: t,
    }));

    // ✅ Merge both arrays, remove duplicates if needed
    const allTeams = [
      ...memberTeams,
      ...createdTeamsFormatted.filter(
        (ct) => !memberTeams.some((mt) => mt.team.id === ct.team.id)
      ),
    ];

    return allTeams;
  }

  async getOpportunitiesByUserIds(
    userIds: number[],
    filters: OpportunityFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<Opportunity[]> {
    // Just call the dedicated storage module
    return opportunitiesStorage.getOpportunitiesByUserIds(userIds, filters, pagination);
  }

  async getTeamByName(name: string) {
    return await db.query.teams.findFirst({
      where: eq(teams.name, name),
    });
  }


  async getTeamById(id: number) {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, id),
      with: {
        members: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
                lastLogin: true,
                userType: true
              },
            },
          },
        },
        // role: true,
      },
    });
    return team;
  }
  async getAllTeams() {
    return await db.query.teams.findMany({
      with: {
        members: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
                lastLogin: true,
                userType: true
              },
            },
          },
        }
      },
    });
  }

  async updateTeam(id: number, data: Partial<InsertTeam>) {
    const [updated] = await db.update(teams).set(data).where(eq(teams.id, id)).returning();
    return updated;
  }


  async deleteTeam(id: number) {
    // remove members first to avoid FK errors
    await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
    const [deleted] = await db.delete(teams).where(eq(teams.id, id)).returning();
    return deleted;
  }
  async addTeamMember(data: InsertTeamMember) {
    const [newMember] = await db.insert(teamMembers).values(data).returning();
    return newMember;
  }


  async removeTeamMember(teamId: number, userId: number) {
    const [deleted] = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .returning();
    return deleted;
  }
  async removeTeamMembers(teamId: number, userIds: number[]) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("No userIds provided");
    }

    const deleted = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), inArray(teamMembers.userId, userIds)))
      .returning();

    return deleted;
  }
  async updateTeamMemberTeam(memberId: number, newTeamId: number) {
    const [updated] = await db
      .update(teamMembers)
      .set({ teamId: newTeamId })
      .where(eq(teamMembers.userId, memberId))
      .returning();

    return updated;
  }


  async getTeamMembers(teamId: number) {
    return await db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, teamId),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            roleId: true,
            rolename: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
            userType: true
          },
        },
      },
    });
  }

  async getDashboardStats(userId?: number): Promise<{
    totalLeads: number;
    totalCustomers: number;
    totalOpportunities: number;
    totalRevenue: number;
    conversionRate: number;
    tasksCompleted: number;
    leadChange: number;
    customerChange: number;
    opportunityChange: number;
    revenueChange: number;
    taskChange: number;
  }> {
    const currentDate = new Date();
    const lastMonth = new Date(currentDate);
    lastMonth.setMonth(currentDate.getMonth() - 1);

    const [leadsCount] = await db.select({ count: count() }).from(leads).where(ne(leads.status, 'qualified'));
    const [customersCount] = await db.select({ count: count() }).from(customers);
    const [opportunitiesCount] = await db.select({ count: count() }).from(opportunities);
    const [completedTasksCount] = await db.select({ count: count() }).from(tasks).where(eq(tasks.status, 'completed'));

    const closedOpportunities = await db
      .select({ value: opportunities.value })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.isClosedWon, true),
          lte(opportunities.createdAt, currentDate)
        )
      );
    const totalRevenue = closedOpportunities.reduce(
      (sum, opp) => sum + parseFloat(String(opp.value ?? '0')),
      0
    );

    const [convertedLeadsCount] = await db.select({ count: count() }).from(leads).where(and(eq(leads.status, 'converted'), lte(leads.createdAt, currentDate)));
    const conversionRate = leadsCount.count > 0 ? (convertedLeadsCount.count / leadsCount.count) * 100 : 0;
    const [lastMonthLeadsCount] = await db.select({ count: count() }).from(leads).where(and(lte(leads.createdAt, lastMonth), ne(leads.status, 'qualified')));
    const [lastMonthCustomersCount] = await db.select({ count: count() }).from(customers).where(lte(customers.createdAt, lastMonth));
    const [lastMonthOpportunitiesCount] = await db.select({ count: count() }).from(opportunities).where(lte(opportunities.createdAt, lastMonth));
    const [lastMonthCompletedTasksCount] = await db.select({ count: count() }).from(tasks).where(and(eq(tasks.status, 'completed'), lte(tasks.createdAt, lastMonth)));
    const lastMonthClosedOpportunities = await db.select({ value: opportunities.value }).from(opportunities).where(and(eq(opportunities.stage, 'closed'), lte(opportunities.createdAt, lastMonth)));
    const lastMonthRevenue = lastMonthClosedOpportunities.reduce((sum, opp) => sum + (parseFloat(String(opp.value || '0'))), 0);
    const leadChange = lastMonthLeadsCount.count > 0 ? ((leadsCount.count - lastMonthLeadsCount.count) / lastMonthLeadsCount.count) * 100 : 0;
    const customerChange = lastMonthCustomersCount.count > 0 ? ((customersCount.count - lastMonthCustomersCount.count) / lastMonthCustomersCount.count) * 100 : 0;
    const opportunityChange = lastMonthOpportunitiesCount.count > 0 ? ((opportunitiesCount.count - lastMonthOpportunitiesCount.count) / lastMonthOpportunitiesCount.count) * 100 : 0;
    const revenueChange = lastMonthRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    const taskChange = lastMonthCompletedTasksCount.count > 0 ? ((completedTasksCount.count - lastMonthCompletedTasksCount.count) / lastMonthCompletedTasksCount.count) * 100 : 0;

    return {
      totalLeads: leadsCount.count,
      totalCustomers: customersCount.count,
      totalOpportunities: opportunitiesCount.count,
      totalRevenue,
      conversionRate,
      tasksCompleted: completedTasksCount.count,
      leadChange,
      customerChange,
      opportunityChange,
      revenueChange,
      taskChange,
    };
  }

  async getSalesPipeline(): Promise<{ stage: string; count: number; value: number }[]> {
    const pipelineData = await db.select({
      stage: opportunities.stage,
      count: count(),
      value: opportunities.value,
    }).from(opportunities).groupBy(opportunities.stage);

    return pipelineData.map(item => ({
      stage: item.stage || 'Unknown',
      count: item.count,
      value: parseFloat(item.value || '0'),
    }));
  }

  async getLeadsToOpportunityStats(
    startDate?: Date,
    endDate?: Date,
    teamId?: number
  ): Promise<LeadsToOpportunity> {
    try {
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }
      const whereConditions: any[] = [];

      //  Handle team filtering - Get users in team
      if (teamId) {
        const teamMembers = await this.getTeamMembers(teamId);
        const userIds = teamMembers.map(member => member.userId);

        if (userIds.length > 0) {
          // Filter leads created by team users
          whereConditions.push(inArray(leads.createdByUserId, userIds));
        } else {
          return {
            totalLeads: 0,
            qualifiedLeads: 0,
            qualifiedPercentage: 0,
            period: "No team members found"
          };
        }
      }

      // Add date filters
      if (startDate && endDate) {
        whereConditions.push(gte(leads.createdAt, startDate));
        whereConditions.push(lte(leads.createdAt, endDate));
      }

      // Get total leads
      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(whereConditions.length ? and(...whereConditions) : undefined);

      const totalLeads = Number(totalResult.count);

      // Get ONLY qualified leads
      const qualifiedConditions = [...whereConditions, eq(leads.status, "qualified")];

      const [qualifiedResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(and(...qualifiedConditions));

      const qualifiedLeads = Number(qualifiedResult.count);
      const qualifiedPercentage = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;

      const period = (startDate && endDate)
        ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
        : "Overall (All Time)";

      return {
        totalLeads,
        qualifiedLeads,
        qualifiedPercentage: parseFloat(qualifiedPercentage.toFixed(2)),
        period,
      };
    } catch (error) {
      console.error('Error in getLeadsToOpportunityStats:', error);
      throw error;
    }
  }

async GetRelatedData(oppId: number) {
  try {
    // --- Fetch the opportunity first ---
    const opportunity = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, oppId))
      .limit(1);

    if (!opportunity.length) {
      throw new Error("Opportunity not found");
    }

    const opp = opportunity[0];

    // --- Fetch related entities based on the IDs ---
    const [lead, customer, contact, createdBy, assignedTo] = await Promise.all([
      opp.leadId
        ? db.select().from(leads).where(eq(leads.id, opp.leadId)).limit(1)
        : Promise.resolve([]),
      opp.customerId
        ? db.select().from(customers).where(eq(customers.id, opp.customerId)).limit(1)
        : Promise.resolve([]),
      opp.associatedContact
        ? db.select().from(contacts).where(eq(contacts.id, opp.associatedContact)).limit(1)
        : Promise.resolve([]),
      opp.createdByUserId
        ? db.select().from(users).where(eq(users.id, opp.createdByUserId)).limit(1)
        : Promise.resolve([]),
      opp.assignedUserId
        ? db.select().from(users).where(eq(users.id, opp.assignedUserId)).limit(1)
        : Promise.resolve([]),
    ]);

    // --- Combine all related data ---
    return {
      opportunity: opp,
      lead: lead[0] || null,
      customer: customer[0] || null,
      contact: contact[0] || null,
      createdBy: createdBy[0] || null,
      assignedTo: assignedTo[0] || null,
    };
  } catch (error) {
    console.error("Error fetching related data:", error);
    throw new Error("Failed to fetch related data");
  }
}



  async getOpportunityToCustomer(
    startDate?: Date,
    endDate?: Date,
    teamId?: number
  ): Promise<OpportunityToCustomer> {
    try {
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }
      const whereConditions: any[] = [];

      //  Handle team filtering
      if (teamId) {
        const teamMembers = await this.getTeamMembers(teamId);
        const userIds = teamMembers.map(member => member.userId);

        if (userIds.length > 0) {
          whereConditions.push(inArray(opportunities.createdByUserId, userIds));
        } else {
          return {
            totalOpportunities: 0,
            closedWonOpportunities: 0,
            closedWonPercentage: 0,
            period: "No team members found"
          };
        }
      }

      // Add date filters
      if (startDate && endDate) {
        whereConditions.push(gte(opportunities.createdAt, startDate));
        whereConditions.push(lte(opportunities.createdAt, endDate));
      }

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(whereConditions.length ? and(...whereConditions) : undefined);

      const totalOpportunities = Number(totalResult.count);

      const closedWonConditions = [...whereConditions, eq(opportunities.isClosedWon, true)];

      const [closedWonResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(closedWonConditions.length ? and(...closedWonConditions) : undefined);

      const closedWonOpportunities = Number(closedWonResult.count);

      const closedWonPercentage = totalOpportunities > 0
        ? (closedWonOpportunities / totalOpportunities) * 100
        : 0;

      const period = (startDate && endDate)
        ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
        : "Overall (All Time)";

      return {
        totalOpportunities,
        closedWonOpportunities,
        closedWonPercentage: parseFloat(closedWonPercentage.toFixed(2)),
        period,
      };
    } catch (error) {
      console.error("Error in getOpportunityToCustomer:", error);
      throw error;
    }
  }

  async getLeadToCustomerConversion(
    startDate?: Date,
    endDate?: Date,
    teamId?: number  //  Add teamId parameter
  ): Promise<LeadToCustomerConversionStats> {
    try {
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }
      const whereConditions: any[] = [];

      //  Handle team filtering
      if (teamId) {
        const teamMembers = await this.getTeamMembers(teamId);
        const userIds = teamMembers.map(member => member.userId);

        if (userIds.length > 0) {
          whereConditions.push(inArray(leads.createdByUserId, userIds));
        } else {
          return {
            totalLeads: 0,
            qualifiedClosedWonLeads: 0,
            conversionPercentage: 0,
            period: "No team members found"
          };
        }
      }

      // Add date filters
      if (startDate && endDate) {
        whereConditions.push(gte(leads.createdAt, startDate));
        whereConditions.push(lte(leads.createdAt, endDate));
      }

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(whereConditions.length ? and(...whereConditions) : undefined);

      const totalLeads = Number(totalResult.count);

      const qualifiedClosedWonConditions: any[] = [
        eq(leads.status, 'qualified'),
        eq(opportunities.isClosedWon, true),
      ];

      // Add team filter for the join query
      if (teamId) {
        const teamMembers = await this.getTeamMembers(teamId);
        const userIds = teamMembers.map(member => member.userId);
        if (userIds.length > 0) {
          qualifiedClosedWonConditions.push(inArray(leads.createdByUserId, userIds));
        }
      }

      if (startDate && endDate) {
        qualifiedClosedWonConditions.push(gte(leads.createdAt, startDate));
        qualifiedClosedWonConditions.push(lte(leads.createdAt, endDate));
      }

      const [qualifiedClosedWonResult] = await db
        .select({ count: sql<number>`count(distinct ${leads.id})` })
        .from(leads)
        .innerJoin(opportunities, eq(leads.id, opportunities.leadId))
        .where(and(...qualifiedClosedWonConditions));

      const qualifiedClosedWonLeads = Number(qualifiedClosedWonResult.count);

      const conversionPercentage = totalLeads > 0
        ? (qualifiedClosedWonLeads / totalLeads) * 100
        : 0;

      const period = (startDate && endDate)
        ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
        : "Overall (All Time)";

      return {
        totalLeads,
        qualifiedClosedWonLeads,
        conversionPercentage: parseFloat(conversionPercentage.toFixed(2)),
        period,
      };

    } catch (error) {
      console.error('Error in getLeadToCustomerConversion:', error);
      throw error;
    }
  }
  // ...existing code...

  // Move this function INSIDE the DatabaseStorage class
  async getUsersAnalytics(
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ users: UserAnalytics[]; totalCount: number }> {
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(users);

    const totalCount = totalResult[0]?.count ?? 0;

    // Get paginated results with analytics data
    const results = await db
      .select({
        userId: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
        userType: users.userType,
        totalLeadsCreated: sql<number>`
          COUNT(DISTINCT CASE WHEN ${leads.createdByUserId} = ${users.id} THEN ${leads.id} END)
        `.mapWith(Number),
        totalLeadsAssigned: sql<number>`
          COUNT(DISTINCT CASE WHEN ${leads.assignedUserId} = ${users.id} THEN ${leads.id} END)
        `.mapWith(Number),
        totalTasksAssigned: sql<number>`
          COUNT(DISTINCT CASE WHEN ${tasks.assignedUserId} = ${users.id} THEN ${tasks.id} END)
        `.mapWith(Number),
        opportunitiesCreated: sql<number>`
          COUNT(DISTINCT CASE WHEN ${opportunities.createdByUserId} = ${users.id} THEN ${opportunities.id} END)
        `.mapWith(Number),
        opportunitiesAssigned: sql<number>`
          COUNT(DISTINCT CASE WHEN ${opportunities.assignedUserId} = ${users.id} THEN ${opportunities.id} END)
        `.mapWith(Number),
        customerAssigned: sql<number>`
          COUNT(DISTINCT CASE WHEN ${customers.assignedUserId} = ${users.id} THEN ${customers.id} END)
        `.mapWith(Number),
        tasksAssigned: sql<number>`
          COUNT(DISTINCT CASE WHEN ${tasks.assignedUserId} = ${users.id} THEN ${tasks.id} END)
        `.mapWith(Number),
        tasksCreated: sql<number>`
          COUNT(DISTINCT CASE WHEN ${tasks.createdByUserId} = ${users.id} THEN ${tasks.id} END)
        `.mapWith(Number),
      })
      .from(users)
      .leftJoin(leads, or(
        eq(leads.createdByUserId, users.id),
        eq(leads.assignedUserId, users.id)
      ))
      .leftJoin(opportunities, or(
        eq(opportunities.createdByUserId, users.id),
        eq(opportunities.assignedUserId, users.id)
      ))
      .leftJoin(customers, eq(customers.assignedUserId, users.id))
      .leftJoin(tasks, or(
        eq(tasks.assignedUserId, users.id),
        eq(tasks.createdByUserId, users.id)
      ))
      .groupBy(
        users.id,
        users.username,
        users.firstName,
        users.lastName,
        users.avatar,
        users.userType
      )
      .limit(limitValue)
      .offset(offsetValue);

    return {
      users: results,
      totalCount,
    };
  }
}
export const storage = new DatabaseStorage();