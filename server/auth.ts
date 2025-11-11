import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}



export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: isProduction, // Only send cookies over HTTPS in production
      httpOnly: true, // Prevent client-side JavaScript access
      sameSite: isProduction ? "none" : "lax", // Allow cross-site cookies in production (for Cloud Run)
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Login attempt for username:", username);
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log("User not found:", username);
          return done(null, false);
        }
        
        // Plain password comparison
        if (password !== user.password) {
          console.log("Password mismatch for user:", username);
          return done(null, false);
        }
        
        if (!user.isActive) {
          console.log("User account inactive:", username);
          return done(null, false);
        }
        
        console.log("Login successful for user:", username);
        return done(null, user);
      } catch (error) {
        console.error("Authentication error:", error);
        console.error("Authentication error stack:", error instanceof Error ? error.stack : 'No stack trace');
        return done(error);
      }
    }),
  );



  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: req.body.password, // Store plain password
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        console.error("Error stack:", err.stack);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session creation error:", loginErr);
          console.error("Session error stack:", loginErr?.stack);
          return res.status(500).json({ error: "Session creation failed", details: loginErr?.message });
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });




}
