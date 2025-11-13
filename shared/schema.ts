import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, date, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  roleId: integer("role_id").references(() => roles.id),
  rolename: text("role_name"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userType: text("user_type").$type<"associate" | "manager" | "team-lead" | "admin">().default("associate"),
  avatar: text("avatar"),
  isEmailNotification: boolean("is_email_notification").default(true)
});
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  roleId: integer("role_id").references(() => roles.id), //  each team has a role
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  avatar: text("avatar"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
});

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));
export const teamsRelations = relations(teams, ({ one, many }) => ({
  role: one(roles, {
    fields: [teams.roleId],
    references: [roles.id],
  }),
  createdByUser: one(users, {
    fields: [teams.createdByUserId],
    references: [users.id],
  }),
  members: many(teamMembers), // all users in this team
}));



export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  roleType: text("role_type").$type<"associate" | "manager" | "team-lead" | "none">().default("none"),
});

export const customers = pgTable("customers", {
  // NOTE: Customer model for persistence. For the "Add Client" feature:
  // - Add a corresponding InsertCustomer / CreateCustomer TypeScript type or Zod schema
  //   (e.g. `insertCustomerSchema`) for validating API input.
  // - Ensure the frontend uses a matching DTO when POSTing to `/api/customers`.
  // - Keep denormalized fields (assignedUserName, createdByUserName) in sync when creating.
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  annualRevenue: doublePrecision("annual_revenue"),
  city: text("city"),
  country: text("country"),
  daysToClose: integer("days_to_close"),
  description: text("description"),
  facebookPage: text("facebook_page"),
  industry: text("industry"),
  lifecycleStage: text("lifecycle_stage"),
  linkedInHandle: text("linkedin_handle"),
  numOfContacts: integer("num_of_contacts"),
  numOfEmployees: integer("num_of_employees"),
  numOfTimesContacted: integer("num_of_times_contacted"),
  originalSource: text("original_source"),
  parentCompany: text("parent_company"),
  postalCode: text("postal_code"),
  state: text("state"),
  street: text("street"),
  timeZone: text("time_zone"),
  twitterHandle: text("twitter_handle"),
  webTechnologies: text("web_technologies"),
  yearFounded: integer("year_founded"),
  notes: text("notes"),
  assignedUserId: integer("assigned_user_id"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdByUserName: text("created_by_user_name"),
  assignedUserName: text("assigned_user_name"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  customerFiles: text("customer_files").array().default([]),

  totalcount: integer("total_count").default(0),
  avatar: text("avatar"),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  probability: integer("probability").default(0),
  customerId: integer("customer_id").references(() => customers.id),
  contactId: integer("contact_id").references(() => contacts.id),
  source: text("source"),
  status: text("status").default("new"),
  value: decimal("value", { precision: 10, scale: 2 }),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  notes: text("notes"),
  tags: text("tags").array().default([]),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  companyName: text("company_name").notNull(),
  pointOfContactFirstName: text("first_name").notNull(),
  pointOfContactLastName: text("last_name"),
  websiteUrl: text("website_url"),
  countryRegion: text("country_region"),
  timeZone: text("time_zone"),
  assignedUserName: text("assigned_user_name"),
  createdByUserName: text("created_by_user_name"),
  rsp: boolean("rsp").default(false).notNull(),
  rspFiles: text("rsp_files").array().default([]),
  totalcount: integer("total_count").default(0)
});

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  value: integer("value").default(0),
  stage: text("stage").default("initial Stage"),
  tags: text("tags").array().default([]),
  type: text("type"),
  expectedCloseDate: date("expected_close_date"),
  actualCloseDate: timestamp("actual_close_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  ownerAssignedDate: timestamp("owner_assigned_date"),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  leadId: integer("lead_id").references(() => leads.id),
  customerId: integer("customer_id").references(() => customers.id),
  isClosedLost: boolean("is_closed_lost").default(false),
  isClosedWon: boolean("is_closed_won").default(false),
  isDealClosed: boolean("is_deal_closed").default(false),
  lastContacted: timestamp("last_contacted"),
  latestTrafficSource: text("latest_traffic_source"),
  nextStep: text("next_step"),
  numberOfAssociatedContacts: integer("number_of_associated_contacts").default(0),
  numberOfSalesActivities: integer("number_of_sales_activities").default(0),
  numberOfTimesContacted: integer("number_of_times_contacted").default(0),
  pipeline: text("pipeline"),
  priority: text("priority"),
  associatedTask: integer("associated_task"),
  associatedNote: text("associated_note"),
  associatedContact: integer("associated_contact").references(() => contacts.id),
  createdByUserName: text("created_by_user_name"),
  assignedUserName: text("assigned_user_name"),
  leadName: text("lead_name"),
  companyName: text("company_name"),
  associatedContactName: text("associated_contact_name"),
  opportunityFiles: text("opportunity_files").array().default([]),

  totalcount: integer("total_count").default(0)
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  assignedUserName: text("assigned_user_name"), // for ts
  companyId: integer("company_id").references(() => customers.id),
  companyName: text("company_name"), // for ts
  companyWebsite: text("company_website"),
  contactUnworked: boolean("contact_unworked"),
  countryRegion: text("country_region"),
  createDate: timestamp("create_date"),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdUserName: text("created_user_name"), // for ts
  email: text("email"),
  employmentRole: text("employment_role"),
  gender: text("gender"),
  industry: text("industry"),
  jobTitle: text("job_title"),
  lastModifiedDate: timestamp("last_modified_date"),
  latestTrafficSource: text("latest_traffic_source"),
  linkedinProfile: text("linkedin_profile"),
  linkedinUrl: text("linkedin_url"),
  listName: text("list_name"),
  marketingContactStatus: text("marketing_contact_status"),
  numberOfSalesActivities: integer("number_of_sales_activities"),
  numberOfTimesContacted: integer("number_of_times_contacted"),
  phone: text("phone"),
  postalCode: text("postal_code"),
  timeZone: text("time_zone"),
  updatedByUserId: integer("updated_by_user_id"),
  updatedUserName: text("updated_user_name"),// for ts
  websiteUrl: text("website_url"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  totalcount: integer("total_count").default(0),
  avatar: text("avatar"),

});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("pending"),
  priority: text("priority").default("medium"),
  dueDate: date("due_date"),
  completedDate: date("completed_date"),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  assignedUseName: text("assigned_user_name"), // for ts
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdUserName: text("created_user_name"), // for ts
  leadId: integer("lead_id").references(() => leads.id),
  customerId: integer("customer_id").references(() => customers.id),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  opportunityName: text("opportunityName"), // Add this
  leadName: text("leadName"),        // Add this
  customerName: text("customerName"),

  duration: integer("duration"), // e.g., number of hours
 attachments: jsonb("attachments").$type<string[]>().default([]), // store file URLs or metadata
  labels: jsonb("labels").$type<string[]>(), // array of string // comma-separated labels
  effort: integer("effort"), // estimated effort hours
  dependencies: text("dependencies"), // comma-separated task IDs or names
  notes: text("notes"),
 checklist: jsonb("checklist").$type<{ text: string; status: "pending" | "done" | "in_progress" }[]>(),
 // list of checklist items


  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  totalcount: integer("total_count").default(0)
});

