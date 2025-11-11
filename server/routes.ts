import type { Express } from "express";
import express, { Request, Response } from 'express';
import { createServer, METHODS, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { emailService } from "./services/emailService";
import { notificationService } from "./services/notificationService";
import { Router } from "express";
import { insertLeadSchema, insertCustomerSchema, insertOpportunitySchema, insertContactSchema, insertTaskSchema, insertEmailConfigurationSchema, insertEmailSchema, insertEmailTemplateSchema, insertMeetingSchema, insertRoleSchema, Opportunity, TeamWithMembers, Team, InsertMessage } from "@shared/schema";
import { z } from "zod";
import { clsx } from 'clsx';
import nodemailer from 'nodemailer';
import { db } from "./db.js";
import { customers } from "../shared/schema.js";
import uploadMiddleware from "./controllers/uploadMiddleware.js";
import { insertCustomersFromCSV } from "./controllers/insertCustomersFromCSV.js";
import { insertLeadsFromCSV } from "./controllers/insertLeadsFromCSV.js";
import { insertOpportunitiesFromCSV } from "./controllers/insertOpportunityFromCSV.js";
import { insertContactsFromCSV } from "./controllers/insertContactFromCSV.js";
import { User, users } from '../shared/schema';
import { GoogleAuthService } from "./services/googleAuthService";
import logRequests from "./logger/logRequests.js";
import { listLogs, downloadLog } from "./config/Storagedilelogsfrontend.js";
import multer from "multer";
import { deleteFilesFromGCP, downloadFileFromGCP, listFilesFromGCP, uploadCustomerFiles, uploadOpportunityFiles, uploadFilesToGCP, listgcpfiles, uploadMessageMedia } from "./config/uploadFiles.ts";
import { FILE } from "dns";
import { activityLogs } from "@shared/schema";
import { EventEmitter } from "events";
import jwt from 'jsonwebtoken';
import { desc, count } from "drizzle-orm";
import { sendMediaMessage, uploadMedia } from "./config/whatsapp.ts";
import { sql, eq } from "drizzle-orm";
import { sendTemplateMessage } from "./config/whatsapp.ts";
import { KJUR } from "jsrsasign";
import { deleteAvatar, getFallbackProfilePic, getProfilePic, uploadCustomerProfile, uploadFallback, uploadProfile } from "./config/avatar.ts";
import { eventNotificationService } from "./services/eventNotificationService";
import { getAIAnalytics } from "./aiData/aiAnalyticsController.js";
// In-memory meeting state for waiting room and approvals
type JoinRequest = { id: string; name: string; createdAt: number };
type MeetingState = { pending: JoinRequest[]; approvals: Map<string, string>; ended: boolean };
const meetings = new Map<string, MeetingState>();



function getMeeting(slug: string): MeetingState {
  let m = meetings.get(slug);
  if (!m) {
    m = { pending: [], approvals: new Map(), ended: false };
    meetings.set(slug, m);
  }
  return m;
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export function registerRoutes(app: Express): Server {

  const chatEmitter = new EventEmitter();
  const WA_API_URL = `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`;
  const upload = multer({ storage: multer.memoryStorage() });
  setupAuth(app);

  // Webhook routes - must be public (no authentication required)
  app.get("/api/webhook", (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expectedToken = process.env.VERIFY_TOKEN;

    console.log(`Webhook verification - mode: ${mode || 'none'}, token: ${token || 'none'}, challenge: ${challenge || 'none'}`);
    console.log(`Expected token from env: ${expectedToken ? 'set' : 'NOT SET'}`);

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('Webhook verification successful');
      res.status(200).send(challenge);
    } else {
      console.log(`Webhook verification failed - mode: ${mode}, token match: ${token === expectedToken}`);
      res.sendStatus(403);
    }
  });
  app.post("/api/webhook", async (req, res) => {
    const { entry } = req.body;

    if (!entry || entry.length === 0) return res.status(400).send("empty entry array");
    const changes = entry[0].changes;
    if (!changes || changes.length === 0) return res.status(400).send("empty changes array");

    const statuses = changes[0].value.statuses?.[0];
    const messages = changes[0].value.messages?.[0];

    //  Handle message status updates
    if (statuses) {
      console.log('the statuses are ............           ..............   ', statuses)
      console.log(`.............MESSAGE STATUS UPDATE: ${statuses.status}`);
      const savedMessage = await storage.updateMessage(statuses.id, { status: statuses.status });
      console.log('....********...the saved message is ', JSON.stringify(savedMessage))
      chatEmitter.emit("status", statuses);
    }

    //  Handle new incoming messages
    if (messages) {
      console.log("Incoming message:", messages);

      const fromPhone = messages.from;
      const customer = await storage.getCustomerbyPhone(fromPhone);
      if (!customer) console.warn(" Unknown sender, saving as new customer");

      const receiversUsername = customer?.createdByUserName;
      const receiver = receiversUsername ? await storage.getUserByUsername(receiversUsername) : null;

      if (!customer?.id) return res.sendStatus(200);

      // MESSAGE
      if (messages.type === "text") {
        const text = messages.text?.body;
        const messageToStore: any = {
          senderId: receiver?.id,
          receiverId: customer?.id,
          content: text,
          direction: "incoming",
          status: "delivered",
          messageType: "text",
          clientId: messages.id,
          wamid: messages.id,
        };

        await storage.createMessage(messageToStore);
        chatEmitter.emit("message", messages);
      }
      //media
      else {
        try {
          const mediaObj = messages.image || messages.video || messages.audio || messages.document;
          const mediaId = mediaObj.id;
          const caption = mediaObj.caption || "";
          const mediaType = messages.type;

          if (!mediaObj) {
            console.log('unknown media type recieved!!!!');
            return

          }

          // 1) Fetch media metadata (gives URL + mime_type)
          const mediaMetaRes = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, {
            headers: { Authorization: `Bearer ${process.env.WB_TOKEN}` },
          });
          const mediaMeta = await mediaMetaRes.json();
          const fileUrl = mediaMeta.url; // remote downloadable URL
          const mimeType = mediaMeta.mime_type;

          if (!fileUrl) {
            console.warn("No file URL in media metadata:", mediaMeta);
            // still store message record w/o mediaUrl if needed, or return
          }

          // 2) Download the actual media content (as ArrayBuffer -> Buffer)
          const fileRes = await fetch(fileUrl, {
            headers: { Authorization: `Bearer ${process.env.WB_TOKEN}` },
          });
          if (!fileRes.ok) throw new Error(`Failed to download media: ${fileRes.status}`);

          const arrayBuffer = await fileRes.arrayBuffer();
          const fileBuffer = Buffer.from(arrayBuffer);

          // derive extension for filename
          const ext = (mimeType.split("/")[1] || "bin").split(";")[0];
          const originalname = mediaObj.filename || mediaType;

          // 3) Build a file-like object compatible with your uploadMessageMedia
          const incomingFile = {
            buffer: fileBuffer,
            originalname,
            mimetype: mimeType,
          };

          // 4) Upload to your cloud storage (uses your uploadMessageMedia function)
          // Use receiver?.id (your user) as senderId and customer.id as receiverId
          const senderIdNum = Number(receiver?.id || 0); // your system user id (may be null)
          const receiverIdNum = Number(customer?.id || 0); // sender phone's customer id
          const uploadedPaths = await uploadMessageMedia([incomingFile], senderIdNum, receiverIdNum);

          const cloudPath = uploadedPaths[0]; // e.g. messages/1/2/12345-file.png
          const cloudUrl = `https://storage.googleapis.com/${process.env.BUCKET_NAME}/${cloudPath}`;

          // 5) Store message in DB including mediaUrl + mime + mediaId
          const messageToStore: any = {
            senderId: receiver?.id,
            receiverId: customer?.id,
            content: "", // keep empty for media messages
            direction: "incoming",
            status: "delivered",
            messageType: mediaType,
            clientId: messages.id,
            wamid: messages.id,
            mediaId,
            mediaUrl: cloudUrl,
            mediaMimeType: mediaType,
            caption
          };

          const saved = await storage.createMessage(messageToStore);

          // 6) Emit to frontend with a consistent field that your frontend reads (I suggest "context" or "mediaUrl")
          // Your frontend previously used data.context for images — keep that shape or update frontend accordingly.
          chatEmitter.emit("message", { ...messages, mediaUrl: cloudUrl, messageType: "media", mimeType, caption });

          console.log(" Incoming image saved:", saved);
        } catch (err) {
          console.error("❌ Error handling incoming image:", err);
        }
      }

    }

    res.sendStatus(200);
  });

  app.get("/api/customer-files", listFilesFromGCP);
  app.get("/api/tasks-files", listFilesFromGCP);
  app.get("/api/customer-files/:filePath", downloadFileFromGCP);

  app.get("/api/opportunity-files/:filePath", downloadFileFromGCP);
  app.get("/api/download-media/:filePath", downloadFileFromGCP);
  app.get("/api/gcp-files", listgcpfiles);

  app.get("/api/logs", listLogs);

  // Download specific log file
  app.get("/api/logs/:filename", downloadLog);

  app.use(logRequests)

  // Meeting waiting-room APIs
  app.post("/api/meetings/:slug/request", async (req: Request, res: Response) => {
    const slug = req.params.slug;
    const name = String(req.body?.name || "Guest").slice(0, 64);
    const m = getMeeting(slug);
    if (m.ended) return res.status(410).json({ error: "Meeting ended" });
    const id = randomId();
    m.pending.push({ id, name, createdAt: Date.now() });
    return res.status(200).json({ id });
  });

  app.get("/api/meetings/:slug/requests", async (req: Request, res: Response) => {
    const slug = req.params.slug;
    const m = getMeeting(slug);
    return res.status(200).json({ pending: m.pending });
  });

  app.post("/api/meetings/:slug/approve", async (req: Request, res: Response) => {
    const slug = req.params.slug;
    const id = String(req.body?.id || "");
    if (!id) return res.status(400).json({ error: "Missing id" });
    const m = getMeeting(slug);
    const idx = m.pending.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: "Request not found" });
    const reqItem = m.pending.splice(idx, 1)[0];
    // Generate guest token on approval
    try {
      const token = generateSignature(slug, 0);
      m.approvals.set(id, token);
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || "Failed to approve" });
    }
  });

  app.get("/api/meetings/:slug/approval", async (req: Request, res: Response) => {
    const slug = req.params.slug;
    const id = String(req.query.id || "");
    const m = getMeeting(slug);
    if (m.ended) return res.status(410).json({ error: "Meeting ended" });
    const token = m.approvals.get(id);
    if (token) return res.status(200).json({ token });
    return res.status(204).send();
  });

  app.post("/api/meetings/:slug/end", async (req: Request, res: Response) => {
    const slug = req.params.slug;
    const m = getMeeting(slug);
    m.ended = true;
    m.pending = [];
    m.approvals.clear();
    return res.status(200).json({ ok: true });
  });

  app.get("/api/meetings/:slug/state", async (req: Request, res: Response) => {
    const slug = req.params.slug;
    const m = getMeeting(slug);
    return res.status(200).json({ ended: m.ended });
  });

  app.post("/api/meetings/:slug/start", async (req: Request, res: Response) => {
    const slug = req.params.slug;
    const m = getMeeting(slug);
    // Just mark that the meeting has started - no complex logic needed
    return res.status(200).json({ ok: true, started: true });
  });

  // Generate Zoom SDK JWT for a given session name
  app.get("/api/zoom-token", async (req: Request, res: Response) => {
    try {
      const sessionName = String(req.query.session || "").trim();
      const roleParam = String(req.query.role || "guest").toLowerCase();
      const role = roleParam === "host" || roleParam === "1" ? 1 : 0; // 1=host, 0=guest
      if (!sessionName) {
        return res.status(400).json({ error: "Missing session query parameter" });
      }
      if (!process.env.ZOOM_SDK_KEY || !process.env.ZOOM_SDK_SECRET) {
        return res.status(500).json({ error: "Missing ZOOM_SDK_KEY or ZOOM_SDK_SECRET" });
      }

      const token = generateSignature(sessionName, role);
      return res.status(200).json({ token });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to generate token" });
    }
  });

  app.get("/api/roles", async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  function generateSignature(sessionName: string, role: number) {
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;
    const oHeader = { alg: "HS256", typ: "JWT" } as const;
    const sdkKey = process.env.ZOOM_SDK_KEY!;
    const sdkSecret = process.env.ZOOM_SDK_SECRET!;
    const oPayload = {
      app_key: sdkKey,
      tpc: sessionName,
      role_type: role,
      version: 1,
      iat,
      exp,
    } as const;

    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const sdkJWT = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, sdkSecret);
    return sdkJWT;
  }

  app.get("/api/role/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const role = await storage.getRole(id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
      res.json(role);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch role" });
    }
  });

  app.post("/api/roles", async (req, res) => {
    try {
      const roleData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(roleData);
      const actingUser = await storage.getUser(Number(req.user!.id));
      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "New Role Added",
          message: `A new Role named as : ${role.name} has been added  by ${actingUser?.username || "undefined"} ID:${actingUser?.id} `,
          type: "role",
          entityType: "role",
          entityId: role.id,
        });
      }
      res.status(201).json(role);


    } catch (error) {
      res.status(400).json({ error: "Invalid role data" });
    }
  });
  app.put("/api/roles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const roleData = insertRoleSchema.partial().parse(req.body);
      const role = await storage.updateRole(id, roleData);
      const actingUser = await storage.getUser(Number(req.user!.id));
      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Role Updated",
          message: `The Role named as ${role.name} has been updated by ${actingUser?.username}`,
          type: "role",
          entityType: "role",
          entityId: role.id,
        });
      }
      // res.json(role);
      res.status(200).json(role);
    } catch (error) {
      res.status(400).json({ error: "Invalid role data" });
    }
  });

  app.delete("/api/roles", async (req, res) => {
    try {
      if (!req.query.ids) {
        return res.status(400).json({ error: "Missing ids query parameter" });
      }
      const [roleId, userId] = (req.query.ids as string)
        .split(",")
        .map((id) => parseInt(id));
      const Role = await storage.getRole(roleId);
      const actingUser = await storage.getUser(Number(req.user!.id));
      await storage.deleteRole(roleId);

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Role Deleted",
          message: `Muttjmal The Role has been deleted: ${Role?.name || "undefined"}  by ${actingUser?.username || "undefined"} ID:${actingUser?.id}`,
          type: "role",
          entityType: "role",
          entityId: Role?.id ?? roleId,
        });
      }
      res.status(200).json(Role);

    } catch (error) {
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();

      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/user-users", async (req, res) => {
    try {
      const users = await storage.getAdminUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });


  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;

      const oldUser = await storage.getUser(id);
      if (!oldUser) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = await storage.updateUser(id, userData);
      const actingUser = await storage.getUser(Number(req.user!.id));
      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "User Updated",
          message: `${user.username} has been updated by ${actingUser?.username}`,
          type: "user",
          entityType: "user",
          entityId: user.id,
        });
      }

      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      await storage.deleteUser(id);
      const actingUserId = req.user!.id;
      const actingUser = await storage.getUser(actingUserId);
      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "User Deleted",
          message: `The User has been deleted: ${id} | by ${actingUser?.username} ID:${actingUser?.id}`,
          type: "user",
          entityType: "user",
          entityId: id,
        });
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.post("/api/user", async (req, res) => {
    try {
      // 1. Get the new field from the body
      const { username, password, email, firstName, lastName, roleId, isActive, userType, isEmailNotification, avatar } = req.body;

      const User = await storage.createUser({
        username,
        password,
        email,
        firstName,
        lastName,
        roleId,
        isActive,
        userType,
        isEmailNotification,
        avatar,
      });

      // 3. Add the 'if' check
      //    We check the 'isEmailNotification' from the body, defaulting to true if not provided.
      if (isEmailNotification ?? true) {
        await emailService.sendCreateUserEmail(email, password, username);
      }

      const actingUserId = req.user!.id;
      const actingUser = await storage.getUser(actingUserId);

      const users = await storage.getAdminUsers();
      const rolename = await storage.getRole(roleId);
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "New User Assigned",
          message: `A new User has been added: ${User.username} , Email: ${User.email}, Role: ${rolename?.name ?? "Unknown"} by ${actingUser?.username} ID:${actingUser?.id}`,
          type: "user",
          entityType: "user",
          entityId: User.id,
        });
      }
      // res.status(204).send();
      res.status(200).json(User);

    } catch (error) {
      res.status(500).json({ error: "Failed to create the user." });
    }
  });


