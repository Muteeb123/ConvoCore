import {
  eq,
  or,
  and,
  desc,
  inArray,
  sql,
  gte,
  lte,
  ilike, // For case-insensitive search
  SQL, // Type for SQL fragments
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core"; // Use pg-core alias for PostgreSQL
import { db } from "./db"; // Assuming your db export is here
import {
  tasks,
  users,
  leads,
  customers,
  opportunities,
  type Task,
} from "@shared/schema"; // Assuming your schema is here

// --- 1. Define the Filters Interface ---
// Includes search and existing filters
export interface TaskFilters {
  search?: string;
  assignedUserId?: number; // Keep existing filters
  status?: string;
  dueDate?: Date;
}

/**
 * Encapsulates database logic for fetching and filtering Tasks.
 */
class TasksStorage {
  // Aliases for consistent joins when fetching related names
  private assignedUserAlias = alias(users, "assignedUser_tasks"); // Use unique aliases
  private createdUserAlias = alias(users, "createdUser_tasks");

  /**
   * [HELPER] Builds dynamic WHERE conditions for task filtering, including search.
   * Returns an SQL object or undefined.
   */
  private buildWhereConditions(
    filters: TaskFilters,
    baseConditions?: SQL | SQL[]
  ): SQL | undefined {
    // Explicit return type
    console.log(
      "[tasks.storage.ts] Building WHERE conditions from filters:",
      filters
    );
    const conditions: SQL[] = Array.isArray(baseConditions)
      ? [...baseConditions]
      : baseConditions
      ? [baseConditions]
      : [];

    // Search Term - searches title, description, priority, status, assigned/created user names, related names
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      // --- 👇 Collect search conditions safely 👇 ---
      const searchConditions: SQL[] = [];

      // Add conditions for columns guaranteed to exist
      searchConditions.push(ilike(tasks.title, searchPattern));
      searchConditions.push(ilike(tasks.description, searchPattern));
      searchConditions.push(ilike(tasks.priority, searchPattern));
      searchConditions.push(ilike(tasks.status, searchPattern));
      // Add conditions for aliased columns (require joins in main query)
      searchConditions.push(
        ilike(this.assignedUserAlias.username, searchPattern)
      );
      searchConditions.push(
        ilike(this.createdUserAlias.username, searchPattern)
      );
      // Add conditions for related tables (require joins in main query)
      searchConditions.push(ilike(leads.name, searchPattern));
      searchConditions.push(ilike(customers.companyName, searchPattern));
      searchConditions.push(ilike(opportunities.name, searchPattern));

      // Only add the OR condition if there are conditions inside it
      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions));
      }
      // --- End safe search conditions ---
    }

    // Existing Filters
    if (filters.assignedUserId) {
      conditions.push(eq(tasks.assignedUserId, filters.assignedUserId));
    }
    // Handle specific status from tabs or 'all'/'my-tasks' (which don't filter by status here)
    if (
      filters.status &&
      !["all", "my-tasks", "overdue"].includes(filters.status)
    ) {
      // Map frontend 'in-progress' to backend 'in_progress' if needed
      const dbStatus =
        filters.status === "in-progress" ? "in_progress" : filters.status;
      conditions.push(eq(tasks.status, dbStatus));
    } else if (filters.status === "overdue") {
      // Specific condition for overdue tasks
      conditions.push(sql`${tasks.dueDate} < ${new Date()}`);
      conditions.push(sql`${tasks.status} != 'completed'`); // Exclude completed
    }

    if (filters.dueDate) {
      // Using lte as in original code, adjust if exact date match is needed
      conditions.push(lte(tasks.dueDate, filters.dueDate));
    }

    // Return combined conditions using AND, or undefined if no conditions
    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Executes the main task query with filters and pagination.
   * Returns both the paginated results and the total count.
   */
  private async executeTaskQuery(
    finalWhere: SQL | undefined,
    pagination: { limit: number; offset: number }
  ): Promise<{
    results: any[];
    totalcount: number;
    statusCounts: Record<string, number>;
  }> {
    // --- Query for Status Counts (WITH filters applied) ---
    const statusCountResult = await db
      .select({
        status: tasks.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(tasks)
      // --- 👇 Include ALL necessary joins for filtering/search 👇 ---
      .leftJoin(leads, eq(tasks.leadId, leads.id))
      .leftJoin(customers, eq(tasks.customerId, customers.id))
      .leftJoin(opportunities, eq(tasks.opportunityId, opportunities.id))
      .leftJoin(
        this.assignedUserAlias,
        eq(tasks.assignedUserId, this.assignedUserAlias.id)
      )
      .leftJoin(
        this.createdUserAlias,
        eq(tasks.createdByUserId, this.createdUserAlias.id)
      )
      .where(finalWhere) // Apply the same filters
      .groupBy(tasks.status);

    const allStatuses = [
      "pending",
      "in_progress",
      "completed",
      "cancelled" /* Add 'overdue' if backend calculates it? */,
    ];
    const statusCounts = Object.fromEntries(
      allStatuses.map((status) => {
        const found = statusCountResult.find((r) => r.status === status);
        return [status, found ? found.count : 0];
      })
    );
    // Calculate total from status counts (consistent with filtered data)
    const totalcount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    // Note: If 'overdue' needs a separate count based on date, that logic needs to be added here or passed from frontend.
    // For now, it relies on the status filter logic in buildWhereConditions.

    // --- Main Data Query (WITH filters AND pagination) ---
    let results: any[] = [];
    if (totalcount > 0 || pagination.offset === 0) {
      results = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          completedDate: tasks.completedDate,
          assignedUserId: tasks.assignedUserId,
          createdByUserId: tasks.createdByUserId,
          leadId: tasks.leadId,
          customerId: tasks.customerId,
          opportunityId: tasks.opportunityId,

          // 👇 Add all these missing fields
          duration: tasks.duration,
          effort: tasks.effort,
          dependencies: tasks.dependencies,
          notes: tasks.notes,
          checklist: tasks.checklist,
          labels: tasks.labels,
          attachments: tasks.attachments,
          totalcount: tasks.totalcount,

          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,

          // Joined names
          leadName: leads.name,
          customerName: customers.companyName,
          opportunityName: opportunities.name,
          assignedUserName: this.assignedUserAlias.username,
          createdUserName: this.createdUserAlias.username,
        })
        .from(tasks)
        .leftJoin(leads, eq(tasks.leadId, leads.id))
        .leftJoin(customers, eq(tasks.customerId, customers.id))
        .leftJoin(opportunities, eq(tasks.opportunityId, opportunities.id))
        .leftJoin(
          this.assignedUserAlias,
          eq(tasks.assignedUserId, this.assignedUserAlias.id)
        )
        .leftJoin(
          this.createdUserAlias,
          eq(tasks.createdByUserId, this.createdUserAlias.id)
        )
        .where(finalWhere)
        .orderBy(desc(tasks.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);
    }

    console.log(
      `[tasks.storage.ts] executeTaskQuery: Found ${totalcount} total, returning ${results.length} for page.`
    );
    // Add totalcount and statusCounts to each result row for frontend convenience
    const resultsWithCounts = results.map((task) => ({
      ...task,
      // Add null checks for safety before accessing properties
      leadName: task.leadName ?? null,
      customerName: task.customerName ?? null,
      opportunityName: task.opportunityName ?? null,
      assignedUserName: task.assignedUserName ?? null,
      createdUserName: task.createdUserName ?? null,
      totalcount: totalcount,
      statusCounts: statusCounts,
    }));

    return { results: resultsWithCounts, totalcount, statusCounts }; // Also return counts separately if needed
  }

  // --- PUBLIC METHODS ---

  /**
   * Fetches paginated/filtered list of all tasks (Admin).
   */
  async getTasks(
    filters: TaskFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    // Return type matches old function for now
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;
    const finalWhere = this.buildWhereConditions(filters); // No base conditions for admin

    const { results } = await this.executeTaskQuery(finalWhere, {
      limit: limitValue,
      offset: offsetValue,
    });
    return results; // Return the array of tasks with counts attached
  }

  /**
   * Fetches paginated/filtered tasks for a specific user (created or assigned).
   */
  async getTasksByUser(
    userId: number,
    filters: TaskFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    // Return type matches old function
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;

    // Base user condition
    const baseCondition = or(
      eq(tasks.assignedUserId, userId),
      eq(tasks.createdByUserId, userId)
    );
    const finalWhere = this.buildWhereConditions(filters, baseCondition); // Pass base condition

    const { results } = await this.executeTaskQuery(finalWhere, {
      limit: limitValue,
      offset: offsetValue,
    });
    return results;
  }

  /**
   * Fetches paginated/filtered tasks for multiple users (Manager/Team Lead).
   */
  async getTasksByUserIds(
    userIds: number[],
    filters: TaskFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    // Return type matches old function
    if (!userIds || userIds.length === 0) {
      console.warn("getTasksByUserIds called with empty userIds array.");
      return []; // Return empty array consistent with return type
    }
    const limitValue = pagination.limit ?? 25;
    const offsetValue = pagination.offset ?? 0;

    // Base user condition
    const baseCondition = or(
      inArray(tasks.assignedUserId, userIds),
      inArray(tasks.createdByUserId, userIds)
    );
    const finalWhere = this.buildWhereConditions(filters, baseCondition); // Pass base condition

    const { results } = await this.executeTaskQuery(finalWhere, {
      limit: limitValue,
      offset: offsetValue,
    });
    return results;
  }
}

// Export a singleton instance
export const tasksStorage = new TasksStorage();