export const emailConfigurations = pgTable("email_configurations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  provider: text("provider").notNull(),
  email: text("email").notNull(),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull(),
  imapHost: text("imap_host"),
  imapPort: integer("imap_port"),
  username: text("username").notNull(),
  password: text("password").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email").notNull(),
  ccEmail: text("cc_email"),
  bccEmail: text("bcc_email"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  isHtml: boolean("is_html").default(false),
  status: text("status").default("draft"),
  sentAt: timestamp("sent_at"),
  scheduledAt: timestamp("scheduled_at"),
  templateId: integer("template_id").references(() => emailTemplates.id),
  leadId: integer("lead_id").references(() => leads.id),
  customerId: integer("customer_id").references(() => customers.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  isHtml: boolean("is_html").default(false),
  variables: jsonb("variables").$type<string[]>().default([]),
  userId: integer("user_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  attendees: jsonb("attendees").$type<string[]>().default([]),
  organizedByUserId: integer("organized_by_user_id").references(() => users.id),
  leadId: integer("lead_id").references(() => leads.id),
  contactId: integer("contact_id").references(() => contacts.id),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),

  // 'Date and Time' column
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),

  // 'Performed by' columns
  performed: text("performed"),

  // 'Activity' column (merged from action and entity)
  activity: text("activity"), // e.g., "CREATE Lead", "DELETE Task"

  // 'Description' column
  description: text("description"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info"),
  isRead: boolean("is_read").default(false),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  assignedLeads: many(leads),
  assignedCustomers: many(customers),
  assignedOpportunities: many(opportunities),
  assignedTasks: many(tasks),
  createdTasks: many(tasks),
  emailConfigurations: many(emailConfigurations),
  emails: many(emails),
  emailTemplates: many(emailTemplates),
  activities: many(activities),
  organizedMeetings: many(meetings),
  notifications: many(notifications),
}));