app.get("/api/opportunities/relateddata", async (req, res) => {
  try {
    const oppId = Number(req.query.oppId);

    if (isNaN(oppId)) {
      return res.status(400).json({ error: "Invalid or missing opportunity ID" });
    }

    const result = await storage.GetRelatedData(oppId);

    return res.status(200).json({
      success: true,
      message: "Related data fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching related data:", error);
    res.status(500).json({ error: "Failed to fetch related data." });
  }
});



  // app.get("/api/meetings/getdata", async (req, res) => {
  app.get("/api/task-data/:id", async (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (!userId) {
        return res.status(400).json({ success: false, result: { leads: [], customers: [], opportunities: [] }, message: "user id is required to fetch related data" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(400).json({ success: false, result: { leads: [], customers: [], opportunities: [] }, message: "user doesn't exist with this id" });
      }

      const userType = user.userType;
      if (!userType) {
        return res.status(400).json({ success: false, result: { leads: [], customers: [], opportunities: [] }, message: "user type doesn't exist" });
      }

      const userName = user.username;
      const { allLeads, allCustomers, allOpportunities } = await storage.getRoleBasedTaskData(userId, userType, userName);

      return res.status(200).json({
        success: true,
        result: {
          leads: allLeads,
          customers: allCustomers,
          opportunities: allOpportunities
        },
        message: "Data fetched successfully"
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch related data." });
    }
  });
  app.get("/api/existing-company", async (req, res) => {
    try {
      const companyName = req.query.companyName as string;
      if (!companyName) {
        return res.status(400).json({ success: false, message: "company name is required" })
      };
      const result = await storage.uniqueCompanyName(companyName);
      return res.status(200).json({
        success: true,
        exists: result,
        message: "Successfully checked uniqueness"
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch related data." });
    }
  });
  app.get("/api/existing-lead-name", async (req, res) => {
    try {
      const leadName = req.query.leadName as string;
      const leadId = req.query.leadId ? Number(req.query.leadId) : undefined;

      if (!leadName) {
        return res.status(400).json({
          success: false,
          message: "lead name is required",
        });
      }

      const result = await storage.uniqueLeadName(leadName, leadId);
      return res.status(200).json({
        success: true,
        exists: result,
        message: "Successfully checked uniqueness",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch related data." });
    }
  });



  app.get("/api/leads", async (req, res) => {
    try {
      const userrole = req.query.roleType as string;
      const userid = req.query.userId ? Number(req.query.userId) : null;

      console.log(`Backend: /api/leads, Role: ${userrole}, UserID: ${userid}`);

      // Common pagination and filters
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      // const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      // const pagination = { limit, offset };

      // const filters = {
      //   assignedUserId: req.query.assignedUserId
      //     ? parseInt(req.query.assignedUserId as string, 10)
      //     : undefined,
      //   status: req.query.status as string,
      //   customerId: req.query.customerId
      //     ? parseInt(req.query.customerId as string, 10)
      //     : undefined,
      // };

      // Role-based handling (all call same function)
      if (userrole === "admin") {
        if (!userid) return res.status(400).json({ error: "userId is required" });
        console.log("In admin role");
        const data = await storage.getLeadsForDashboard(userid, limit);
        return res.json(data);
      }

      if (userrole === "manager") {
        if (!userid) return res.status(400).json({ error: "userId is required" });
        console.log("In manager role");
        const data = await storage.getLeadsForDashboard(userid, limit);
        return res.json(data);
      }

      if (userrole === "team-lead") {
        if (!userid) return res.status(400).json({ error: "userId is required" });
        console.log("In team-lead role");
        const data = await storage.getLeadsForDashboard(userid, limit);
        return res.json(data);
      }

      if (userrole === "associate") {
        if (!userid) return res.status(400).json({ error: "userId is required" });
        console.log("In associate role");
        const data = await storage.getLeadsForDashboard(userid, limit);
        return res.json(data);
      }

      // Fallback for invalid role
      return res.status(400).json({ error: "Invalid or unsupported roleType" });

    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // --- API Route 1: Lead Quality Stats ---
  app.get("/api/leads/lead-quality-stats", async (req, res) => {
    try {
      const userrole = req.query.roleType as string;
      // A safer way to get and cast the ID
      const userid = req.query.userId ? Number(req.query.userId) : null;

      console.log(
        `Backend: /lead-quality-stats, Role: ${userrole}, UserID: ${userid}`
      );

      if (userrole === "admin") {
        console.log(" In admin ")
        const data = await storage.getLeadQualityAndSourceStatsAdmin();
        return res.json(data);
      }

      if (userrole === "manager") {
        if (!userid) {
          return res
            .status(400)
            .json({ error: "userId query parameter is required for this role" });
        }

        console.log(" In manager ")

        //  CHANGED: Calls the admin function
        const data = await storage.getLeadQualityAndSourceStatsManager(userid);
        return res.json(data);
        // TODO: Implement your manager/team-lead specific logic
        // const data = await storage.getLeadQualityAndSourceStatsForManager(userid);
        // return res.json(data);
      }

      if (userrole === "team-lead") {
        if (!userid) {
          return res
            .status(400)
            .json({ error: "userId query parameter is required for this role" });
        }

        console.log(" In team-lead ")

        //  CHANGED: Calls the admin function
        const data = await storage.getLeadQualityAndSourceStatsTeamlead(userid);
        return res.json(data);
      }

      if (userrole === "associate") {
        if (!userid) {
          return res
            .status(400)
            .json({ error: "userId query parameter is required for this role" });
        }

        //  CHANGED: Calls the admin function
        const data = await storage.getLeadQualityAndSourceStatsAssociate(userid);
        return res.json(data);
        // TODO: Implement your associate specific logic
        // const data = await storage.getLeadQualityAndSourceStatsForAssociate(userid);
        // return res.json(data);
      }

      // If role is none of the above (or missing)
      return res
        .status(400)
        .json({ error: "Invalid or unsupported roleType provided" });
    } catch (error) {
      console.error("Error fetching lead quality stats:", error);
      res.status(500).json({ error: "Failed to fetch lead quality stats" });
    }
  });

  // --- API Route 2: Total Counts (Dashboard Stats) ---
  app.get("/api/leads/totalcount", async (req, res) => {
    try {
      const userrole = req.query.roleType as string;
      const userid = req.query.userId ? Number(req.query.userId) : null;

      console.log(`Backend: /totalcount, Role: ${userrole}, UserID: ${userid}`);

      if (userrole === "admin") {
        console.log(" In admin ")

        const data = await storage.getnewDashboardStats();
        return res.json(data);
      }

      if (userrole === "manager") {
        if (!userid) {
          return res
            .status(400)
            .json({ error: "userId query parameter is required for this role" });
        }
        console.log("In manager /api/leads/totalcount");

        //  CHANGED: Calls the admin function
        const data = await storage.getnewDashboardStatsManager(userid);
        console.log("In Manager Data:", data);
        return res.json(data);
        // TODO: Implement your manager/team-lead specific logic
        // const data = await storage.getnewDashboardStatsForManager(userid,userrole);
        // return res.json(data);
      }

      if (userrole === "team-lead") {
        if (!userid) {
          return res
            .status(400)
            .json({ error: "userId query parameter is required for this role" });
        }
        console.log("In Team-lead /api/leads/totalcount");

        //  CHANGED: Calls the admin function
        const data = await storage.getnewDashboardStatsTeamlead(userid);
        console.log("In Team-lead Data:", data);
        return res.json(data);
        // TODO: Implement your manager/team-lead specific logic
        // const data = await storage.getnewDashboardStatsForManager(userid,userrole);
        // return res.json(data);

      }

      if (userrole === "associate") {
        if (!userid) {
          return res
            .status(400)
            .json({ error: "userId query parameter is required for this role" });
        }

        //  CHANGED: Calls the admin function
        const data = await storage.getnewDashboardStatsAssociate(userid);
        return res.json(data);
        // TODO: Implement your associate specific logic
        // const data = await storage.getnewDashboardStatsForAssociate(userid);
        // return res.json(data);
      }

      // If role is none of the above (or missing)
      return res
        .status(400)
        .json({ error: "Invalid or unsupported roleType provided" });
    } catch (error) {
      console.error("Error fetching total counts:", error);
      res.status(500).json({ error: "Failed to fetch total counts data" });
    }
  });

  // --- API Route 3: Total Leads and Opportunities Stats ---
  app.get("/api/leads/totalleadsandopp", async (req, res) => {
    try {
      const userrole = req.query.roleType as string;
      const userid = req.query.userId ? Number(req.query.userId) : null;

      console.log(
        `Backend: /totalleadsandopp, Role: ${userrole}, UserID: ${userid}`
      );

      if (userrole === "admin") {
        console.log(" In admin ")

        const data = await storage.getLeadAndOpportunityStats();
        return res.json(data);
      }

      if (userrole === "manager") {
        if (!userid) {
          return res
            .status(400)
            .json({ error: "userId query parameter is required for this role" });
        }

        //  CHANGED: Calls the admin function (getLeadAndOpportunityStats)
        // Note: Your original code had 'getnewDashboardStats' here by mistake.
        // I've used 'getLeadAndOpportunityStats' to match the admin's call.
        // getLeadAndOpportunityStatsForManager
        const data = await storage.getLeadAndOpportunityStatsForManager(userid);
        return res.json(data);
        // TODO: Implement your manager/team-lead specific logic
        // const data = await storage.getLeadAndOpportunityStatsForManager(userid);
        // return res.json(data);
      }

      if (userrole === "team-lead") {
        if (!userid) {
          return res
            .status(400)
            .json({ error: "userId query parameter is required for this role" });
        }

        //  CHANGED: Calls the admin function (getLeadAndOpportunityStats)
        // Note: Your original code had 'getnewDashboardStats' here by mistake.
        // I've used 'getLeadAndOpportunityStats' to match the admin's call.
        // getLeadAndOpportunityStatsForManager
        const data = await storage.getLeadAndOpportunityStatsForTeamlead(userid);
        return res.json(data);
        // TODO: Implement your manager/team-lead specific logic
        // const data = await storage.getLeadAndOpportunityStatsForManager(userid);
        // return res.json(data);
      }

      if (userrole === "associate") {
        if (!userid) {
          return res
            .status(400)
            .json({ error: "userId query parameter is required for this role" });
        }

        //  CHANGED: Calls the admin function (getLeadAndOpportunityStats)
        // Note: Your original code had 'getnewDashboardStats' here by mistake.
        // I've used 'getLeadAndOpportunityStats' to match the admin's call.
        const data = await storage.getLeadAndOpportunityStatsForAssociate(userid);
        return res.json(data);
        // TODO: Implement your associate specific logic
        // const data = await storage.getLeadAndOpportunityStatsForAssociate(userid);
        // return res.json(data);
      }

      // If role is none of the above (or missing)
      return res
        .status(400)
        .json({ error: "Invalid or unsupported roleType provided" });
    } catch (error) {
      console.error("Error fetching total leads and opportunities:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch total leads and opportunities data" });
    }
  });


  app.get("/api/leads/user/:userId", async (req, res) => {
    try {
      // --- 1. Extract Pagination (Existing) ---
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const pagination = {
        limit,
        offset,
      };

      // --- 2. Extract Filters & Search (New) ---
      const {
        search,
        status,
        source,
        tags, // This will be a comma-separated string
        minValue,
        maxValue,
        minProbability,
        maxProbability,
        assignedUser, // This is a name, your storage layer may need to convert it to an ID
        createdBy, // This is a name, your storage layer may need to convert it to an ID
        startDate,
        endDate,
        role, // Existing role param
      } = req.query;

      // --- 3. Build a Filters Object (New) ---
      // This cleans up the data and prepares it for your storage functions
      const filters = {
        search: search as string | undefined,
        status: status as string | undefined,
        source: source as string | undefined,
        // Split the tags string into an array, if it exists
        tags: tags ? (tags as string).split(",") : undefined,
        // Convert numeric values
        valueRange: [
          minValue ? parseFloat(minValue as string) : undefined,
          maxValue ? parseFloat(maxValue as string) : undefined,
        ],
        probabilityRange: [
          minProbability ? parseFloat(minProbability as string) : undefined,
          maxProbability ? parseFloat(maxProbability as string) : undefined,
        ],
        // Convert date strings to Date objects
        dateRange: [
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined,
        ],
        assignedUser: assignedUser as string | undefined,
        createdBy: createdBy as string | undefined,
      };

      // Clean out any 'all' or undefined values so your storage layer doesn't get confused
      if (filters.status === "all") delete filters.status;
      if (filters.source === "all") delete filters.source;
      if (filters.assignedUser === "all") delete filters.assignedUser;
      if (filters.createdBy === "all") delete filters.createdBy;

      const userId = Number(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let leads;

      // --- 4. Pass Filters to Storage Functions (Modified) ---
      // You must now update your storage functions (getLeads, getLeadsByUser, etc.)
      // to accept this new 'filters' object.

      if (role === "admin") {
        // Admin → fetch all leads
        leads = await storage.getLeads(filters, pagination);
      } else if (user.userType === "associate") {
        // Associate → reuse your existing helper
        leads = await storage.getLeadsByUser(userId, filters, pagination);
      } else {
        // For manager or team-lead → need to check teams
        const teams = await storage.getTeamsByUserId(userId);

        // console.log("Teams for Leads of current User: ", teams[0]?.team?.members);

        if (!teams || teams.length === 0) {
          // No teams → fallback to own leads
          leads = await storage.getLeadsByUser(userId, filters, pagination);
        } else {
          // Collect members based on role
          let memberIds: number[] = [];

          teams.forEach((team) => {
            team.team.members.forEach((m) => {
              if (user.userType === "team-lead" && m.user.userType === "associate") {
                memberIds.push(m.user.id);
              }
              if (
                user.userType === "manager" &&
                m.user.userType !== null &&
                ["associate", "team-lead"].includes(m.user.userType)
              ) {
                memberIds.push(m.user.id);
              }

            });
          });

          // Include own id too
          memberIds.push(userId);

          leads = await storage.getLeadsByUsers(memberIds, filters, pagination);
        }
      }

      // console.log(leads)

      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/customer-files/:customerId", upload.array("files"), async (req, res) => {
    try {
      const customerId = Number(req.params.customerId);
      const userId = Number(req.user?.id);
      console.log("The user id is ", userId, "and customer id is", customerId)
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }

      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const uploadedFiles = req.files as Express.Multer.File[];
      console.log("uploaded files are ", uploadedFiles)

      //  Upload files to GCP
      const filePaths = await uploadFilesToGCP(uploadedFiles, userId);
      return res.json(filePaths);
    } catch (error) {
      console.error("Error uploading customer files:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });




  app.put("/api/customers-with-files/:id", upload.fields([{ name: "files" }, { name: "file", maxCount: 1 }]), async (req, res) => {
    try {
      const customerId = Number(req.params.id);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }


      const userId = Number(req.user?.id);
      const { files, file } = req.files as {
        files?: Express.Multer.File[];
        file?: Express.Multer.File[];
      };
      //  Parse the serialized JSON data
      const customerData = JSON.parse(req.body.data);

      //  Fetch existing customer
      const existingCustomer = await storage.getCustomer(customerId);
      if (!existingCustomer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      //  Upload any new files to GCP
      let newFilePaths: string[] = [];
      if (files && files.length > 0) {
        newFilePaths = await uploadCustomerFiles(files, customerId);
      }
      let cloudUrl = existingCustomer.avatar;
      if (file && file.length > 0) {
        cloudUrl = await uploadProfile(file[0], "customers", existingCustomer.id)
      }
      //  Combine existing + new file paths
      const allCustomerFiles = [
        ...(existingCustomer.customerFiles || []),
        ...newFilePaths,
      ];
      const { createdAt, updatedAt, ...cleanCustomerData } = customerData;

      //  Save updated data
      const updatedCustomer = await storage.updateCustomer(customerId, {
        ...cleanCustomerData,
        customerFiles: allCustomerFiles,
        avatar: cloudUrl,
        updatedAt: new Date(),
      });
      //  Optionally notify assigned user
      if (
        customerData.assignedUserId &&
        customerData.assignedUserId !== existingCustomer.assignedUserId
      ) {
        const actingUser = await storage.getUser(userId);
        await notificationService.createNotification({
          userId: customerData.assignedUserId,
          title: "Customer Assigned",
          message: `${actingUser?.username ?? "Someone"} assigned you to ${updatedCustomer.companyName}`,
          type: "customer",
          entityType: "customer",
          entityId: updatedCustomer.id,
        });
      }

      console.log(" Customer updated with files:", allCustomerFiles);

      res.json({
        ...updatedCustomer,
        // customerFiles: formattedFiles,
        customerFiles: allCustomerFiles,
      });
    } catch (error) {
      console.error("❌ Error updating customer with files:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.delete("/api/customer-files/:customerId", async (req, res) => {
    try {
      const customerId = Number(req.params.customerId);
      const { filePath } = req.body;
      console.log(`delete muttation customer id is : ${customerId} and filepath is ${filePath}`)

      if (isNaN(customerId) || !filePath) {
        return res.status(400).json({ error: "Invalid customer ID or file path" });
      }

      //  Get existing customer
      const existingCustomer = await storage.getCustomer(customerId);
      if (!existingCustomer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      //  Delete file from GCP
      await deleteFilesFromGCP([filePath]);

      //  Remove from DB array
      const updatedFiles = (existingCustomer.customerFiles || []).filter(
        (file: string) => file !== filePath
      );

      await storage.updateCustomer(customerId, {
        ...existingCustomer,
        customerFiles: updatedFiles,
        updatedAt: new Date(),
      } as any);

      console.log(` File deleted from GCP and DB: ${filePath}`);
      res.json({ success: true, message: "File deleted", filePath });
    } catch (error: any) {
      console.error("❌ Error deleting file:", error);
      res.status(500).json({ error: "Error deleting file", details: error.message });
    }
  });



  app.get("/api/lead-by-id/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });
  app.get("/api/leads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  // app.put("/api/leads/:id", upload.array("files"), async (req, res) => {
  //   try {
  //     const id = parseInt(req.params.id);
  //     const existingLead = await storage.getLead(id);

  //     // Parse form-data fields
  //     const {
  //       name,
  //       email,
  //       phone,
  //       source,
  //       status,
  //       value,
  //       assignedUserId,
  //       customerId,
  //       contactId,
  //     } = req.body;

  //     // Handle uploaded files safely
  //     const uploadedFiles = Array.isArray(req.files)
  //       ? (req.files as Express.Multer.File[])
  //       : [];

  //     const userId = req.user!.id;

  //     const filePaths =
  //       uploadedFiles.length > 0
  //         ? await uploadFilesToGCP(uploadedFiles, userId)
  //         : [];


  //     // Combine existing files from DB with the new ones
  //     const mergedFiles = existingLead?.rspFiles
  //       ? [...existingLead.rspFiles, ...filePaths]
  //       : filePaths;

  //     // Build lead data
  //     const leadData = {
  //       name: name || existingLead?.name,
  //       email: email || null,
  //       phone: phone || null,
  //       source: source || null,
  //       status: status || "new",
  //       value: value ? value.toString() : null,
  //       assignedUserId: assignedUserId ? Number(assignedUserId) : null,
  //       customerId: customerId || null,
  //       contactId: contactId || null,
  //       tags: req.body.tags ? JSON.parse(req.body.tags) : [],
  //       notes: req.body.notes || null,
  //       companyName: req.body.companyName || "",
  //       pointOfContactFirstName: req.body.pointOfContactFirstName || "",
  //       pointOfContactLastName: req.body.pointOfContactLastName || "",
  //       websiteUrl: req.body.websiteUrl || null,
  //       countryRegion: req.body.countryRegion || null,
  //       timeZone: req.body.timeZone || null,
  //       rsp: req.body.rsp === "true",
  //       //  Always use merged files instead of replacing
  //       rspFiles: mergedFiles,
  //     };
  //     console.log('...........the updated lead data is ',leadData)

  //     // Update the lead
  //     const lead = await storage.updateLead(id, leadData);

  //     // Notifications
  //     const actingUser = await storage.getUser(userId);
  //     const users = await storage.getAdminUsers();

  //     for (const user of users) {
  //       await notificationService.createNotification({
  //         userId: user.id,
  //         title: "Lead Updated",
  //         message: `Lead "${lead.name}" (ID: ${lead.id}) was updated by ${actingUser?.username || "Unknown User"
  //           } ID:${actingUser?.id}`,
  //         type: "lead",
  //         entityType: "lead",
  //         entityId: lead.id,
  //       });
  //     }

  //     if (lead.assignedUserId && Number(lead.assignedUserId) !== actingUser?.id) {
  //       await notificationService.createNotification({
  //         userId: Number(lead.assignedUserId),
  //         title: "Lead updated",
  //         message: `The lead : ${lead.name} ${lead.companyName ?? ""}, Value: ${lead.value
  //           } has been updated by user having ID: ${actingUser?.id} and username : ${actingUser?.username
  //           }`,
  //         type: "lead",
  //         entityType: "lead",
  //         entityId: lead.id,
  //       });
  //     }

  //     //  Return with full merged file list
  //     res.json({
  //       ...lead,
  //       rspFiles: mergedFiles,
  //     });
  //   } catch (error: any) {
  //     console.error("Error updating lead:", error);
  //     res.status(400).json({ error: "Invalid lead data" });
  //   }
  // });
  app.put("/api/leads/:id", upload.array("files"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;

      const existingLead = await storage.getLead(id);
      if (!existingLead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Extract uploaded files if any
      const uploadedFiles = Array.isArray(req.files)
        ? (req.files as Express.Multer.File[])
        : [];

      const filePaths =
        uploadedFiles.length > 0
          ? await uploadFilesToGCP(uploadedFiles, userId)
          : [];

      // Merge existing and newly uploaded files
      const mergedFiles = existingLead.rspFiles
        ? [...existingLead.rspFiles, ...filePaths]
        : filePaths;

      // Build only updated fields from req.body
      const updatableFields = [
        "name",
        "email",
        "phone",
        "source",
        "status",
        "value",
        "assignedUserId",
        "customerId",
        "contactId",
        "tags",
        "notes",
        "companyName",
        "pointOfContactFirstName",
        "pointOfContactLastName",
        "websiteUrl",
        "countryRegion",
        "timeZone",
        "rsp",
      ];

      const leadData: any = { ...existingLead };

      for (const field of updatableFields) {
        if (req.body[field] !== undefined && req.body[field] !== null) {
          if (field === "tags") {
            leadData.tags = JSON.parse(req.body.tags);
          } else if (field === "rsp") {
            leadData.rsp = req.body.rsp === "true";
          } else if (field === "value") {
            leadData.value = req.body.value.toString();
          } else if (field === "assignedUserId") {
            leadData.assignedUserId = Number(req.body.assignedUserId);
          } else {
            leadData[field] = req.body[field];
          }
        }
      }

      // Always merge rspFiles safely
      leadData.rspFiles = mergedFiles;

      // 4️⃣ Update in DB
      const updatedLead = await storage.updateLead(id, leadData);

      // 5️⃣ Send notifications
      const actingUser = await storage.getUser(userId);
      const admins = await storage.getAdminUsers();

      for (const admin of admins) {
        await notificationService.createNotification({
          userId: admin.id,
          title: "Lead Updated",
          message: `Lead "${updatedLead.name}" (ID: ${updatedLead.id}) was updated by ${actingUser?.username || "Unknown User"
            }`,
          type: "lead",
          entityType: "lead",
          entityId: updatedLead.id,
        });
      }

      if (
        updatedLead.assignedUserId &&
        Number(updatedLead.assignedUserId) !== actingUser?.id
      ) {
        await notificationService.createNotification({
          userId: Number(updatedLead.assignedUserId),
          title: "Lead Updated",
          message: `Lead "${updatedLead.name}" was updated by ${actingUser?.username}`,
          type: "lead",
          entityType: "lead",
          entityId: updatedLead.id,
        });
      }

      // 6️⃣ Return updated data
      res.json(updatedLead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(400).json({ error: "Failed to update lead" });
    }
  });


  app.post("/api/leads", upload.array("files"), async (req, res) => {
    console.log("Lead Created by Post /api/leads")

    try {
      // --- 1. DESTRUCTURE ALL FIELDS (including probability) ---
      const {
        name,
        email,
        phone,
        source,
        status,
        value,
        assignedUserId,
        customerId,
        contactId,
        tags,
        notes,
        companyName,
        pointOfContactFirstName,
        pointOfContactLastName,
        websiteUrl,
        countryRegion,
        timeZone,
        createdByUserId,
        rsp,
        probability: probString, // Get probability as a string (e.g., '12')
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Lead Name is Required" });
      }

      // --- 2. HANDLE PROBABILITY ---
      // Convert the string '12' to a number, matching your schema
      let probability = 0; // Default to 0 (matches schema default)
      if (probString) {
        const parsed = parseInt(probString, 10);
        if (!isNaN(parsed)) {
          probability = parsed; // Use the parsed number
        }
      }

      // --- 3. HANDLE FILES ---
      const uploadedFiles = req.files as Express.Multer.File[];
      const userId = req.user!.id;
      const filePaths =
        uploadedFiles.length > 0
          ? await uploadFilesToGCP(uploadedFiles, userId)
          : [];

      // --- 4. BUILD LEAD DATA OBJECT (NOW CLEANER) ---
      const leadData = {
        name,
        email: email || null,
        phone: phone || null,
        source: source || null,
        status: status || "new",
        value: value ? value.toString() : null,
        assignedUserId: assignedUserId ? Number(assignedUserId) : null,
        customerId: customerId ? Number(customerId) : null,
        contactId: contactId ? Number(contactId) : null,
        tags: tags ? JSON.parse(tags) : [],
        notes: notes || null,
        companyName: companyName || "",
        pointOfContactFirstName: pointOfContactFirstName || "",
        pointOfContactLastName: pointOfContactLastName || null,
        websiteUrl: websiteUrl || null,
        countryRegion: countryRegion || null,
        timeZone: timeZone || null,
        createdByUserId: createdByUserId ? Number(createdByUserId) : null,

        probability: probability, // --- ADDED THIS LINE ---
        rsp: rsp === "true", // --- FIXED THIS LINE (convert string 'true' to boolean) ---

        rspFiles: filePaths, // include files in lead
      };

      const lead = await storage.createLead(leadData);

      const actingUser = await storage.getUser(req.user!.id);
      const users = await storage.getAdminUsers();
      let companyname: string | undefined = undefined;
      if (lead.customerId !== null && lead.customerId !== undefined) {
        const customer = await storage.getCustomer(lead.customerId);
        companyname = customer?.companyName;
      }

      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "New Lead Created",
          message: `A new Lead has been added: Name : ${lead.name
            }, Company: ${lead.companyName ?? ""} by ${actingUser?.username} ID:${actingUser?.id
            }`,
          type: "lead",
          entityType: "lead",
          entityId: lead.id,
        });
      }
      //send notifcation to assigned user
      if (
        lead.assignedUserId &&
        !users.some((user) => user.id === lead.assignedUserId)
      ) {
        await notificationService.createNotification({
          userId: lead.assignedUserId,
          title: "New Lead Assigned",
          message: `You have been assigned a new lead: ${lead.name} ${lead.companyName ?? ""
            }, Value: ${lead.value}`,
          type: "lead",
          entityType: "lead",
          entityId: lead.id,
        });
      }

      eventNotificationService.notifyOnEvent(req.user!, "new_lead", lead);

      res.status(201).json(lead);
    } catch (error: any) {
      console.error("Error creating lead:", error); // Log the full error
      console.error("Failing leadData:", req.body); // Log the data that failed
      res.status(400).json({ error: "Invalid lead data" });
    }
  });
  app.post("/api/leads", upload.array("files"), async (req, res) => {
    try {
      console.log("New Lead Created here 2->")
      const { name, email, phone, company, source, status, value, assignedUserId, customerId, contactId } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Lead Name is Required" });
      }
      const leadData = {
        name,
        email: email || null,
        phone: phone || null,
        source: source || null,
        status: status || "new",
        value: value ? value.toString() : null,
        assignedUserId: assignedUserId ? Number(assignedUserId) : null,
        customerId: customerId || null,
        contactId: contactId || null,
        tags: req.body.tags || [],
        notes: req.body.notes || null,
        companyName: req.body.companyName || "",
        pointOfContactFirstName: req.body.pointOfContactFirstName || "",
        pointOfContactLastName: req.body.pointOfContactLastName || null,
        websiteUrl: req.body.websiteUrl || null,
        countryRegion: req.body.countryRegion || null,
        timeZone: req.body.timeZone || null,
        createdByUserId: req.body.createdByUserId ? Number(req.body.createdByUserId) : null,
      };

      const lead = await storage.createLead(leadData);

      const actingUser = await storage.getUser(req.user!.id);
      const users = await storage.getAdminUsers();
      let companyname: string | undefined = undefined;
      if (lead.customerId !== null && lead.customerId !== undefined) {
        const customer = await storage.getCustomer(lead.customerId);
        companyname = customer?.companyName;
      }

      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "New Lead Assigned",
          message: `A new Lead has been added: Name : ${lead.name}, Company: ${lead.companyName ?? ""} by ${actingUser?.username} ID:${actingUser?.id}`,
          type: "lead",
          entityType: "lead",
          entityId: lead.id,
        });
      }
      //send notifcation to assigned user
      if (lead.assignedUserId && !users.some(user => user.id === lead.assignedUserId)) {
        await notificationService.createNotification({
          userId: lead.assignedUserId,
          title: "New Lead Assigned",
          message: `You have been assigned a new lead: ${lead.name} ${lead.companyName ?? ""}, Value: ${lead.value}`,
          type: "lead",
          entityType: "lead",
          entityId: lead.id,
        });
      }

      eventNotificationService.notifyOnEvent(req.user!, "new_lead", lead);

      res.status(201).json(lead);
    } catch (error: any) {
      res.status(400).json({ error: "Invalid lead data" });
    }
  });

  app.delete("/api/leads", async (req, res) => {
    try {
      if (!req.query.ids) {
        return res.status(400).json({ error: "Missing ids query parameter" });
      }

      const [leadId, userId] = (req.query.ids as string)
        .split(",")
        .map((id) => parseInt(id));

      if (!leadId || !userId) {
        return res.status(400).json({ error: "Both leadId and userId are required" });
      }

      const lead = await storage.getLead(leadId);

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // delete from GCP - only the files for this lead
      if (lead.rspFiles && lead.rspFiles.length > 0) {
        await deleteFilesFromGCP(lead.rspFiles);
      }

      // delete from DB
      await storage.deleteLead(leadId);

      // notifications
      const actingUser = await storage.getUser(req.user!.id);
      const users = await storage.getAdminUsers();

      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Lead Deleted",
          message: `The Lead has been deleted: Name:  ${lead.name}, by ${actingUser?.username || "Unknown User"
            } ID:${actingUser?.id}`,
          type: "lead",
          entityType: "lead",
          entityId: leadId,
        });
      }

      if (lead.assignedUserId && !users.some(user => user.id === lead.assignedUserId)) {
        await notificationService.createNotification({
          userId: lead.assignedUserId,
          title: "Lead Deleted",
          message: `The lead has been deleted: Name: ${lead.name} ${lead.companyName ?? ""
            }, Value: ${lead.value}`,
          type: "lead",
          entityType: "lead",
          entityId: lead.id,
        });
      }

      res.status(200).json(lead);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  //-------------api routes of analystics-------------------

  // In your analytics routes file
  app.post("/api/analytics/leads-to-opportunity", async (req, res) => {
    const { startDate, endDate, teamId } = req.body;

    const data = await storage.getLeadsToOpportunityStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      teamId
    );

    res.json({ data });
  });

  app.post("/api/analytics/opportunity-to-customer", async (req, res) => {
    const { startDate, endDate, teamId } = req.body;

    const data = await storage.getOpportunityToCustomer(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      teamId
    );

    res.json({ data });
  });

  app.post("/api/analytics/conversion-stats", async (req, res) => {
    const { startDate, endDate, teamId } = req.body;

    const data = await storage.getLeadToCustomerConversion(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      teamId
    );

    res.json({ data });
  });
  app.get("/api/analytics/users", async (req, res) => {
    try {
      // Parse pagination parameters from query string
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const pagination = {
        limit,
        offset,
      };

      // Call getUsersAnalytics with pagination
      const result = await storage.getUsersAnalytics(pagination);

      res.json({
        success: true,
        data: result.users, // or result.results depending on your implementation
        pagination: {
          limit,
          offset,
          total: result.totalCount,
          hasMore: offset + limit < result.totalCount,
        },
      });
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user analytics",
      });
    }
  });

  app.get("/api/customers/:id/associations", async (req, res) => {
    try {
      const customerId = Number(req.params.id);
      console.log("the user id is ", customerId);

      if (isNaN(customerId) || !customerId) {
        return res
          .status(400)
          .send("user id is required and should be a number");
      }

      const { leads, contacts, opportunities, tasks } =
        await storage.getCustomerAssociations(customerId);

      // Send the response properly
      res.json({ leads, contacts, opportunities, tasks });
    } catch (error) {
      console.error("Error fetching customer associations:", error);
      res.status(500).json({ error: "Failed to fetch customers associations" });
    }
  });

  app.get("/api/customers", async (req, res) => {
    try {
      const user = req.user!; // authenticated user
      const users = await storage.getAdminUsers();

      // If admin → run old endpoint logic (with pagination)
      if (users.some((admin) => admin.id === user.id)) {
        const hasPagination = req.query.limit || req.query.offset;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

        let customerList;
        let total;

        if (hasPagination) {
          customerList = await db
            .select()
            .from(customers)
            .limit(limit || 50)
            .offset(offset || 0);

          const [{ count }] = await db
            .select({ count: sql<number>`count(*)`.as("count") })
            .from(customers);
          total = count;

          return res.json({
            customers: customerList,
            total,
          });
        } else {
          customerList = await db.select().from(customers);
          return res.json(customerList);
        }
      }

      // If NOT admin → restricted query
      const results = await storage.getCustomersByUserss();
      res.json(results);

    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });


  app.get("/api/activitylogs", async (req, res) => {
    try {
      // 1. Parse limit and offset from query parameters with defaults
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      // 2. Fetch data and total count in parallel for better performance 🚀
      const [result, totalCountResult] = await Promise.all([
        // Query 1: Fetches the paginated list of logs
        db
          .select()
          .from(activityLogs)
          .orderBy(desc(activityLogs.timestamp)) // Show newest logs first
          .limit(limit)
          .offset(offset),

        // Query 2: Fetches the total number of all rows
        db
          .select({ total: count() })
          .from(activityLogs),
      ]);

      // 3. Safely get the total count from the result
      const totalcount = totalCountResult[0]?.total || 0;

      // 4. Send the response in the correct JSON format
      res.json({
        result: result,
        totalcount: totalcount,
      });

    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });


  app.get("/api/activitylogs/user/:username", async (req, res) => {
    try {

      //  Get username from the URL path as a route parameter
      const { username } = req.params;


      // Get pagination from query strings
      const limit = req.query.limit ? parseInt(req.query.limit as string, 0) : 25;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 0) : 0;

      // The rest of the logic is the same as before
      const whereCondition = eq(activityLogs.performed, username);

      const [result, totalCountResult, userDetails] = await Promise.all([
        db.select().from(activityLogs).where(whereCondition).orderBy(desc(activityLogs.timestamp)).limit(limit).offset(offset),
        db.select({ total: count() }).from(activityLogs).where(whereCondition),
        db.select({
          username: users.username,
          role: users.userType,
          firstname: users.firstName,
          lastname: users.lastName,
          email: users.email,
          isactive: users.isActive

        }).from(users).where(eq(users.username, username)).limit(1),
      ]);

      const totalcount = totalCountResult[0]?.total || 0;
      const user = userDetails[0] || null;

      res.json({
        result: result,
        totalcount: totalcount,
        user: user,
      });

    } catch (error) {
      console.error("Error fetching user activity logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });


app.get("/api/customers/checker", async (req, res) => {
  try {
    const { companyName, email, phone,id } = req.query as {
      companyName?: string;
      email?: string;
      phone?: string;
      id?: string;
    };

    // --- 1. Get and parse the ID from the URL ---
  
    // We only exclude an ID if it's a valid number.
    // If id is 'new' or '0', excludeId will be undefined.
    const excludeId =
      id && id !== "new" && id !== "0" ? parseInt(id, 10) : undefined;

    // Optional: Check for bad ID like 'abc'
    if (id && !excludeId && id !== "new" && id !== "0") {
      return res.status(400).json({ error: "Invalid customer ID" });
    }

    // Validate input
    if (!companyName && !email && !phone) {
      return res.status(400).json({ error: "No fields provided to check" });
    }

    // --- 2. Pass the excludeId to your storage function ---
    const exists = await storage.checkCustomerUniqueness({
      companyName,
      email,
      phone,
      excludeId, // <-- Pass the ID here
    });

    res.json({ exists });
  } catch (error) {
    console.error("❌ Error checking uniqueness:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



  app.get("/api/customers/user/:userId", async (req, res) => {
    try {
      const role = req.query.role as string;
      const userId = Number(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      // --- Pagination ---
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const pagination = { limit, offset };

      // --- 👇 Parse ALL Customer Filters from req.query 👇 ---
      const filters = {
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        industry: req.query.industry as string | undefined,
        country: req.query.country as string | undefined,
        timeZone: req.query.timeZone as string | undefined,
        lifecycleStage: req.query.lifecycleStage as string | undefined,
        assignedUser: req.query.assignedUser as string | undefined,
        createdBy: req.query.createdBy as string | undefined,
        // Safely parse numbers, default to undefined if NaN
        employeeRange: [
          req.query.minEmployees ? parseInt(req.query.minEmployees as string) : undefined,
          req.query.maxEmployees ? parseInt(req.query.maxEmployees as string) : undefined,
        ].map(n => isNaN(n!) ? undefined : n) as [number | undefined, number | undefined],
        revenueRange: [
          req.query.minRevenue ? parseFloat(req.query.minRevenue as string) : undefined,
          req.query.maxRevenue ? parseFloat(req.query.maxRevenue as string) : undefined,
        ].map(n => isNaN(n!) ? undefined : n) as [number | undefined, number | undefined],
        // Parse boolean filters carefully, converting string "true"/"false" to boolean, otherwise null
        hasWebsite: req.query.hasWebsite === 'true' ? true : req.query.hasWebsite === 'false' ? false : null,
        hasEmail: req.query.hasEmail === 'true' ? true : req.query.hasEmail === 'false' ? false : null,
      };

      // Clean out 'all' strings before logging or passing (though storage handles it)
      Object.keys(filters).forEach(key => {
        if ((filters as any)[key] === 'all') {
          (filters as any)[key] = undefined;
        }
      });


      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      //  Fetch user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let customers: { result: any[]; totalcount: number } = { result: [], totalcount: 0 };
      let totalcount = 0;

      // const customers;

      //  1. Admin: get all customers (already paginated)
      if (role === "admin") {
        customers = await storage.getCustomers(filters, pagination);
      }

      //  2. Associate: only own customers
      else if (user.userType === "associate") {
        // customers = await storage.getCustomersByUser({
        //   createdUsername: user.username,
        //   asignUserId: user.id,
        // }, pagination,filters);

        customers = await storage.getCustomersByUser(userId, filters, pagination);
      }

      //  3. Team Lead / Manager logic
      else {
        const teams = await storage.getTeamsByUserId(userId);
        if (!teams || teams.length === 0) {
          // customers = await storage.getCustomersByUser({
          //   createdUsername: user.username,
          //   asignUserId: user.id,
          // }, pagination,filters);
          customers = await storage.getCustomersByUser(userId, filters, pagination);
        } else {
          const memberIds: number[] = [];

          for (const t of teams) {
            for (const m of t.team.members) {
              const type = m.user.userType;

              if (user.userType === "team-lead" && type === "associate") {
                memberIds.push(m.user.id);
              }

              if (
                user.userType === "manager" &&
                type && ["associate", "team-lead"].includes(type)
              ) {
                memberIds.push(m.user.id);
              }
            }
          }

          memberIds.push(userId);
          customers = await storage.getCustomersByUserIds(memberIds, filters, pagination);
        }
      }

      //  Ensure consistent structure
      totalcount = customers.result.length;

      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post("/api/customers", async (req, res) => {
    try {


      console.log("Logical Data:", req.body)
      console.log("Logical Data:", req.body.data)

      // --- REPLACEMENT LOGIC ---
      let customerData;
      if (req.body.data) {
        // This handles Place 1 (data is in req.body.data)
        if (typeof req.body.data === 'string') {
          // It's a JSON string, so parse it
          customerData = JSON.parse(req.body.data);
        } else {
          // It's already an object (e.g., req.body.data = { companyName: ... })
          customerData = req.body.data;
        }
      } else {
        // This handles Place 2 (data is the entire req.body)
        customerData = req.body;
      }
      const customer = await storage.createCustomer(customerData);

      const actingUser = await storage.getUser(req.user!.id);

      const adminUsers = await storage.getAdminUsers();
      // Notify all admins
      for (const admin of adminUsers) {
        await notificationService.createNotification({
          userId: admin.id,
          title: "New Customer Added",
          message: `A new customer has been added: ${customer.companyName} by ${actingUser?.username}`,
          type: "customer",
          entityType: "customer",
          entityId: customer.id,
        });
      }

      // Notify assigned user if not an admin
      if (
        customer?.assignedUserId &&
        !adminUsers.some(u => u.id === customer.assignedUserId)
      ) {
        await notificationService.createNotification({
          userId: customer.assignedUserId,
          title: "Customer Assigned",
          message: `You have been assigned a new customer: ${customer.companyName}`,
          type: "customer",
          entityType: "customer",
          entityId: customer.id,
        });
      }

      res.status(201).json(customer);
    } catch (error) {
      console.error("❌ Error creating customer:", error);
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  // app.post("/api/customers", upload.array("files"), async (req, res) => {
  //   try {
  //     const userId = Number(req.user?.id);
  //     const files = req.files as Express.Multer.File[];
  //     const customerData = JSON.parse(req.body.data);
  //     const parsed = insertCustomerSchema.parse(customerData);

  //     // Upload files to GCP if any
  //     let uploadedFilePaths: string[] = [];
  //     if (files && files.length > 0) {
  //       uploadedFilePaths = await uploadCustomerFiles(files, userId);
  //     }

  //     const customer = await storage.createCustomer({
  //       ...parsed,
  //       customerFiles: uploadedFilePaths,
  //     });

  //     const actingUser = await storage.getUser(req.user!.id);

  //     const users = await storage.getAdminUsers();
  //     for (const user of users) {
  //       await notificationService.createNotification({
  //         userId: user.id,
  //         title: "New Customer Added",
  //         message: `A new customer has been added: ${customer.companyName} by ${actingUser?.username}`,
  //         type: "customer",
  //         entityType: "customer",
  //         entityId: customer.id,
  //       });
  //     }

  //     // Notify assigned user if applicable
  //     if (customer?.assignedUserId && !users.some(u => u.id === customer.assignedUserId)) {
  //       await notificationService.createNotification({
  //         userId: customer.assignedUserId,
  //         title: "Customer Added",
  //         message: `You have been assigned a new customer: ${customer.companyName}`,
  //         type: "customer",
  //         entityType: "customer",
  //         entityId: customer.id,
  //       });
  //     }

  //     res.status(201).json(customer);
  //   } catch (error) {
  //     console.error("❌ Error creating customer:", error);
  //     res.status(400).json({ error: "Invalid customer data" });
  //   }
  // });

  app.put("/api/customers/:id", async (req, res) => {
    try {

      const id = parseInt(req.params.id);
      const customerData = insertCustomerSchema.partial().parse(req.body);

      console.log("Hello updating the /api/customers here here is the data ", customerData)

      const oldCustomer = await storage.getCustomer(id);
      if (!oldCustomer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const customer = await storage.updateCustomer(id, customerData);

      // Get acting user (the one performing the update)
      const actingUser = await storage.getUser(req.user!.id);

      // Build change summary for admins
      const changedFields: string[] = [];
      for (const key of Object.keys(customerData)) {
        const oldVal = (oldCustomer as any)[key];
        const newVal = (customer as any)[key];
        if (oldVal !== newVal) {
          changedFields.push(
            `${key}: "${oldVal ?? "null"}" → "${newVal ?? "null"}"`
          );
        }
      }
      const changesSummary =
        changedFields.length > 0
          ? changedFields.join(", ")
          : "No field changes detected.";

      // Notify all admins
      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Customer Updated",
          message: `Customer "${customer.companyName}" was updated by ${actingUser?.username || "Unknown User"
            } ID:${actingUser?.id} \n\nChanges: ${changesSummary}`,
          type: "customer",
          entityType: "customer",
          entityId: customer.id,
        });
      }

      // Notify the assigned user if they exist and are not already an admin
      if (
        customer.assignedUserId &&
        !users.some((user) => user.id === customer.assignedUserId)
      ) {
        await notificationService.createNotification({
          userId: customer.assignedUserId,
          title: "Customer Updated",
          message: `Customer "${customer.companyName}" assigned to you has been updated by ${actingUser?.username || "Unknown User"
            }.`,
          type: "customer",
          entityType: "customer",
          entityId: customer.id,
        });
      }

      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(400).json({ error: "Invalid customer data" });
    }
  });
  app.get("/api/unique-lead-contact", async (req, res) => {
    try {
      const reqEmail = (req.query.email as string)?.trim();
      const reqPhone = (req.query.phone as string)?.trim();
      const companyId = Number(req.query.companyId);

      console.log('the company reqested email is ', reqEmail, 'phone is', reqPhone, ' and companyId is ', companyId)

      if (!reqEmail && !reqPhone) {
        return res.status(400).json({
          success: false,
          message: "At least one of email or phone is required to check uniqueness",
        });
      }

      const result = await storage.emailPhoneUniqueLead(companyId, reqEmail ?? "", reqPhone ?? "");
      console.log("Result here : ", result)
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error("Error checking contact uniqueness:", error);
      res.status(500).json({ success: false, message: "Error checking uniqueness of contact" });
    }
  });
 app.get("/api/unique-contact", async (req, res) => {
  try {
    // --- 1. Get all three query params ---
    const { email, phone, id } = req.query as {
      email?: string;
      phone?: string;
      id?: string;
    };

    const reqEmail = email?.trim();
    const reqPhone = phone?.trim();
    const reqId = id?.trim();

    // --- 2. Parse the ID to exclude ---
    const excludeId =
      reqId && reqId !== "new" && reqId !== "0"
        ? parseInt(reqId, 10)
        : undefined;

    // Optional: Validate the ID if it's provided but not valid
    if (reqId && !excludeId && reqId !== "new" && reqId !== "0") {
      return res.status(400).json({ success: false, message: "Invalid contact ID" });
    }

    if (!reqEmail && !reqPhone) {
      return res.status(400).json({
        success: false,
        message: "At least one of email or phone is required to check uniqueness",
      });
    }

    // --- 3. Pass all three values to the storage function ---
    const result = await storage.emailPhoneUnique(
      reqEmail,
      reqPhone,
      excludeId
    );
    
    console.log("Result here : ", result);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Error checking contact uniqueness:", error);
    res.status(500).json({
      success: false,
      message: "Error checking uniqueness of contact",
    });
  }
});
  app.get("/api/unique-opportunity-name", async (req, res) => {
    try {
      const opportunityName = (req.query.name as string)?.trim();

      if (!opportunityName) {
        return res.status(400).json({
          success: false,
          message: "Opportunity name is required to check its uniqueness",
        });
      }

      const result = await storage.opportunityNameUniqueness(opportunityName);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error("Error checking contact uniqueness:", error);
      res.status(500).json({ success: false, message: "Error checking uniqueness of contact" });
    }
  });



  app.get("/api/related-data", async (req, res) => {
    try {
      // Call the function that fetches all related data
      const data = await storage.getnewMeetingdata();

      // Send structured response to frontend
      return res.status(200).json({
        success: true,
        message: "Related data fetched successfully",
        data, // contains leads, opportunities, contacts
      });
    } catch (error) {
      console.error("Error fetching related data:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const customer = await storage.getCustomer(id);
      const actingUser = await storage.getUser(req.user!.id);
      await deleteAvatar("customers", customer!.id);
      await storage.deleteCustomer(id);

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Customer Deleted",
          message: `Customer "${customer?.companyName}" was deleted by ${actingUser?.username || "Unknown User"} ID:${actingUser?.id}`,
          type: "customer",
          entityType: "customer",
          entityId: customer?.id,
        });
      }
      if (
        customer?.assignedUserId &&
        !users.some((user) => user.id === customer.assignedUserId)
      ) {
        await notificationService.createNotification({
          userId: customer.assignedUserId,
          title: "Customer Deleted",
          message: `Customer "${customer.companyName}" was deleted`,
          type: "customer",
          entityType: "customer",
          entityId: customer.id,
        });
      }

      res.status(200).json(customer);

    } catch (error: any) {
      console.error("Delete customer error:", error);
      const message = error?.message || "";
      const code = error?.code || "";
      if (
        code === "23503" ||
        message.includes("SQLITE_CONSTRAINT_FOREIGNKEY")
      ) {
        return res.status(409).json({
          error:
            "Cannot delete this customer because they are linked to other records (e.g., leads, tasks, or opportunities).",
        });
      }
      res.status(500).json({ error: "Failed to delete customer." });
    }
  });
  app.get("/api/opportunities/user/:userId", async (req, res) => {
    try {
      const role = req.query.role as string;
      const userId = Number(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      // --- Pagination ---
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 25; // Default to 25
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const pagination = { limit, offset };

      // --- 👇 Parse ALL Filters from req.query 👇 ---
      const filters = {
        search: req.query.search as string | undefined,
        stage: req.query.stage as string | undefined,
        priority: req.query.priority as string | undefined,
        type: req.query.type as string | undefined,
        assignedUser: req.query.assignedUser as string | undefined,
        createdBy: req.query.createdBy as string | undefined,
        companyName: req.query.companyName as string | undefined,
        pipeline: req.query.pipeline as string | undefined,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
        valueRange: {
          min: req.query.minValue ? parseFloat(req.query.minValue as string) : undefined,
          max: req.query.maxValue ? parseFloat(req.query.maxValue as string) : undefined,
        },
        closeDateRange: {
          from: req.query.closeDateFrom ? new Date(req.query.closeDateFrom as string) : undefined,
          to: req.query.closeDateTo ? new Date(req.query.closeDateTo as string) : undefined,
        },
        createdDateRange: {
          from: req.query.createdDateFrom ? new Date(req.query.createdDateFrom as string) : undefined,
          to: req.query.createdDateTo ? new Date(req.query.createdDateTo as string) : undefined,
        },
        closedStatus: { // Parse closed status
          all: !req.query.closedStatus, // If param doesn't exist, assume 'all'
          open: req.query.closedStatus === 'open',
          closedWon: req.query.closedStatus === 'closedWon',
          closedLost: req.query.closedStatus === 'closedLost',
        }
      };

      // Clean out 'all' strings if necessary (handled in storage layer now)


      //  Fetch user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let opportunities;

      //  Admin: get all opportunities with filters
      if (role === "admin") {
        opportunities = await storage.getOpportunities(filters, pagination);
      }

      //  Associate: only own opportunities
      else if (user.userType === "associate") {
        opportunities = await storage.getOpportunitiesByUser(userId, filters, pagination);
      }

      //  Team Lead / Manager logic
      else {
        const teams = await storage.getTeamsByUserId(userId);

        if (!teams || teams.length === 0) {
          // No teams → only own opportunities
          opportunities = await storage.getOpportunitiesByUser(userId, filters, pagination);
        } else {
          const memberIds: number[] = [];

          for (const t of teams) {
            for (const m of t.team.members) {
              const type = m.user.userType;

              // 🟢 Team Lead: only associates
              if (user.userType === "team-lead" && type === "associate") {
                memberIds.push(m.user.id);
              }

              // 🟢 Manager: associates + team-leads
              if (
                user.userType === "manager" &&
                type !== null &&
                ["associate", "team-lead"].includes(type)
              ) {
                memberIds.push(m.user.id);
              }
            }
          }
          // Include self
          memberIds.push(userId);
          opportunities = await storage.getOpportunitiesByUserIds(memberIds, filters, pagination);
        }
      }

      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post("/api/opportunities", async (req, res) => {
    console.log("Closed Won here with data : ", req.body)
    try {
      console.log("Creating opportunity with data:", JSON.stringify(req.body, null, 2));
      const opportunityData = insertOpportunitySchema.parse(req.body);
      console.log("Parsed opportunity data:", JSON.stringify(opportunityData, null, 2));
      const opportunity = await storage.createOpportunity(opportunityData);
      // --- ADD THIS LINE ---
      eventNotificationService.notifyOnEvent(req.user!, "new_opportunity", opportunity);
      await storage.createActivity({
        type: "opportunity_created",
        description: `Opportunity ${opportunity.name} was created`,
        entityType: "opportunity",
        entityId: opportunity.id,
        userId: req.user!.id,
      });
      res.status(201).json(opportunity);
      const users = await storage.getAdminUsers();
      const notifiopportunity = await storage.getOpportunity(opportunity.id);
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "New Opportunity Created",
          message: `A new opportunity has been created: ${notifiopportunity?.name ?? "Unknown"}, Value: ${notifiopportunity?.value ?? "N/A"}
          , Stage: ${notifiopportunity?.stage ?? "N/A"}, Expected Close Date: ${notifiopportunity?.expectedCloseDate ? new Date(notifiopportunity.expectedCloseDate).toLocaleDateString() : "N/A"},
          Converted from ${notifiopportunity?.leadName ?? "N/A"}, assigned to ${notifiopportunity?.assignedUserName ?? "Unassigned"}, 
          Customer: ${notifiopportunity?.companyName ?? "N/A"}, Contact: ${notifiopportunity?.associatedContactName ?? "N/A"}`,
          type: "opportunity",
          entityType: "opportunity",
          entityId: opportunity.id,
        });
      }
      // Notify assigned user only if they are not an admin
      if (
        opportunity.assignedUserId &&
        !users.some((user) => user.id === opportunity.assignedUserId)
      ) {
        await notificationService.createNotification({
          userId: opportunity.assignedUserId,
          title: "New Opportunity Assigned",
          message: `You have been assigned a new opportunity: ${opportunity.name}, 
          Value: ${opportunity.value},
          Stage: ${opportunity.stage}, 
          Expected Close Date: ${opportunity.expectedCloseDate ? new Date(opportunity.expectedCloseDate).toLocaleDateString() : "N/A"},
          Converted from ${opportunity?.leadName ?? "N/A"},
          Assigned to ${opportunity?.assignedUserName ?? "Unassigned"},
          Customer: ${opportunity?.companyName ?? "N/A"}, 
          Contact: ${opportunity?.associatedContactName ?? "N/A"}`,
          type: "opportunity",
          entityType: "opportunity",
          entityId: opportunity.id,
        });
      }

    } catch (error: any) {
      console.error("Error creating opportunity:", error);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(400).json({ error: "Invalid opportunity data", details: error instanceof Error ? error.message : String(error) });
    }
  });
  app.put("/api/opportunities-with-files/:id", upload.array("files"), async (req, res) => {
    try {
      const opportunityId = Number(req.params.id);
      console.log("the opportunity with files endpoint is running")
      if (isNaN(opportunityId)) {
        return res.status(400).json({ error: "Invalid opportunity ID" });
      }


      const userId = Number(req.user?.id);
      const fields = req.body;
      const files = req.files as Express.Multer.File[];

      //  Parse the serialized JSON data
      const opportunityData = JSON.parse(req.body.data);
      console.log("the opportunity with files endpoint is running with opportunity data", opportunityData)



      //  Fetch existing customer
      const existingOpportunity = await storage.getOpportunity(opportunityId);
      if (!existingOpportunity) {
        return res.status(404).json({ error: "opportunity not found" });
      }
      console.log("the existing opportunitiy is ", existingOpportunity)

      //  Upload any new files to GCP
      let newFilePaths: string[] = [];
      if (files && files.length > 0) {
        newFilePaths = await uploadOpportunityFiles(files, opportunityId);
      }

      console.log("the new filepaths are", newFilePaths)
      //  Combine existing + new file paths
      const allOpportunityFiles = [
        ...(existingOpportunity.opportunityFiles || []),
        ...newFilePaths,
      ];
      console.log("the all opportunity files are ", allOpportunityFiles)
      const { createdAt, updatedAt, expectedCloseDate, actualCloseDate, ...cleanOpportunityData } = opportunityData;

      //  Save updated data
      const updatedOpportunity = await storage.updateOpportunity(opportunityId, {
        ...cleanOpportunityData,
        opportunityFiles: allOpportunityFiles,
        updatedAt: new Date(),
      });
      //  Optionally notify assigned user
      if (
        opportunityData.assignedUserId &&
        opportunityData.assignedUserId !== updatedOpportunity.assignedUserId
      ) {
        const actingUser = await storage.getUser(userId);
        await notificationService.createNotification({
          userId: opportunityData.assignedUserId,
          title: "Customer Assigned",
          message: `${actingUser?.username ?? "Someone"} assigned you to ${updatedOpportunity.companyName}`,
          type: "customer",
          entityType: "customer",
          entityId: updatedOpportunity.id,
        });
      }

      console.log("Customer updated with files:", allOpportunityFiles);

      res.json({
        ...updatedOpportunity,
        // customerFiles: formattedFiles,
        customerFiles: allOpportunityFiles,
      });
    } catch (error) {
      console.error("❌ Error updating opportunity with files:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/opportunity-files/:opportunityId", async (req, res) => {
    try {
      const opportunityId = Number(req.params.opportunityId);
      const { filePath } = req.body;
      console.log(`delete muttation customer id is : ${opportunityId} and filepath is ${filePath}`)

      if (isNaN(opportunityId) || !filePath) {
        return res.status(400).json({ error: "Invalid opportunity ID or file path" });
      }

      //  Get existing customer
      const existingOpportunity = await storage.getOpportunity(opportunityId);
      if (!existingOpportunity) {
        return res.status(404).json({ error: "opportunity not found" });
      }

      //  Delete file from GCP
      await deleteFilesFromGCP([filePath]);

      //  Remove from DB array
      const updatedFiles = (existingOpportunity.opportunityFiles || []).filter(
        (file: string) => file !== filePath
      );

      await storage.updateOpportunity(opportunityId, {
        ...existingOpportunity,
        opportunityFiles: updatedFiles,
      } as any);

      res.json({ success: true, message: "File deleted", filePath });
    } catch (error: any) {
      console.error("❌ Error deleting file:", error);
      res.status(500).json({ error: "Error deleting file", details: error.message });
    }
  });

  app.put("/api/opportunities/:id", async (req, res) => {
    try {

      console.log("Is Closed Won")
      const id = parseInt(req.params.id);
      const transformedBody = {
        ...req.body,
        actualCloseDate: req.body.actualCloseDate ? new Date(req.body.actualCloseDate) : undefined,
      };
      const opportunityData = insertOpportunitySchema.partial().parse(transformedBody);
      const opportunity = await storage.updateOpportunity(id, opportunityData);
      const users = await storage.getAdminUsers();
      const updatedOpp = await storage.getOpportunity(opportunity.id);
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Opportunity Updated",
          message: `Opportunity "${updatedOpp?.name ?? "Unknown"}" has been updated.
        New Value: ${updatedOpp?.value ?? "N/A"},
        Stage: ${updatedOpp?.stage ?? "N/A"},
        Expected Close Date: ${updatedOpp?.expectedCloseDate
              ? new Date(updatedOpp.expectedCloseDate).toLocaleDateString()
              : "N/A"
            },
        Assigned To: ${updatedOpp?.assignedUserName ?? "Unassigned"},
        Customer: ${updatedOpp?.companyName ?? "N/A"},
        Contact: ${updatedOpp?.associatedContactName ?? "N/A"}`,
          type: "opportunity",
          entityType: "opportunity",
          entityId: opportunity.id,
        });
      }

      if (opportunity.assignedUserId && !users.some((user) => user.id === opportunity.assignedUserId)) {
        await notificationService.createNotification({
          userId: opportunity.assignedUserId,
          title: "Your Opportunity Updated",
          message: `The opportunity "${opportunity.name}" assigned to you has been updated.
        Value: ${opportunity.value ?? "N/A"},
        Stage: ${opportunity.stage ?? "N/A"},
        Expected Close Date: ${opportunity.expectedCloseDate
              ? new Date(opportunity.expectedCloseDate).toLocaleDateString()
              : "N/A"
            },
        Customer: ${opportunity.companyName ?? "N/A"},
        Contact: ${opportunity.associatedContactName ?? "N/A"}`,
          type: "opportunity",
          entityType: "opportunity",
          entityId: opportunity.id,
        });
      }

      const updates = req.body; // This is the payload, e.g., { stage: "closed lost", isClosedLost: true, ... }

      // --- THIS IS THE LOGIC YOU NEED ---

      // Check for "Closed Won" (Converted to Customer)
      if (updates.isClosedWon === true || updates.stage === "closed won") {

        eventNotificationService.notifyOnEvent(req.user!, "opportunity_converted", opportunity);

      }
      // ELSE, check for "Closed Lost"
      else if (updates.isClosedLost === true || updates.stage === "closed lost") {

        // Call with the new event type
        eventNotificationService.notifyOnEvent(req.user!, "opportunity_closed_lost", opportunity);

      }

      res.json(opportunity);
    } catch (error: any) {
      console.error("Error updating opportunity:", error);
      res.status(400).json({
        error: "Invalid opportunity data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/opportunities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const opportunity = await storage.getOpportunity(id);
      const filePaths = opportunity?.opportunityFiles || [];
      // Delete associated files from GCP
      if (filePaths.length > 0) {
        await deleteFilesFromGCP(filePaths);
      }
      await storage.deleteOpportunity(id);

      await storage.createActivity({
        type: "opportunity_deleted",
        description: opportunity
          ? `Opportunity "${opportunity.name}" was deleted`
          : `An opportunity (ID: ${id}) was deleted`,
        entityType: "opportunity",
        entityId: opportunity?.id,
        userId: req.user!.id,
      });


      const users = await storage.getAdminUsers();
      const actingUser = await storage.getUser(req.user!.id);

      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Opportunity Deleted",
          message: `Opportunity "${opportunity?.name}", Value: ${opportunity?.value ?? "N/A"}, 
             Stage: ${opportunity?.stage ?? "N/A"} was deleted by ${actingUser?.username || "Unknown User"} ID:${actingUser?.id}`,
          type: "opportunity",
          entityType: "opportunity",
          entityId: opportunity?.id,
        });
      }

      if (opportunity?.assignedUserId) {
        await notificationService.createNotification({
          userId: opportunity.assignedUserId,
          title: "Your Opportunity Deleted",
          message: opportunity
            ? `Your assigned opportunity "${opportunity.name}" (Value: ${opportunity.value ?? "N/A"}) has been deleted.`
            : `An opportunity assigned to you (ID: ${id}) has been deleted.`,
          type: "opportunity",
          entityType: "opportunity",
          entityId: opportunity?.id,
        });
      }
      if (opportunity?.assignedUserId && !users.some((user) => user.id === opportunity.assignedUserId)) {
        await notificationService.createNotification({
          userId: opportunity.assignedUserId,
          title: "Your Opportunity Updated",
          message: `Your assigned opportunity "${opportunity.name}" (Value: ${opportunity.value ?? "N/A"}) has been deleted.`,
          type: "opportunity",
          entityType: "opportunity",
          entityId: opportunity.id,
        });
      }
      res.status(200).json(opportunity);

    } catch (error: any) {
      console.error("Delete opportunity error:", error);
      const message = error?.message || "";
      const code = error?.code || "";

      if (code === "23503" || message.includes("SQLITE_CONSTRAINT_FOREIGNKEY")) {
        return res.status(409).json({
          error:
            "Cannot delete this opportunity because it is linked to other records (e.g., tasks, activities).",
        });
      }

      res.status(500).json({ error: "Failed to delete opportunity" });
    }
  });


  app.get("/api/contacts-by-company", async (req, res) => {
    try {
      const companyId = Number(req.query.companyId);
      if (!companyId) {
        return res.status(400).json({ success: false, message: "companyid is required" })
      }
      const result = await storage.getContactsByCompany(companyId)
      return res.status(200).json({ success: true, contacts: result, message: "contacts fetched successfully" })
    } catch (error) {
      console.error("Error fetching contacts by company:", error);
      res.status(500).json({ error: "Failed to fetch contacts by company" });
    }
  });
  app.get("/api/contacts/user", async (req, res) => {

    console.log("In /api/contacts/user")
    try {
      const userId = parseInt(req.query.userId as string); // Get userId from query
      const role = req.query.role as string;

      // --- Pagination ---
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 25; // Default to 25
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const pagination = { limit, offset };

      console.log("Parsed request params:", { userId, role, limit, offset });

      if (isNaN(userId)) {
        console.error("Invalid userId:", req.query.userId);
        return res.status(400).json({ error: "Invalid userId provided" });
      }

      // --- 👇 Parse ALL Contact Filters from req.query 👇 ---
      const filters = {
        search: req.query.search as string | undefined,
        // Parse status carefully (expecting 'true', 'false', or missing/null)
        status: req.query.status === 'true' ? true : req.query.status === 'false' ? false : null,
        assignedUser: req.query.assignedUser as string | undefined,
        createdBy: req.query.createdBy as string | undefined,
        jobTitle: req.query.jobTitle as string | undefined,
        industry: req.query.industry as string | undefined,
        countryRegion: req.query.countryRegion as string | undefined,
        timeZone: req.query.timeZone as string | undefined,
        marketingStatus: req.query.marketingStatus as string | undefined,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
        // tags: req.query.tags ? (req.query.tags as string).split(',') : undefined, // Add if needed
      };

      // Clean out 'all' strings before logging or passing
      Object.keys(filters).forEach(key => {
        if ((filters as any)[key] === 'all') {
          (filters as any)[key] = undefined; // Set to undefined if 'all'
        }
      });

      // Fetch user info (to get userType)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let contacts;

      //  Admin: get all contacts
      if (role === "admin") {
        contacts = await storage.getContacts(filters, pagination);
      }

      //  Associate: only own created/assigned contacts
      else if (user.userType === "associate") {
        contacts = await storage.getContactsByUser(userId, filters, pagination);
      }

      //  Team Lead or Manager
      else {
        // get teams the user belongs to
        const teams = await storage.getTeamsByUserId(userId);

        if (!teams || teams.length === 0) {
          // no teams → fallback to own contacts
          contacts = await storage.getContactsByUser(userId, filters, pagination);
        } else {
          const memberIds: number[] = [];

          for (const t of teams) {
            for (const m of t.team.members) {
              const type = m.user.userType;

              // 🟢 Team Lead: includes only associates
              if (user.userType === "team-lead" && type === "associate") {
                memberIds.push(m.user.id);
              }

              // 🟢 Manager: includes associates + team leads
              if (
                user.userType === "manager" &&
                type !== null &&
                ["associate", "team-lead"].includes(type)
              ) {
                memberIds.push(m.user.id);
              }
            }
          }

          // include self
          memberIds.push(userId);

          //  Fetch contacts for all member IDs
          contacts = await storage.getContactsByUserIds(memberIds, filters, pagination);
        }
      }



      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.get("/api/contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const contact = await storage.getContact(id);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch contact" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const contactData = req.body;
      const contact = await storage.createContact({
        ...contactData,
        createdByUserId: req.user!.id,  // enforce creator
      });

      res.status(201).json(contact);
      await storage.createActivity({
        type: "contact_created",
        description: `Contact "${contact.firstName}" was created`,
        entityType: "contact",
        entityId: contact.id,
        userId: req.user!.id,
      });


      const users = await storage.getAdminUsers();
      const actingUser = await storage.getUser(req.user!.id);

      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "New Contact Created",
          message: `A new contact "${contact.firstName}" "${contact.lastName}" has been created by ${actingUser?.username || "Unknown User"} ID:${actingUser?.id}.`,
          type: "contact",
          entityType: "contact",
          entityId: contact.id,
        });
      }
      if (contact?.assignedUserId && !users.some((user) => user.id === contact.assignedUserId)) {
        await notificationService.createNotification({
          userId: contact.assignedUserId,
          title: "New Contact Assigned",
          message: `You have been assigned a new contact: "${contact.firstName}" `,
          type: "contact",
          entityType: "contact",
          entityId: contact.id,
        });
      }
    } catch (error: any) {
      console.error("Error creating contact:", error);
      res.status(400).json({
        error: "Invalid contact data",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.put("/api/contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const oldContact = await storage.getContact(id);
      if (!oldContact) {
        return res.status(404).json({ error: "Contact not found" });
      }

      const contactData = insertContactSchema.partial().parse(req.body);
      const contact = await storage.updateContact(id, contactData);

      res.json(contact);

      const users = await storage.getAdminUsers();
      const actingUser = await storage.getUser(req.user!.id);

      // Track changes for all fields
      // Track changes for all fields, but exclude system fields
      const excludeFields = ["createdAt", "updatedAt", "id"];
      const changes: string[] = [];

      for (const key of Object.keys(oldContact)) {
        if (excludeFields.includes(key)) continue;

        const oldValue = (oldContact as any)[key];
        const newValue = (contact as any)[key];
        if (oldValue !== newValue) {
          changes.push(`${key}: ${oldValue ?? "N/A"} → ${newValue ?? "N/A"}`);
        }
      }


      // Notify admins with detailed changes
      if (changes.length > 0) {
        for (const user of users) {
          await notificationService.createNotification({
            userId: user.id,
            title: "Contact Updated",
            message: `Contact "${oldContact.firstName}" was updated by ${actingUser?.username || "Unknown User"
              } ID:${actingUser?.id} \nChanges:\n${changes.join("\n")}`,
            type: "contact",
            entityType: "contact",
            entityId: contact?.id,
          });
        }
      }

      // Notify assigned user if not one of the admins
      if (
        contact.assignedUserId &&
        !users.some((user) => user.id === contact.assignedUserId)
      ) {
        await notificationService.createNotification({
          userId: contact.assignedUserId,
          title: "Your Contact Updated",
          message: `The contact "${contact.firstName}" assigned to you has been updated.\n\nChanges:\n${changes.join(
            "\n"
          )}`,
          type: "contact",
          entityType: "contact",
          entityId: contact?.id,
        });
      }
    } catch (error: any) {
      console.error("Error updating contact:", error);
      res.status(400).json({
        error: "Invalid contact data",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Fetch contact details *before* deleting (to use in logs & notifications)
      const contact = await storage.getContact(id);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      await deleteAvatar("contacts", contact.id)

      // Delete the contact
      await storage.deleteContact(id);

      const users = await storage.getAdminUsers();
      const actingUser = await storage.getUser(req.user!.id);

      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Contact Deleted",
          message: `Contact Name : "${contact.firstName}"${contact.lastName}, Comapny name : ${contact.companyName} was deleted by ${actingUser?.username || "Unknown User"} ID:${actingUser?.id}`,
          type: "contact",
          entityType: "contact",
          entityId: contact.id,
        });
      }

      // Notify assigned user (if any)
      if (
        contact.assignedUserId &&
        !users.some((user) => user.id === contact.assignedUserId)
      ) {
        await notificationService.createNotification({
          userId: contact.assignedUserId,
          title: "Your Contact Deleted",
          message: `Your assigned contact Name:"${contact.firstName}" ${contact.lastName}$, Company name: ${contact.companyName} has been deleted.`,
          type: "contact",
          entityType: "contact",
          entityId: contact.id,
        });
      }
      res.status(200).send(contact);
    } catch (error: any) {
      console.error("Delete contact error:", error);
      const message = error?.message || "";
      const code = error?.code || "";

      // Optional: handle foreign key constraint if the contact is linked to other records
      if (code === "23503" || message.includes("SQLITE_CONSTRAINT_FOREIGNKEY")) {
        return res.status(409).json({
          error:
            "Cannot delete this contact because it is linked to other records (e.g., customers, opportunities).",
        });
      }

      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    try {


      const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const pagination = { limit, offset };

      // --- User Info ---
      // Ensure req.user is populated correctly by your auth middleware
      // const user = authReq.user; // Use the casted request
      // Fallback for testing if auth isn't set up yet, REMOVE in production
      const user = (req as any).user || { id: parseInt(req.query.userId as string || '0'), userType: 'associate' }; // Example fallback, adjust as needed

      const role = req.query.role as string; // Role might be redundant if userType is reliable

      if (!user || isNaN(user.id)) {
        console.error("User ID missing or invalid in request");
        return res.status(401).json({ error: "Unauthorized or Invalid User" });
      }



      // --- 👇 Parse ALL Task Filters from req.query 👇 ---
      const filters = {
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined, // Comes from activeTab
        assignedUserId: req.query.assignedUserId
          ? parseInt(req.query.assignedUserId as string)
          : undefined, // Keep other filters if needed
        dueDate: req.query.dueDate
          ? new Date(req.query.dueDate as string)
          : undefined,
      };

      // Handle 'my-tasks' filter specifically
      if (filters.status === 'my-tasks') {
        filters.assignedUserId = user.id; // Filter by assigned user
        filters.status = undefined; // Remove status filter itself
      }
      // Handle 'all' - remove status filter
      else if (filters.status === 'all') {
        filters.status = undefined;
      }



      let tasks: any[] = []; // Use any[] to match storage return type for now


      //  Admin — can view all tasks
      if (role === "admin") {
        tasks = await storage.getTasks(filters, pagination);
      }

      //  Associate — only own tasks
      else if (user.userType === "associate") {
        tasks = await storage.getTasksByUser(user.id, filters, pagination);
      }

      //  Team Lead or Manager
      else {
        const teams = await storage.getTeamsByUserId(user.id);

        if (!teams || teams.length === 0) {
          // No team → only own tasks
          tasks = await storage.getTasksByUser(user.id, filters, pagination);
        } else {
          const memberIds: number[] = [];

          for (const t of teams) {
            for (const m of t.team.members) {
              const type = m.user.userType;

              // 🟢 Team Lead → associates
              if (user.userType === "team-lead" && type === "associate") {
                memberIds.push(m.user.id);
              }

              // 🟢 Manager → associates + team leads
              if (
                user.userType === "manager" &&
                type !== null &&
                ["associate", "team-lead"].includes(type)
              ) {
                memberIds.push(m.user.id);
              }
            }
          }

          // Include own ID
          memberIds.push(user.id);

          //  Get all tasks belonging to these users
          tasks = await storage.getTasksByUserIds(memberIds, filters, pagination);
        }
      }

      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });


  app.post("/api/tasks", upload.array("attachments"), async (req, res) => {
    try {
      const userId = req.user!.id;


      // 🧩 Step 1: Parse body safely
      const parsedData: any = { ...req.body };
      console.log("parsedData:", parsedData);

      // Convert JSON string fields back to objects/arrays
      const jsonFields = ["labels", "checklist", "dependencies", "attachments"];
      for (const field of jsonFields) {
        if (parsedData[field] && typeof parsedData[field] === "string") {
          try {
            parsedData[field] = JSON.parse(parsedData[field]);
          } catch {
            parsedData[field] = parsedData[field].split(",");
          }
        }
      }
      if (Array.isArray(parsedData.dependencies)) {
        parsedData.dependencies = parsedData.dependencies.join(",");
      }

      // Convert numeric fields
      const intFields = [
        "duration",
        "effort",
        "leadId",
        "customerId",
        "opportunityId",
        "assignedUserId",
        "createdByUserId",
      ];
      for (const field of intFields) {
        if (parsedData[field]) parsedData[field] = Number(parsedData[field]);
      }

      // Handle empty date fields
      if (parsedData.dueDate === "" || parsedData.dueDate === undefined)
        parsedData.dueDate = null;
      if (parsedData.completedDate === "" || parsedData.completedDate === undefined)
        parsedData.completedDate = null;

      // Step 2: Validate task data
      const taskData = insertTaskSchema.parse(parsedData);

      // Step 3: Upload attachments to GCP
      const uploadedFiles = Array.isArray(req.files)
        ? (req.files as Express.Multer.File[])
        : [];

      console.log("uploadedFiles:", uploadedFiles);

      // 🟢 Modified uploadFilesToGCP usage — return full public URLs
      const fileUrls =
        uploadedFiles.length > 0
          ? await Promise.all(
            uploadedFiles.map(async (file) => {
              const { Storage } = await import("@google-cloud/storage");
              const rawCredentials = JSON.parse(process.env.GCP_KEY!);
              if (rawCredentials.private_key) {
                rawCredentials.private_key = rawCredentials.private_key.replace(
                  /\\n/g,
                  "\n"
                );
              }

              const storage = new Storage({ credentials: rawCredentials });
              const bucket = storage.bucket("crm_rsp");

              const destination = `tasks/${userId}/${Date.now()}-${file.originalname}`;
              const blob = bucket.file(destination);

              await blob.save(file.buffer, {
                contentType: file.mimetype,
                resumable: false,
              });

              // ✅ Return full public URL (assuming public bucket)
              const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
              return publicUrl;
            })
          )
          : [];

      console.log("fileUrls:", fileUrls);

      // Step 4: Merge attachments (store GCP URLs)
      taskData.attachments = fileUrls;

      // Step 5: Save task in DB
      const task = await storage.createTask(taskData);

      // Step 6: Activity log + notifications
      const actingUser = await storage.getUser(userId);
      const admins = await storage.getAdminUsers();

      await storage.createActivity({
        type: "task_created",
        description: `Task "${task.title}" created by ${actingUser?.username || "Unknown User"
          }.`,
        entityType: "task",
        entityId: task.id,
        userId,
      });

      for (const admin of admins) {
        await notificationService.createNotification({
          userId: admin.id,
          title: "New Task Created",
          message: `Task "${task.title}" created by ${actingUser?.username || "Unknown User"
            }.`,
          type: "task",
          entityType: "task",
          entityId: task.id,
        });
      }

      if (task.assignedUserId && !admins.some((a) => a.id === task.assignedUserId)) {
        await notificationService.createNotification({
          userId: task.assignedUserId,
          title: "New Task Assigned",
          message: `You’ve been assigned a new task: ${task.title}`,
          type: "task",
          entityType: "task",
          entityId: task.id,
        });
      }

      eventNotificationService.notifyOnEvent(req.user!, "task_assigned", task);

      res.status(201).json(task);
    } catch (error: any) {
      console.error("❌ Error creating task:", error);
      res.status(400).json({
        error: "Invalid task data",
        details: error.message || String(error),
      });
    }
  });



  app.put("/api/tasks/:id", upload.array("attachments"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;

      const oldTask = await storage.getTask(id);
      if (!oldTask) return res.status(404).json({ error: "Task not found" });

      // 🧩 Step 1: Parse and normalize body
      const parsedData: any = { ...req.body };

      const jsonFields = [
        "labels",
        "checklist",
        "dependencies",
        "attachments",
        "removedAttachments",
      ];

      for (const field of jsonFields) {
        if (parsedData[field] && typeof parsedData[field] === "string") {
          try {
            parsedData[field] = JSON.parse(parsedData[field]);
          } catch {
            parsedData[field] = parsedData[field].split(",");
          }
        }
      }

      if (Array.isArray(parsedData.dependencies)) {
        parsedData.dependencies = parsedData.dependencies.join(",");
      }

      // Convert numeric fields
      const intFields = [
        "duration",
        "effort",
        "leadId",
        "customerId",
        "opportunityId",
        "assignedUserId",
        "createdByUserId",
      ];
      for (const field of intFields) {
        if (parsedData[field]) parsedData[field] = Number(parsedData[field]);
      }

      if (!parsedData.dueDate) parsedData.dueDate = null;
      if (!parsedData.completedDate) parsedData.completedDate = null;

      // ✅ Step 2: Validate with Zod
      const taskData = insertTaskSchema.partial().parse(parsedData);

      // ✅ Step 3: Handle new uploads
      const uploadedFiles = Array.isArray(req.files)
        ? (req.files as Express.Multer.File[])
        : [];

      // 🧩 Define bucket + base URL once
      const { Storage } = await import("@google-cloud/storage");
      const rawCredentials = JSON.parse(process.env.GCP_KEY!);
      if (rawCredentials.private_key) {
        rawCredentials.private_key = rawCredentials.private_key.replace(/\\n/g, "\n");
      }

      const storageClient = new Storage({ credentials: rawCredentials });
      const bucketName = process.env.GCP_BUCKET_NAME || "crm_rsp";
      const bucket = storageClient.bucket(bucketName);
      const baseUrl = `https://storage.googleapis.com/${bucketName}/`;

      const newFileUrls =
        uploadedFiles.length > 0
          ? await Promise.all(
            uploadedFiles.map(async (file) => {
              const destination = `tasks/${userId}/${Date.now()}-${file.originalname}`;
              const blob = bucket.file(destination);
              await blob.save(file.buffer, {
                contentType: file.mimetype,
                resumable: false,
              });
              return `${baseUrl}${destination}`;
            })
          )
          : [];

      // ✅ Step 4: Handle attachment removals
      const removedAttachments: string[] = taskData?.removedAttachments || [];

      // 🧩 Normalize both full URLs and relative paths for comparison
      const normalizePath = (urlOrPath: string) =>
        urlOrPath.startsWith(baseUrl) ? urlOrPath.slice(baseUrl.length) : urlOrPath;

      // Compute remaining attachments
      const remainingAttachments = (oldTask.attachments || []).filter(
        (file: string) =>
          !removedAttachments.some(
            (removed) => normalizePath(removed) === normalizePath(file)
          )
      );

      // ✅ Delete removed attachments from GCP safely
      if (removedAttachments.length > 0) {
        await Promise.all(
          removedAttachments.map(async (fileUrl) => {
            const filePath = normalizePath(fileUrl);
            try {
              await bucket.file(filePath).delete();
            } catch (err: any) {
              console.warn(`⚠️ Could not delete: ${filePath}`, err.message);
            }
          })
        );
      }

      (taskData as any).attachments = [...remainingAttachments, ...newFileUrls];
      delete (taskData as any).removedAttachments;

      // ✅ Step 5: Update task in DB
      const updatedTask = await storage.updateTask(id, taskData);

      res.json(updatedTask);

      // ✅ Step 6: Log activity + notifications
      const users = await storage.getAdminUsers();
      const actingUser = await storage.getUser(userId);

      const excludeFields = ["id", "createdAt", "updatedAt", "attachments"];
      const changes: string[] = [];

      for (const key of Object.keys(oldTask)) {
        if (excludeFields.includes(key)) continue;
        if ((oldTask as any)[key] !== (updatedTask as any)[key]) {
          changes.push(`${key}: ${oldTask[key] ?? "N/A"} → ${updatedTask[key] ?? "N/A"}`);
        }
      }

      if (newFileUrls.length > 0)
        changes.push(`New files uploaded: ${newFileUrls.join(", ")}`);
      if (removedAttachments.length > 0)
        changes.push(`Files deleted: ${removedAttachments.join(", ")}`);

      if (changes.length > 0) {
        for (const user of users) {
          await notificationService.createNotification({
            userId: user.id,
            title: "Task Updated",
            message: `Task "${oldTask.title}" updated by ${actingUser?.username || "Unknown User"
              }.\n\nChanges:\n${changes.join("\n")}`,
            type: "task",
            entityType: "task",
            entityId: updatedTask.id,
          });
        }
      }

      if (
        updatedTask.assignedUserId &&
        !users.some((admin) => admin.id === updatedTask.assignedUserId)
      ) {
        await notificationService.createNotification({
          userId: updatedTask.assignedUserId,
          title: "Your Task Updated",
          message: `The task "${updatedTask.title}" assigned to you has been updated.\n\nChanges:\n${changes.join("\n")}`,
          type: "task",
          entityType: "task",
          entityId: updatedTask.id,
        });
      }
    } catch (error: any) {
      console.error("❌ Error updating task:", error);
      res.status(400).json({
        error: "Invalid task data",
        details: error.message || String(error),
      });
    }
  });





  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;

      // 1️⃣ Fetch task before deleting
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // 2️⃣ Delete attachments from GCP (if any)
      if (task.attachments && task.attachments.length > 0) {
        try {
          const { Storage } = await import("@google-cloud/storage");
          const rawCredentials = JSON.parse(process.env.GCP_KEY!);
          if (rawCredentials.private_key) {
            rawCredentials.private_key = rawCredentials.private_key.replace(/\\n/g, "\n");
          }

          const storageClient = new Storage({ credentials: rawCredentials });
          const bucketName = "crm_rsp";
          const bucket = storageClient.bucket(bucketName);

          // ✅ Delete all attachments based on full URL paths
          await Promise.all(
            task.attachments.map(async (fileUrl: string) => {
              const prefix = `https://storage.googleapis.com/${bucketName}/`;
              const filePath = fileUrl.startsWith(prefix)
                ? fileUrl.slice(prefix.length)
                : null;

              if (filePath) {
                await bucket.file(filePath).delete().catch((err) => {
                  console.warn(`⚠️ Failed to delete file from GCP: ${fileUrl}`, err.message);
                });
              }
            })
          );

          console.log(`✅ Deleted ${task.attachments.length} attachments from GCP`);
        } catch (err) {
          console.error("⚠️ Failed to delete attachments from GCP:", err);
        }
      }

      // 3️⃣ Delete task from DB
      await storage.deleteTask(id);

      // 4️⃣ Log activity
      const actingUser = await storage.getUser(userId);
      await storage.createActivity({
        type: "task_deleted",
        description: task
          ? `Task "${task.title}" was deleted by ${actingUser?.username || "Unknown User"}.`
          : `A task (ID: ${id}) was deleted by ${actingUser?.username || "Unknown User"}.`,
        entityType: "task",
        entityId: task?.id,
        userId,
      });

      // 5️⃣ Send notifications
      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Task Deleted",
          message: `Task "${task?.title}" was deleted by ${actingUser?.username || "Unknown User"} (ID: ${task?.id}).`,
          type: "task",
          entityType: "task",
          entityId: task?.id,
        });
      }

      // Notify assigned user (if not one of the admins)
      if (
        task?.assignedUserId &&
        !users.some((user) => user.id === task.assignedUserId)
      ) {
        await notificationService.createNotification({
          userId: task.assignedUserId,
          title: "Your Task Deleted",
          message: `The task "${task.title}" has been deleted by ${actingUser?.username} (ID: ${actingUser?.id}).`,
          type: "task",
          entityType: "task",
          entityId: task.id,
        });
      }

      // 6️⃣ Respond
      res.status(200).json({ message: "Task deleted successfully", task });
    } catch (error) {
      console.error("❌ Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });


  app.delete("/api/tasks/:id/attachments", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // ✅ Support both ?fileUrl=... and body.fileUrl
      const fileUrl =
        req.body?.fileUrl ||
        req.query?.fileUrl?.toString() ||
        req.headers["x-file-url"]?.toString();

      if (!fileUrl) {
        return res.status(400).json({ error: "fileUrl is required" });
      }

      // --- rest of your existing logic (unchanged) ---
      const { Storage } = await import("@google-cloud/storage");
      const rawCredentials = JSON.parse(process.env.GCP_KEY!);
      if (rawCredentials.private_key) {
        rawCredentials.private_key = rawCredentials.private_key.replace(/\\n/g, "\n");
      }

      const storageClient = new Storage({ credentials: rawCredentials });
      const bucketName = process.env.GCP_BUCKET_NAME || "crm_rsp";
      const bucket = storageClient.bucket(bucketName);
      const baseUrl = `https://storage.googleapis.com/${bucketName}/`;

      const normalizePath = (urlOrPath: string) =>
        urlOrPath.startsWith(baseUrl) ? urlOrPath.slice(baseUrl.length) : urlOrPath;

      const filePath = normalizePath(fileUrl);

      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      try {
        await bucket.file(filePath).delete();
        console.log(`✅ Deleted file: ${filePath}`);
      } catch (err: any) {
        console.warn(`⚠️ File not found or already deleted: ${filePath}`, err.message);
      }

      const updatedAttachments = (task.attachments || []).filter(
        (f: string) => normalizePath(f) !== filePath
      );

      await storage.updateTask(id, { attachments: updatedAttachments });

      res.json({
        message: "Attachment deleted successfully",
        updatedAttachments,
      });
    } catch (error: any) {
      console.error("❌ Error deleting attachment:", error);
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });





  app.get("/api/email-config", async (req, res) => {
    try {
      const userId = req.user!.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const config = await storage.getEmailConfigurationByUserId(userId);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email configuration" });
    }
  });

  app.post("/api/email-config", async (req, res) => {
    try {
      const userId = req.user!.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const configData = insertEmailConfigurationSchema.parse({
        ...req.body,
        userId,
      });
      const config = await storage.createEmailConfiguration(configData);

      const actingUser = await storage.getUser(req.user!.id);


      await storage.createActivity({
        type: "email_config_created",
        description: `Email configuration was created by ${actingUser?.username || "Unknown User"
          }.`,
        entityType: "emailConfigurations",
        entityId: config.id,
        userId,
      });


      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "New Email Configuration",
          message: `An email configuration was created by ${actingUser?.username || "Unknown User"
            } ID:${actingUser?.id}`,
          type: "emailConfigurations",
          entityType: "emailConfigurations",
          entityId: config.id,
        });
      }

      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({ error: "Invalid email configuration" });
    }
  });

  app.post("/api/email-config/test", async (req, res) => {
    const {
      provider,
      email,
      smtpHost,
      smtpPort,
      imapHost,
      imapPort,
      username,
      password,
    } = req.body;

    if (
      !provider ||
      !email ||
      !smtpHost ||
      !smtpPort ||
      !imapHost ||
      !imapPort ||
      !username ||
      !password
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const smtpTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: parseInt(smtpPort) === 465,
        auth: {
          user: username,
          pass: password,
        },
        connectionTimeout: 20000,
        logger: true,
        debug: true,
      });

      await smtpTransporter.verify();
      const userId = req.user!.id;
      const actingUser = await storage.getUser(userId);


      await storage.createActivity({
        type: "email_config_tested",
        description: `Email configuration test performed by ${actingUser?.username || "Unknown User"
          } for account ${email}.`,
        entityType: "emailConfigurations",
        entityId: null,
        userId,
      });


      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Email Configuration Tested",
          message: `${actingUser?.username || "Unknown User"}, ID:${actingUser?.id} tested an email configuration for ${email}.`,
          type: "emailConfigurations",
          entityType: "emailConfigurations",
          entityId: null,
        });
      }

      return res.json({ message: "Connection to email server successful" });
    } catch (error: any) {
      return res.status(500).json({
        error:
          error.message ||
          "Failed to connect to email server. Check credentials and server details.",
      });
    }
  });

  app.put("/api/email-config/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const configData = insertEmailConfigurationSchema.partial().parse(req.body);
      const config = await storage.updateEmailConfiguration(id, configData);

      const userId = req.user!.id;
      const actingUser = await storage.getUser(userId);


      await storage.createActivity({
        type: "email_config_updated",
        description: `Email configuration (ID: ${id}) was updated by ${actingUser?.username || "Unknown User"
          }. `,
        entityType: "emailConfigurations",
        entityId: id,
        userId,
      });


      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Email Configuration Updated",
          message: `Email configuration (ID: ${id}) was updated by ${actingUser?.username || "Unknown User"
            } ID:${actingUser?.id}`,
          type: "emailConfigurations",
          entityType: "emailConfigurations",
          entityId: id,
        });
      }


      res.json(config);
    } catch (error) {
      res.status(400).json({ error: "Invalid email configuration" });
    }
  });


  app.get("/api/emails", async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
        status: req.query.status as string,
        leadId: req.query.leadId ? parseInt(req.query.leadId as string) : undefined,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
      };
      const emails = await storage.getEmails(filters);
      res.json(emails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  app.post("/api/emails", async (req, res) => {
    try {
      const { emaildata, user } = req.body;
      const emailData = insertEmailSchema.parse(emaildata);
      const email = await storage.createEmail(emailData);

      if (!email.scheduledAt) {
        await emailService.sendUserEmail(email, user);
      }

      const userId = req.user!.id;
      const actingUser = await storage.getUser(userId);


      await storage.createActivity({
        type: "email_created",
        description: `Email (ID: ${email.id}) was created by ${actingUser?.username || "Unknown User"
          }.`,
        entityType: "emails",
        entityId: email.id,
        userId,
      });


      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "New Email Created",
          message: `An email (ID: ${email.id}) was created by ${actingUser?.username || "Unknown User"
            } ID: ${actingUser?.id}`,
          type: "emails",
          entityType: "emails",
          entityId: email.id,
        });
      }

      res.status(201).json(email);
    } catch (error) {
      res.status(400).json({ error: "Invalid email data" });
    }
  });

  app.put("/api/emails/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const emailData = insertEmailSchema.partial().parse(req.body);
      const email = await storage.updateEmail(id, emailData);

      const userId = req.user!.id;
      const actingUser = await storage.getUser(userId);

      await storage.createActivity({
        type: "email_updated",
        description: email
          ? `Email (subject: "${email.subject}", ID: ${id}) was updated by ${actingUser?.username || "Unknown User"
          }.`
          : `An email (ID: ${id}) was updated by ${actingUser?.username || "Unknown User"
          }.`,
        entityType: "emails",
        entityId: email?.id,
        userId,
      });

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Email Updated",
          message: `Email (subject: "${email.subject}", ID: ${id}) was updated by ${actingUser?.username || "Unknown User"} ID:${actingUser?.id}.`
          ,
          type: "emails",
          entityType: "emails",
          entityId: email?.id,
        });
      }

      res.status(200).json(email);
    } catch (error) {
      res.status(400).json({ error: "Invalid email data" });
    }
  });

  app.delete("/api/emails/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const email = await storage.getEmail(id);
      await storage.deleteEmail(id);

      const userId = req.user!.id;
      const actingUser = await storage.getUser(userId);

      await storage.createActivity({
        type: "email_deleted",
        description: email
          ? `Email (subject: "${email.subject}", ID: ${id}) was deleted by ${actingUser?.username || "Unknown User"
          } ID:${actingUser?.id}`
          : `An email (ID: ${id}) was deleted by ${actingUser?.username || "Unknown User"
          }.`,
        entityType: "emails",
        entityId: email?.id,
        userId,
      });

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Email Deleted",
          message: email
            ? `Email (subject: "${email.subject}", ID: ${id}) was deleted by ${actingUser?.username || "Unknown User"
            } ID:${actingUser?.id}.`
            : `An email (ID: ${id}) was deleted by ${actingUser?.username || "Unknown User"
            }.`,
          type: "emails",
          entityType: "emails",
          entityId: email?.id,
        });
      }

      res.status(200).json(email);

    } catch (error) {
      res.status(500).json({ error: "Failed to delete email" });
    }
  });

  app.get("/api/email-templates", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const templates = await storage.getEmailTemplates(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email templates" });
    }
  });

  app.post("/api/email-templates", async (req, res) => {
    try {
      const templateData = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(templateData);

      const userId = req.user!.id;
      const actingUser = await storage.getUser(userId);

      await storage.createActivity({
        type: "email_template_created",
        description: `Email template "${template.name}" (ID: ${template.id}) was created by ${actingUser?.username || "Unknown User"
          }.`,
        entityType: "emailTemplates",
        entityId: template.id,
        userId,
      });

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "New Email Template Created",
          message: `Template "${template.name}" (ID: ${template.id}) was created by ${actingUser?.username || "Unknown User"
            } ID:${actingUser?.id}`,
          type: "emailTemplates",
          entityType: "emailTemplates",
          entityId: template.id,
        });
      }

      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ error: "Invalid email template data" });
    }
  });

  app.put("/api/email-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const templateData = insertEmailTemplateSchema.partial().parse(req.body);
      const template = await storage.updateEmailTemplate(id, templateData);

      const userId = req.user!.id;
      const actingUser = await storage.getUser(userId);

      await storage.createActivity({
        type: "email_template_updated",
        description: template
          ? `Email template "${template.name}" (ID: ${id}) was updated by ${actingUser?.username || "Unknown User"
          }.`
          : `An email template (ID: ${id}) was updated by ${actingUser?.username || "Unknown User"
          }.`,
        entityType: "emailTemplates",
        entityId: template.id,
        userId,
      });

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Email Template Updated",
          message: `Template "${template.name}" (ID: ${id}) was updated by ${actingUser?.username || "Unknown User"
            } ID:${actingUser?.id}`,

          type: "emailTemplates",
          entityType: "emailTemplates",
          entityId: template.id,
        });
      }
      res.json(template);
    } catch (error) {
      res.status(400).json({ error: "Invalid email template data" });
    }
  });

  app.delete("/api/email-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const template = await storage.getEmailTemplate(id);
      await storage.deleteEmailTemplate(id);

      const userId = req.user!.id;
      const actingUser = await storage.getUser(userId);

      await storage.createActivity({
        type: "email_template_deleted",
        description: template
          ? `Email template "${template.name}" (ID: ${id}) was deleted by ${actingUser?.username || "Unknown User"
          }.`
          : `An email template (ID: ${id}) was deleted by ${actingUser?.username || "Unknown User"
          }.`,
        entityType: "emailTemplates",
        entityId: template?.id,
        userId,
      });

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Email Template Deleted",
          message: `Template "${template?.name}" (ID: ${id}) was deleted by ${actingUser?.username || "Unknown User"
            } ID:${actingUser?.id}`,
          type: "emailTemplates",
          entityType: "emailTemplates",
          entityId: template?.id,
        });
      }


      res.status(200).json(template);

    } catch (error) {
      res.status(500).json({ error: "Failed to delete email template" });
    }
  });

  app.get("/api/meetings", async (req, res) => {
    try {
      const filters = {
        organizedByUserId: req.query.organizedByUserId ? parseInt(req.query.organizedByUserId as string) : undefined,
        startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
        endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
      };
      const meetings = await storage.getMeetings(filters);
      res.json(meetings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meetings" });
    }
  });


  app.post("/api/meetings", async (req, res) => {
    try {
      const transformedBody = {
        ...req.body,
        startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
      };

      const meetingData = insertMeetingSchema.parse(transformedBody);
      console.log("Parsed meeting data:", JSON.stringify(meetingData, null, 2));

      const meeting = await storage.createMeeting(meetingData);
      console.log("Created meeting:", JSON.stringify(meeting, null, 2));

      const userId = req.user!.id;
      const actingUser = await storage.getUser(userId);

      await storage.createActivity({
        type: "meeting_created",
        description: `Meeting "${meeting.title}" (ID: ${meeting.id}) was created by ${actingUser?.username || "Unknown User"
          }.`,
        entityType: "meetings",
        entityId: meeting.id,
        userId,
      });

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "New Meeting Created",
          message: `Meeting "${meeting.title}" (ID: ${meeting.id}) was created by ${actingUser?.username || "Unknown User"
            }. ${actingUser?.id || "undefined"}`,
          type: "meetings",
          entityType: "meetings",
          entityId: meeting.id,
        });
      }

      res.status(201).json(meeting);
    } catch (error: any) {
      console.error("Error creating meeting:", error);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(400).json({
        error: "Invalid meeting data",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.put("/api/meetings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const transformedBody = {
        ...req.body,
        startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
      };

      const meetingData = insertMeetingSchema.partial().parse(transformedBody);
      const meeting = await storage.updateMeeting(id, meetingData);

      const userId = req.user!.id;
      const actingUser = await storage.getUser(userId);

      await storage.createActivity({
        type: "meeting_updated",
        description: `Meeting "${meeting.title}" (ID: ${meeting.id}) was updated by ${actingUser?.username || "Unknown User"
          }.`,
        entityType: "meetings",
        entityId: meeting.id,
        userId,
      });

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Meeting Updated",
          message: `Meeting "${meeting.title}" (ID: ${meeting.id}) was updated by ${actingUser?.username || "Unknown User"
            } ID:${actingUser?.id || "undefined"}`,
          type: "meetings",
          entityType: "meetings",
          entityId: meeting.id,
        });
      }

      res.json(meeting);
    } catch (error: any) {
      console.error("Error updating meeting:", error);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(400).json({
        error: "Invalid meeting data",
      });
    }
  });

  app.delete("/api/meetings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const meeting = await storage.getMeeting(id);
      await storage.deleteMeeting(id);

      const userId = req.user!.id;
      const actingUser = await storage.getUser(userId);

      await storage.createActivity({
        type: "meeting_deleted",
        description: meeting
          ? `Meeting "${meeting.title}" (ID: ${id}) was deleted by ${actingUser?.username || "Unknown User"}.`
          : `A meeting (ID: ${id}) was deleted by ${actingUser?.username || "Unknown User"}.`,
        entityType: "meetings",
        entityId: meeting?.id,
        userId,
      });

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Meeting Deleted",
          message: meeting
            ? `Meeting "${meeting.title}" (ID: ${id}) was deleted by ${actingUser?.username || "Unknown User"} ID:${actingUser?.id}`
            : `A meeting (ID: ${id}) was deleted by ${actingUser?.username || "Unknown User"}.`,
          type: "meetings",
          entityType: "meetings",
          entityId: meeting?.id,
        });
      }


      res.status(200).json(meeting);

    } catch (error) {
      res.status(500).json({ error: "Failed to delete meeting" });
    }
  });


  app.put("/api/notifications/mark-all-read", async (req: Request, res: Response) => {
    try {
      // 1. Get the userId from the request body
      // (Make sure you have `app.use(express.json());` in your server setup)
      const { userId } = req.body;

      if (!userId || typeof userId !== 'number') {
        return res.status(400).json({ message: "Invalid or missing userId." });
      }

      console.log(`Marking all notifications as read for user ID: ${userId}`);

      // 2. Use Drizzle to update all notifications for that user
      const count = await storage.Notificationmarkasread(userId);// returning() confirms which rows were updated


      console.log(`Successfully marked ${count} notifications as read.`);

      // 3. Send a success response
      return res.status(200).json({
        success: true,
        message: `Marked ${count} notifications as read.`,
        count: count,
      });

    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: errorMessage
      });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = req.user!.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const isRead = req.query.isRead === "true" ? true : req.query.isRead === "false" ? false : undefined;
      const notifications = await storage.getNotifications(userId, isRead);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications-unread", async (req, res) => {
    try {
      const userId = req.user!.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const notifications = await storage.getNotificationsUnread(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications-read", async (req, res) => {
    try {
      const userId = req.user!.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const notifications = await storage.getNotificationsRead(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications-read-with-limit", async (req, res) => {
    try {
      const userId = req.user!.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const notifications = await storage.getNotificationsReadWithLimit(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.put("/api/notifications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notificationData = req.body;

      const notification = await storage.updateNotification(id, notificationData);

      const userId = req.user!.id;
      const actingUser = await storage.getUser(userId);

      await storage.createActivity({
        type: "notification_updated",
        description: `Notification (ID: ${notification.id}) was updated by ${actingUser?.username || "Unknown User"
          }.`,
        entityType: "notification",
        entityId: notification.id,
        userId,
      });

      if (notification.userId) {
        await notificationService.createNotification({
          userId: notification.userId,
          title: "Notification Updated",
          message: `Your notification (ID: ${notification.id}) has been updated.`,
          type: "notification",
          entityType: "notification",
          entityId: notification.id,
        });
      }

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Notification Updated",
          message: `Notification (ID: ${notification.title}) was updated by ${actingUser?.username || "Unknown User"
            } ID:${actingUser?.id}`,
          type: "notification",
          entityType: "notification",
          entityId: notification.id,
        });
      }

      res.json(notification);
    } catch (error) {
      console.error("Error updating notification:", error);
      res.status(400).json({ error: "Invalid notification data" });
    }
  });

  app.get("/api/dashboard-stats", async (req, res) => {
    try {
      const userId = req.user!.id;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/sales-pipeline", async (req, res) => {
    try {
      const pipeline = await storage.getSalesPipeline();
      res.json(pipeline);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales pipeline" });
    }
  });

  app.get("/api/activities", async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
        entityType: req.query.entityType as string,
        entityId: req.query.entityId ? parseInt(req.query.entityId as string) : undefined,
      };
      const activities = await storage.getActivities(filters);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });


  app.post("/api/reset-password", async (req, res) => {
    try {
      // 1. Get the token and new password from the frontend
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required." });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error("JWT_SECRET is not defined in .env file.");
        return res.status(500).json({ error: "Server configuration error." });
      }

      let payload: any;
      try {
        // 2. This is the "function" that verifies the token.
        // It checks the signature AND the expiration time automatically.
        payload = jwt.verify(token, jwtSecret);
      } catch (error) {
        // This will fail if the token is expired or tampered with
        console.error("Token verification failed:", error);
        return res.status(401).json({ error: "Invalid or expired token." });
      }

      // 3. Get the userId from inside the valid token
      const userId = payload.userId;
      if (!userId) {
        return res.status(401).json({ error: "Invalid token payload." });
      }

      // 4. Use your *existing* storage function to get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      // 5. Use your *existing* storage function to update the password
      // 
      // !!! --- CRITICAL SECURITY WARNING --- !!!
      // Your `storage.updateUser` function MUST hash this password before saving it!
      // If it saves the plain `newPassword`, your database is not secure.
      // 
      await storage.updateUser(userId, { password: newPassword });

      res.status(200).json({ message: "Password has been reset successfully." });

    } catch (error) {
      console.error("Error in /api/reset-password:", error);
      res.status(500).json({ error: "Failed to reset password." });
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await emailService.sendPasswordResetEmail(user);

      await storage.createActivity({
        type: "password_reset_requested",
        description: `Password reset was requested for user "${user.username}" (ID: ${user.id}).`,
        entityType: "user",
        entityId: user.id,
        userId: user.id,
      });

      await notificationService.createNotification({
        userId: user.id,
        title: "Password Reset Requested",
        message: `A password reset was requested for your account. If this wasn't you, please contact support immediately.`,
        type: "user",
        entityType: "user",
        entityId: user.id,
      });

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "Password Reset Requested",
          message: `Password reset was requested for user "${user.username}" (ID: ${user.id}).`,
          type: "user",
          entityType: "user",
          entityId: user.id,
        });
      }

      res.json({ message: "Password reset email sent" });
    } catch (error) {
      console.error("Error in forgot-password:", error);
      res.status(500).json({ error: "Failed to send password reset email" });
    }
  });

  app.post("/api/user-creation-mail", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await emailService.sendCreateUserEmail(user.email, user.password, user.username);

      await storage.createActivity({
        type: "user_creation_email_sent",
        description: `A user creation email was sent to "${user.username}" (ID: ${user.id}).`,
        entityType: "user",
        entityId: user.id,
        userId: req.user!.id,
      });

      await notificationService.createNotification({
        userId: user.id,
        title: "Welcome to the System",
        message: `Your account has been created and login details have been sent to your email.`,
        type: "user",
        entityType: "user",
        entityId: user.id,
      });

      const users = await storage.getAdminUsers();
      for (const user of users) {
        await notificationService.createNotification({
          userId: user.id,
          title: "User Creation Email Sent",
          message: `A user creation email was sent to "${user.username}" (ID: ${user.id}) by ${req.user!.username || "System"
            }.`,
          type: "user",
          entityType: "user",
          entityId: user.id,
        });
      }

      res.json({ message: "User creation email sent" });
    } catch (error) {
      console.error("Error sending user creation email:", error);
      res.status(500).json({ error: "Failed to send user creation email" });
    }
  });

  app.get("/api/auth/google", (req, res) => {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      scope: 'openid email profile',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    }).toString()}`;

    res.json({ authUrl: googleAuthUrl });
  });

  app.get("/api/auth/callback/google", async (req, res) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({ message: "Authorization code is required" });
      }
      const { userInfo } = await GoogleAuthService.authenticateUser(code as string);
      const user = await storage.getUserByEmail(userInfo.email);

      if (!user) {
        return res.redirect(`${process.env.GOOGLE_OAUTH_URL}?error=not_registered&email=${encodeURIComponent(userInfo.email)}&message=${encodeURIComponent("Access denied. This email is not registered in our system.")}`);
      }

      if (!user.isActive) {
        return res.redirect(`${process.env.GOOGLE_OAUTH_URL}?error=deactivated&email=${encodeURIComponent(userInfo.email)}&message=${encodeURIComponent("Access denied. Your account has been deactivated.")}`);
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to log in user" });
        }
        res.redirect(`${process.env.GOOGLE_OAUTH_URL}?success=true&email=${encodeURIComponent(userInfo.email)}`);
      });
    } catch (error) {
      res.status(500).json({ message: "Google authentication failed" });
    }
  });

  const router = express.Router();

  app.post(
    "/api/customers/import",
    uploadMiddleware,
    async (req: Request, res: Response) => {
      console.log("api call received")
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        await insertCustomersFromCSV(req.file.buffer);

        res.status(200).json({ message: "Customers inserted successfully" });
      } catch (error: any) {
        res.status(500).json({
          message: "Error inserting customers", error: error.message
        });
      }
    }
  );

  app.post(
    "/api/leads/import",
    uploadMiddleware,
    async (req: Request, res: Response) => {
      console.log("api call received")
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        await insertLeadsFromCSV(req.file.buffer);

        res.status(200).json({ message: "Leads inserted successfully" });
      } catch (error: any) {
        res.status(500).json({
          message: "Error inserting leads", error: error.message
        });
      }
    }
  );

  app.post("/api/opportunity/import", uploadMiddleware, async (req: Request, res: Response) => {
    console.log("api call received")
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      await insertOpportunitiesFromCSV(req.file.buffer);

      res.status(200).json({ message: "Opportunities inserted successfully" });
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Error inserting leads", error: error.message });
    }
  }
  );

  app.post("/api/contact/import", uploadMiddleware, async (req: Request, res: Response) => {
    console.log("api call received")
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      await insertContactsFromCSV(req.file.buffer);

      res.status(200).json({ message: "Contacts inserted successfully" });
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Error inserting contacts", error: error.message });
    }
  }
  );


  // Get all teams
  app.get("/api/myTeams/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const userType = req.query.userType;
      const admins = await storage.getAdminUsers();

      const isAdmin = admins.some((admin) => admin.id === userId);

      let teams = [];

      if (userType === "admin" || isAdmin) {
        teams = await storage.getAllTeams();
      } else {
        // get teams for this user
        const userTeams = await storage.getTeamsByUserId(userId);

        teams = userTeams.map((teamMember) => {
          // teamMember.team has the team info
          // teamMember.team.members is an array of members
          return {
            ...teamMember.team,
            members: teamMember.team.members.map((member) => ({
              id: member.id,
              teamId: member.teamId,
              userId: member.userId,
              user: {
                id: member.id,
                username: member.user.username,
                email: member.user.email,
                firstName: member.user.firstName,
                lastName: member.user.lastName,
                isActive: member.user.isActive,
                lastLogin: member.user.lastLogin,
                userType: member.user.userType,
              },
            })),
          };
        });

      }

      return res.json(teams);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  //get all the teams 
  app.get("/api/teams", async (req, res) => {
    try {

      const teams = await storage.getTeams();

      if (!teams || teams.length === 0) {
        return res.status(404).json({ message: "No teams found for this user" });
      }
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams by userId:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  // app.get("/api/leads-qualified",async (req,res)=>{
  //   try{
  //     const leadsQualified = await storage.getLeadsQualified();
  //     if (!leadsQualified || leadsQualified.length === 0) {
  //       return res.status(404).json({ message: "No leads found" });
  //     }
  //     res.json(leadsQualified);
  //   }
  //   catch(error){
  //     console.error("Error fetching leads qualified:", error);
  //     res.status(500).json({ error: "Internal server error" });
  //   }
  // });
  // app.get("/api/opportunities-won",async (req,res)=>{
  //   try{
  //     const opportunitiesWon = await storage.getOpportunitiesClosedWon();
  //     if(!opportunitiesWon || opportunitiesWon.length===0){
  //       return res.status(404).json({message:"No opportunities found"});
  //     }
  //     res.json(opportunitiesWon);
  //   }catch(error){
  //     console.error("Error fetching opportunities won:", error);
  //     res.status(500).json({error:"Internal server error"});
  //   }
  // });
  //   app.get("/api/leadId-from-opportunities", async (req, res) => {
  //   try {
  //     const opportunities = await storage.getLeadIdFromOpportunities();
  //     console.log("Fetched opportunities:", opportunities);

  //     if (!opportunities || opportunities.length === 0) {
  //       return res.status(404).json({ message: "No opportunities found" });
  //     }
  //     res.json(opportunities);
  //   } catch (error) {
  //     console.error("Error fetching lead IDs from opportunities:", error);
  //     res.status(500).json({ error: "Internal server error" });
  //   }
  // });

  //------apiAnalytics----------





  app.get("/api/team-with-members", async (req, res) => {
    try {
      const teams = await storage.getAllTeamsWithMembers();

      if (!teams || teams.length === 0) {
        return res.status(404).json([]);
      }

      // Transform result
      const result = teams.flatMap(team =>
        team.members
          .filter(member => member.user.userType === "associate")
          .map(member => ({
            userId: member.userId,
            team
          }))
      );

      res.json(result);
    } catch (error) {
      console.error("Error fetching teams with members:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });


  // Get team by teamid
  app.get("/api/teams/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Team id is required" });
      }

      const team = await storage.getTeamById(Number(id));

      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      res.json({ team });
    } catch (err) {
      console.error("Error fetching team:", err);
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  //get all the teams of a user
  app.get("/api/teamsByUserId/:userId", async (req, res) => {
    try {
      console.log(`newest /api/teams is running here`);

      const userId = Number(req.params.userId);
      const userType = req.query.userType;
      const admins = await storage.getAdminUsers();

      // const isAdmin = admins.some((admin) => admin.id === userId);


      // if (userType === "admin" || isAdmin) {
      //   const teams = await storage.getAllTeams();
      //   return res.json(teams)
      // }

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const teams = await storage.getTeamsByUserId(userId);

      if (!teams || teams.length === 0) {
        return res.status(404).json({ message: "No teams found for this user" });
      }

      // shape result: teams + members
      const result = teams.map((t) => ({
        id: t.team.id,
        name: t.team.name,
        description: t.team.description,
        createdAt: t.team.createdAt,
        updatedAt: t.team.updatedAt,
        members: t.team.members.map((m) => ({
          id: m.user.id,
          username: m.user.username,
          email: m.user.email,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          isActive: m.user.isActive,
          lastLogin: m.user.lastLogin,
          userType: m.user.userType,
        })),
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching teams by userId:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/assignable-users/:userId", async (req, res) => {
    try {
      const role = req.query.role as String;
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

      // Fetch current user from storage
      const users = await storage.getUsers();
      // Admin can see all users across all teams
      if (role === "admin") {
        const filtered = users.filter(u => u.isActive && u.id !== userId);
        return res.json(filtered);

      }
      const teams = await storage.getTeamsByUserId(userId);
      if (!teams || teams.length === 0) return res.json([]);

      const currentUser = teams
        .flatMap(t => t.team.members.map(m => m.user))
        .find(u => u.id === userId);

      if (!currentUser) return res.status(404).json({ error: "User not found in any team" });



      // Collect assignable users
      const assignableUsersMap = new Map<number, any>();
      const userType = currentUser.userType ?? "none";

      teams.forEach(teamMember => {
        teamMember.team.members.forEach(member => {
          const u = member.user;
          if (!u.isActive || u.id === userId) return; // skip self and inactive

          const memberType = u.userType ?? "none"; // handle null

          // Role-based filtering
          if (userType === "associate" && memberType === "associate") {
            assignableUsersMap.set(u.id, u);
          }

          if (userType === "team-lead" && ["associate", "team-lead"].includes(memberType)) {
            assignableUsersMap.set(u.id, u);
          }

          if (userType === "manager" && ["associate", "team-lead", "manager"].includes(memberType)) {
            assignableUsersMap.set(u.id, u);
          }
        });
      });


      res.json(Array.from(assignableUsersMap.values()));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create a new team
  app.post("/api/teams", async (req, res) => {
    try {
      console.log('the req body is ', req.body)
      const { associateIds = [], managerIds = [], teamleadIds = [], avatar, name, roleId, ...teamData } = req.body;
      // 🚨 Name required
      if (!name) {
        return res.status(400).json({ error: "Team name is required" });
      }
      const createdByUserId = req.user?.id;
      const userType = req.user?.userType;
      // 0️⃣ Check for duplicate name
      const existingByName = await storage.getTeamByName(name);
      if (existingByName) {
        return res.status(400).json({ error: `Team name "${name}" already exists.` });
      }


      // 🧩 1️⃣ Include the creator automatically based on their userType
      if (userType === "manager" && createdByUserId && !managerIds.includes(createdByUserId)) {
        managerIds.push(createdByUserId);
      } else if (userType === "team-lead" && createdByUserId && !teamleadIds.includes(createdByUserId)) {
        teamleadIds.push(createdByUserId);
      }

      // 1️⃣ Collect all members
      const memberIds = [...associateIds, ...managerIds, ...teamleadIds];
      console.log('the ids are ', JSON.stringify(memberIds))

      // 2️⃣ Validate associates
      for (const userId of associateIds) {
        const existingMembership = await storage.getTeamsByUserId(userId);

        if (existingMembership.length > 0) {
          const user = await storage.getUser(userId); // fetch username
          const username = `${user?.firstName || ""} ${user?.lastName || ""}` || `ID ${userId}`;
          return res.status(400).json({
            error: `Associate ${username} is already assigned to a team.`,
          });
        }
      }

      // 3️⃣ Create team
      const newTeam = await storage.createTeam({ name, avatar, roleId, createdByUserId, ...teamData });

      // 4️⃣ Insert team members & update associates to take the team's role
      for (const userId of memberIds) {
        await storage.addTeamMember({
          teamId: newTeam.id,
          userId,
        });

        // 🔑 Only update associates to take the team's role
        if (associateIds.includes(userId) && roleId) {
          await storage.updateUser(userId, { roleId, userType: "associate" });
        }
      }

      res.status(201).json(newTeam);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create team" });
    }
  });


  //update team
  // Update team
  app.put("/api/teams/:id", async (req, res) => {
    try {
      const { id: teamId } = req.params;
      const { name, description, roleId, associateIds = [], managerIds = [], teamleadIds = [] } = req.body;

      // 1️⃣ Fetch existing team
      const existingTeam = await storage.getTeamById(Number(teamId));
      if (!existingTeam) return res.status(404).json({ error: "Team not found" });

      if (!name) {
        return res.status(400).json({ error: "Team Name is Required" });
      }

      // 2️⃣ Check for duplicate name
      const otherTeam = await storage.getTeamByName(name);
      if (otherTeam && otherTeam.id !== Number(teamId)) {
        return res.status(400).json({ error: `Team name "${name}" already exists.` });
      }

      // 3️⃣ Validate associates
      for (const userId of associateIds) {
        const existingMembership = await storage.getTeamsByUserId(userId);

        if (
          existingMembership.length > 0 &&
          !existingMembership.some(m => m.team.id === Number(teamId))
        ) {
          const user = await storage.getUser(userId);
          const username = user?.username || `ID ${userId}`;
          return res.status(400).json({
            error: `Associate ${username} is already assigned to another team.`,
          });
        }
      }

      // 4️⃣ Update team info
      const updatedTeam = await storage.updateTeam(Number(teamId), {
        name,
        description,
        roleId,
      });

      // 5️⃣ Sync members
      const allNewIds = [...associateIds, ...managerIds, ...teamleadIds];

      // Remove members no longer in team
      for (const member of await storage.getTeamMembers(Number(teamId))) {
        if (!allNewIds.includes(member.userId)) {
          await storage.removeTeamMember(Number(teamId), member.userId);
        }
      }

      // Add new members
      for (const userId of allNewIds) {
        const memberAlreadyInTeam = await storage.getTeamMembers(Number(teamId))
          .then(members => members.find(m => m.userId === userId));

        if (!memberAlreadyInTeam) {
          await storage.addTeamMember({
            teamId: Number(teamId),
            userId,
          });
        }
      }

      // 6️⃣ Update associates to take the team's role
      if (roleId && associateIds.length > 0) {
        for (const userId of associateIds) {
          await storage.updateUser(userId, { roleId, userType: "associate" });
        }
      }

      // 7️⃣ Return full TeamWithMembers
      const updatedMembers = await storage.getTeamMembers(Number(teamId));
      res.json({
        ...updatedTeam,
        members: updatedMembers.map(m => ({
          ...m.user,
          id: m.userId
        }))
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update team" });
    }
  });
  app.delete("/api/teams/:id", async (req, res) => {
    const teamId = Number(req.params.id);

    try {
      // 1️⃣ Get all members of the team before deletion
      const team = await storage.getTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      const userIds = team.members?.map((m) => m.userId) || [];

      // 2️⃣ Remove members from the teamMembers table
      if (userIds.length > 0) {
        await storage.removeTeamMembers(teamId, userIds);

        // 3️⃣ Reset role/roleId for associates (same logic as member removal)
        for (const userId of userIds) {
          const user = await storage.getUser(userId);
          if (user?.userType === "associate") {
            await storage.updateUser(userId, {
              roleId: null, // or userType: "none" if that's how you handle it
            });
          }
        }
      }
      await deleteAvatar("teams", teamId);
      // 4️⃣ Delete the team itself
      const deleted = await storage.deleteTeam(teamId);

      if (!deleted) {
        return res.status(404).json({ error: "Team not found" });
      }

      res.json({ message: "Team deleted successfully", deleted });
    } catch (err) {
      console.error("Failed to delete team:", err);
      res.status(500).json({ error: "Failed to delete team" });
    }
  });

  //delete a team member
  app.delete("/api/teams/:teamId/members", async (req, res) => {
    const teamId = Number(req.params.teamId);
    const { userIds } = req.body as { userIds: number[] };

    try {
      // Remove members from the team
      const deleted = await storage.removeTeamMembers(teamId, userIds);

      // Update only associates
      for (const userId of userIds) {
        const user = await storage.getUser(userId);
        if (user?.userType === "associate") {
          await storage.updateUser(userId, {
            roleId: null,       // remove inherited team role
          });
        }
      }

      res.json({ success: true, deleted });
    } catch (err) {
      console.error("Failed to remove team members:", err);
      res.status(500).json({ error: "Failed to remove team members" });
    }
  });

  app.get('/api/get-last-message', async (req, res) => {
    try {
      const senderId = Number(req.query.senderId);
      const receiverId = Number(req.query.receiverId);

      //  Validate IDs
      if (isNaN(senderId) || isNaN(receiverId)) {
        return res.status(400).json({ error: "to get last message, both senderId and receiverId must be valid numbers." });
      }

      //  Fetch messages
      const message = await storage.getLastIncomingMessage(senderId, receiverId);

      //  Handle empty result gracefully
      if (!message) {
        return res.status(404).json({ message: "No last message these users." });
      }

      //  Success
      return res.status(200).json(message);

    } catch (error) {
      res.status(500).send('error getting last message')

    }
  })
  app.get('/api/get-sidebar-message', async (req, res) => {
    try {
      const senderId = Number(req.query.senderId);
      const receiverId = Number(req.query.receiverId);

      //  Validate IDs
      if (isNaN(senderId) || isNaN(receiverId)) {
        return res.status(400).json({ error: "to get sidebar message, both senderId and receiverId must be valid numbers." });
      }

      //  Fetch messages
      const message = await storage.getRecentMessage(senderId, receiverId);

      //  Handle empty result gracefully
      if (!message) {
        return res.status(404).json({ message: "No last message these users." });
      }

      //  Success
      return res.status(200).json(message);

    } catch (error) {
      res.status(500).send('error getting last message')

    }
  })
  app.post("/api/send-template-message", async (req, res) => {
    try {
      const { to, clientId, senderId, receiverId, templateName, languageCode = "en" } = req.body;

      //  Validate input
      if (!to || !senderId || !receiverId || !templateName) {
        return res.status(400).json({
          error: "Missing required fields: to, senderId, receiverId, templateName",
        });
      }

      //  1. Send the template message via WhatsApp Cloud API
      const response = await fetch(WA_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
          },
        }),
      });

      const waData = await response.json();

      if (!response.ok) {
        console.error("❌ WhatsApp API Error:", waData);
        return res.status(500).json({ error: waData });
      }

      //  2. Extract WhatsApp message ID
      const waMessageId = waData.messages?.[0]?.id || null;

      //  3. Store the message in the database
      const messageToStore: InsertMessage = {
        senderId,
        receiverId,
        content: `Template: ${templateName}`,
        direction: "outgoing",
        status: "sent",
        messageType: "template",
        clientId,
        wamid: waMessageId
      };

      const savedMessage = await storage.createMessage(messageToStore);

      //  4. Emit to frontend (optional, if you're using socket.io)
      // if (req.app.get("io")) {
      //   req.app.get("io").emit("new-message", savedMessage);
      // }

      //  5. Respond to frontend
      return res.status(200).json({
        success: true,
        message: "Template message sent and stored successfully",
        data: {
          ...savedMessage,
          wamid: waMessageId
        },
      });

    } catch (error: any) {
      console.error("🚨 Error in /api/send-template-message:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });


  app.post("/api/chat/send", async (req, res) => {
    try {
      const { to, body, senderId, receiverId, clientId } = req.body;

      if (!to || !body || !senderId || !receiverId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      //  1. Send the message to WhatsApp Cloud API
      const response = await fetch(WA_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.WB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        }),
      });

      const waData = await response.json();

      if (!response.ok) {
        console.error("❌ WhatsApp API Error:", waData);
        return res.status(500).json({ error: waData });
      }

      //  2. Extract WhatsApp message ID
      const waMessageId = waData.messages?.[0]?.id || null;

      //  3. Store the message in your database
      const messageToStore: InsertMessage = {
        senderId,
        receiverId,
        content: body,
        direction: "outgoing",
        status: "sent",
        messageType: "text",
        clientId: clientId?.toString(),
        wamid: waMessageId,
      };

      const savedMessage = await storage.createMessage(messageToStore);

      //  4. Respond to frontend
      return res.status(200).json({
        success: true,
        message: "Message sent and stored successfully",
        data: savedMessage,
      });
    } catch (error: any) {
      console.error("🚨 Error in /api/chat/send:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  app.get("/api/messages", async (req, res) => {
    try {
      const senderId = Number(req.query.senderId);
      const receiverId = Number(req.query.receiverId);

      //  Validate IDs
      if (isNaN(senderId) || isNaN(receiverId)) {
        return res.status(400).json({ error: "Both senderId and receiverId must be valid numbers." });
      }

      //  Fetch messages
      const messages = await storage.getMessages(senderId, receiverId);

      //  Handle empty result gracefully
      if (!messages || messages.length === 0) {
        return res.status(404).json({ message: "No messages found between these users." });
      }

      //  Success
      return res.status(200).json(messages);

    } catch (error) {
      console.error("❌ Error fetching messages:", error);
      return res.status(500).json({ error: "Failed to fetch messages. Please try again later." });
    }
  });
  app.get("/api/unread-messages", async (req, res) => {
    try {
      const senderId = Number(req.query.senderId);
      const receiverId = Number(req.query.receiverId);

      if (isNaN(senderId) || isNaN(receiverId)) {
        return res.status(400).json({
          error: "Both senderId and receiverId must be valid numbers.",
        });
      }

      const result = await storage.getUnreadMessages(senderId, receiverId);

      if (!result || result.count === 0) {
        return res.status(200).json({
          count: 0,
          wamids: [],
          message: "No unread messages.",
        });
      }

      //  Success — return count and wamid list
      return res.status(200).json({
        count: result.count,
        wamids: result.wamids,
      });

    } catch (error) {
      console.error("❌ Error fetching unread messages:", error);
      return res.status(500).json({
        error: "Failed to fetch unread messages. Please try again later.",
      });
    }
  });
  app.put("/api/mark-read-status", async (req, res) => {
    try {
      const senderId = Number(req.query.senderId);
      const receiverId = Number(req.query.receiverId);

      if (isNaN(senderId) || isNaN(receiverId)) {
        return res.status(400).json({
          error: "Both senderId and receiverId must be valid numbers.",
        });
      }


      const result = await storage.markMessagesAsRead(senderId, receiverId);
      const count = result.updatedCount;

      return res.status(200).json({ count });
    } catch (err: any) {
      console.error("Error marking status to read:", err);
      return res.status(500).json('Internal Server Error')
    }
  });

  app.get("/api/stream", (req, res) => {
    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // res.flushHeaders();

    // Handlers
    const onMessage = (msg: any) => {
      res.write(`data: ${JSON.stringify({ type: "message", data: msg })}\n\n`);
    };

    const onStatus = (status: any) => {
      res.write(`data: ${JSON.stringify({ type: "status", data: status })}\n\n`);
    };

    // Attach listeners
    chatEmitter.on("message", onMessage);
    chatEmitter.on("status", onStatus);

    console.log(" Client connected to /api/stream");

    // Handle client disconnect
    req.on("close", () => {
      console.log("❌ Client disconnected from /api/stream");
      chatEmitter.removeListener("message", onMessage);
      chatEmitter.removeListener("status", onStatus);
      res.end();
    });
  });
  app.put("/api/update-status", async (req, res) => {
    try {
      const { id, status } = req.body;

      if (!id || !status) {
        return res.status(400).json(
          { error: "Message ID and status are required" },
        );
      }

      // Update the message status
      const updatedMessage = await storage.updateMessage(id, { status });

      if (!updatedMessage) {
        return res.status(404).send("message not found")
      }

      return res.status(200).json({ success: true, data: updatedMessage });
    } catch (err: any) {
      console.error("Error updating message status:", err);
      return res.status(500).json('Internal Server Error')
    }
  });
  app.post("/api/chat/send-media", upload.single("file"), async (req, res) => {
    try {
      const { caption, to, type, message, clientId, senderId, receiverId } = req.body;
      const file = req.file;

      if (!to) return res.status(400).json({ error: "Recipient number (to) is required." });
      if (!file) return res.status(400).json({ error: "No file uploaded." });

      console.log("📤 Uploading file to Meta...");

      // 1️⃣ Upload to WhatsApp (Meta)
      const mediaId = await uploadMedia(file.buffer, file.mimetype);
      // const waMediaUrl = `https://graph.facebook.com/v22.0/${mediaId}?access_token=${process.env.WB_TOKEN}`;
      console.log(" Uploaded to Meta. Media ID:", mediaId);

      // 2️⃣ Send to WhatsApp user
      const response = await sendMediaMessage(to, mediaId, type, caption || "");
      console.log(" Sent media message to WhatsApp.");

      const waMessageId = response?.messages?.[0]?.id || null;

      // 3️⃣ Upload to your own cloud (e.g., Firebase / GCS)
      const uploadedPaths = await uploadMessageMedia([file], Number(senderId), Number(receiverId));
      const cloudPath = uploadedPaths[0]; // relative path like "messages/1/2/12345-file.png"
      const cloudUrl = `https://storage.googleapis.com/${process.env.BUCKET_NAME}/${cloudPath}`;

      // 4️⃣ Store in DB
      const messageToStore: InsertMessage = {
        senderId,
        receiverId,
        clientId: clientId?.toString(),
        direction: "outgoing",
        status: "sent",
        messageType: "media",
        caption: caption || "",
        content: "",
        mediaId,
        mediaUrl: cloudUrl,          //  Store YOUR OWN cloud URL
        mediaMimeType: file.mimetype,
        wamid: waMessageId,
      };

      const savedMessage = await storage.createMessage(messageToStore);

      // 5️⃣ Return to frontend
      return res.status(200).json({
        success: true,
        message: "Media message sent and stored successfully",
        data: { ...savedMessage, data: { wamid: waMessageId, mediaUrl: cloudUrl } },
      });

    } catch (error) {
      console.error("❌ Error sending media message:", error);
      return res.status(500).json({ success: false, error: error });
    }
  });

  app.post("/api/upload-fallback-picture", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;

      if (!file) return res.status(400).json({ error: "No profile pic here." });
      const cloudPath = await uploadFallback(file);
      const cloudUrl = `https://storage.googleapis.com/${process.env.BUCKET_NAME}/${cloudPath}`;


      // 5️⃣ Return to frontend
      return res.status(200).json({ url: cloudUrl, message: "successfully uploaded fallback image" });

    } catch (error) {
      console.error("❌ Error sending media message:", error);
      return res.status(500).json({ success: false, error: error });
    }
  });
  app.put("/api/teams/:id/avatar", upload.single("file"), async (req, res) => {
    try {
      const teamId = Number(req.params.id);
      if (isNaN(teamId)) {
        return res.status(400).json({ error: "Invalid team ID" });
      }

      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      //  Upload to GCS (with correct path)
      const cloudUrl = await uploadProfile(file, "teams", teamId);

      const updatedTeam = await storage.updateTeam(teamId, {
        avatar: cloudUrl,
      });

      console.log("avatar updated:", cloudUrl);

      return res.json({
        message: "Avatar uploaded successfully",
        avatarUrl: cloudUrl,
        team: updatedTeam,
      });
    } catch (error) {
      console.error("❌ Error updating team avatar:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/ai-analytics", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "" || prompt.length <= 5) {
      return res.status(400).json({ error: "Prompt of enough length is required" });
    }
    try {
      const aiResponse = await getAIAnalytics(prompt);
      return res.json({ aiResponse });
    } catch (error) {
      console.error("Error in AI analytics endpoint:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/users/:id/avatar", upload.single("file"), async (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      //  Upload to GCS (with correct path)
      const cloudUrl = await uploadProfile(file, "users", userId);

      const updatedTeam = await storage.updateUser(userId, {
        avatar: cloudUrl,
      });

      console.log("avatar updated:", cloudUrl);

      return res.json({
        message: "Avatar uploaded successfully",
        avatarUrl: cloudUrl,
        team: updatedTeam,
      });
    } catch (error) {
      console.error(" Error updating team avatar:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.put("/api/contacts/:id/avatar", upload.single("file"), async (req, res) => {
    try {
      const contactId = Number(req.params.id);
      if (isNaN(contactId)) {
        return res.status(400).json({ error: "Invalid contact id" });
      }

      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      //  Upload to GCS (with correct path)
      const cloudUrl = await uploadProfile(file, "Contacts", contactId);

      const updatedTeam = await storage.updateContact(contactId, {
        avatar: cloudUrl,
      });

      console.log("avatar updated:", cloudUrl);

      return res.json({
        message: "Avatar uploaded successfully",
        avatarUrl: cloudUrl,
        team: updatedTeam,
      });
    } catch (error) {
      console.error(" Error updating team avatar:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.put("/api/contacts/:id/avatar", upload.single("file"), async (req, res) => {
    try {
      const contactId = Number(req.params.id);
      if (isNaN(contactId)) {
        return res.status(400).json({ error: "Invalid contact id" });
      }

      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      //  Upload to GCS (with correct path)
      const cloudUrl = await uploadProfile(file, "Contacts", contactId);

      const updatedTeam = await storage.updateContact(contactId, {
        avatar: cloudUrl,
      });

      console.log("avatar updated:", cloudUrl);

      return res.json({
        message: "Avatar uploaded successfully",
        avatarUrl: cloudUrl,
        team: updatedTeam,
      });
    } catch (error) {
      console.error("❌ Error updating team avatar:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}