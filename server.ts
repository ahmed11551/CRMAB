import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Load Firebase config with safety
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (err) {
  console.error("Failed to load firebase-applet-config.json:", err);
}

// Client SDK initialization
let db: any;
if (firebaseConfig.projectId) {
  const fbApp = initializeApp(firebaseConfig);
  db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
}

// Admin SDK initialization
let adminDb: any;
try {
  if (firebaseConfig.projectId) {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    const dbAdmin = admin.firestore();
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    adminDb = dbAdmin.databaseId === dbId ? dbAdmin : admin.firestore(dbId);
  }
} catch (err) {
  console.error("Failed to initialize Firebase Admin SDK:", err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Initialization
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

  // Health Check
  app.get("/api/health", async (req, res) => {
    res.json({
      status: "ok",
      firebase: {
        client: !!db,
        admin: !!adminDb,
        databaseId: firebaseConfig.firestoreDatabaseId
      },
      ai: {
        configured: !!genAI
      }
    });
  });

  // API Route for AI Summaries
  app.post("/api/ai/summarize", async (req, res) => {
    try {
      if (!genAI) throw new Error("GEMINI_API_KEY is not configured");
      const { logs } = req.body;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(`Summarize the following communication logs for a construction project and suggest next steps:\n\n${logs}`);
      res.json({ summary: result.response.text() });
    } catch (error) {
      console.error("AI Summary Error:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Firebase Client DB Initialized:", !!db);
    console.log("Firebase Admin DB Initialized:", !!adminDb);
    console.log("Gemini AI Initialized:", !!genAI);
  });
}

startServer();