// export const messages = pgTable("messages", {
//   id: serial("id").primaryKey(),
//   senderId: integer("sender_id")
//     .references(() => users.id)
//     .notNull(),
//   receiverId: integer("receiver_id")
//     .references(() => customers.id)
//     .notNull(),
//   content: text("content").notNull(),
//   messageType: text("message_type").$type<"text" | "image" | "template">().default("text"),
//   direction: text("direction").$type<"incoming" | "outgoing">().notNull(),
//   status: text("status").$type<"sent" | "delivered" | "read" | "failed">().default("sent"),
//   clientId: text("client_id"), // for frontend temp messages
//   wamid: text("wamid"), // for frontend temp messages
//   createdAt: timestamp("created_at").defaultNow(),
//   updatedAt: timestamp("updated_at").defaultNow(),
// });
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id")
    .references(() => users.id)
    .notNull(),
  receiverId: integer("receiver_id")
    .references(() => customers.id)
    .notNull(),
  content: text("content"),
  messageType: text("message_type")
    .$type<"text" | "image" | "video" | "audio" | "document" | "sticker" | "template">()
    .default("text"),
  mediaUrl: text("media_url"),
  mediaMimeType: text("media_mime_type"),
  mediaId: text("media_id"),
  caption: text("caption"),
  direction: text("direction").$type<"incoming" | "outgoing">().notNull(),
  status: text("status")
    .$type<"sent" | "delivered" | "read" | "failed">()
    .default("sent"),
  clientId: text("client_id"),
  wamid: text("wamid"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(customers, {
    fields: [messages.receiverId],
    references: [customers.id],
  }),
}));



export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [customers.assignedUserId],
    references: [users.id],
  }),
  leads: many(leads),
  opportunities: many(opportunities),
  contacts: many(contacts),
  tasks: many(tasks),
  emails: many(emails),
  meetings: many(meetings),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [leads.assignedUserId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [leads.customerId],
    references: [customers.id],
  }),
  opportunities: many(opportunities),
  tasks: many(tasks),
  emails: many(emails),
  meetings: many(meetings),
}));

export const opportunitiesRelations = relations(opportunities, ({ one, many }) => ({
  lead: one(leads, {
    fields: [opportunities.leadId],
    references: [leads.id],
  }),
  customer: one(customers, {
    fields: [opportunities.customerId],
    references: [customers.id],
  }),
  assignedUser: one(users, {
    fields: [opportunities.assignedUserId],
    references: [users.id],
  }),
  tasks: many(tasks),
  meetings: many(meetings),
}));

// export const contactsRelations = relations(contacts, ({ one }) => ({
//   customer: one(customers, {
//     fields: [contacts.customerId],
//     references: [customers.id],
//   }),
// }));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignedUser: one(users, {
    fields: [tasks.assignedUserId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [tasks.createdByUserId],
    references: [users.id],
  }),
  lead: one(leads, {
    fields: [tasks.leadId],
    references: [leads.id],
  }),
  customer: one(customers, {
    fields: [tasks.customerId],
    references: [customers.id],
  }),
  opportunity: one(opportunities, {
    fields: [tasks.opportunityId],
    references: [opportunities.id],
  }),
}));

export const emailConfigurationsRelations = relations(emailConfigurations, ({ one }) => ({
  user: one(users, {
    fields: [emailConfigurations.userId],
    references: [users.id],
  }),
}));

export const emailsRelations = relations(emails, ({ one }) => ({
  template: one(emailTemplates, {
    fields: [emails.templateId],
    references: [emailTemplates.id],
  }),
  lead: one(leads, {
    fields: [emails.leadId],
    references: [leads.id],
  }),
  customer: one(customers, {
    fields: [emails.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [emails.userId],
    references: [users.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one, many }) => ({
  user: one(users, {
    fields: [emailTemplates.userId],
    references: [users.id],
  }),
  emails: many(emails),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const meetingsRelations = relations(meetings, ({ one }) => ({
  organizedByUser: one(users, {
    fields: [meetings.organizedByUserId],
    references: [users.id],
  }),
  lead: one(leads, {
    fields: [meetings.leadId],
    references: [leads.id],
  }),
  contact: one(contacts, {
    fields: [meetings.contactId],
    references: [contacts.id],
  }),
  opportunity: one(opportunities, {
    fields: [meetings.opportunityId],
    references: [opportunities.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOpportunitySchema = createInsertSchema(opportunities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailConfigurationSchema = createInsertSchema(emailConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  createdAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
});
export const insertMessageSchema = createInsertSchema(messages)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    direction: z.enum(["incoming", "outgoing"]),
    status: z.enum(["sent", "delivered", "read", "failed"]).optional(),
    messageType: z.enum(["text", "media", "template"]).optional(),
  });




export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type EmailConfiguration = typeof emailConfigurations.$inferSelect;
export type InsertEmailConfiguration = z.infer<typeof insertEmailConfigurationSchema>;
export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type UserType = "associate" | "manager" | "team-lead" | "admin";
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageWithMembers = Message & {
  sender: User;
  receiver: User;
};
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamWithMembers = Team & {
  members: (TeamMember & { user: User })[];
};

