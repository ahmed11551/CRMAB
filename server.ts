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

  // API Route for AI Summaries
  app.post("/api/ai/summarize", async (req, res) => {
    try {
      if (!genAI) throw new Error("GEMINI_API_KEY is not configured");
      const { logs } = req.body;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent(`Summarize the following communication logs for a construction project and suggest next steps:\n\n${logs}`);
      res.json({ summary: response.response.text() });
    } catch (error) {
      console.error("AI Summary Error:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  // Telegram Bot Webhook
  app.post("/api/telegram/webhook", async (req, res) => {
    const token = process.env.TELEGRAM_BOT_TOKEN || "8725593924:AAFbIhgcc04zvpQKH1inaK2c4ndgSrUPKso";
    console.log("Webhook received body:", JSON.stringify(req.body));

    if (!token) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return res.status(500).send("TELEGRAM_BOT_TOKEN not configured");
    }

    const { message } = req.body;
    if (!message) {
      return res.status(200).send("OK");
    }

    const chat_id = message.chat.id;
    const text = message.text;

    // Handle Commands
    if (text === "/start" || text === "/register") {
      console.log("Handling /start command for chat_id:", chat_id);
      try {
        const teleRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id,
            text: "👋 Привет! Я ваш ассистент BuildSync.\n\nДля регистрации и привязки вашего аккаунта, пожалуйста, поделитесь вашим номером телефона, нажав на кнопку ниже.",
            reply_markup: {
              keyboard: [[{ text: "📲 Поделиться контактом", request_contact: true }]],
              one_time_keyboard: true,
              resize_keyboard: true
            }
          })
        });
        const teleData = await teleRes.json();
        console.log("Telegram response for /start:", teleData);
      } catch (err) {
        console.error("Error sending start message:", err);
      }
      return res.status(200).send("OK");
    }

    // Handle Shared Contacts
    if (message.contact && adminDb) {
      console.log("Handling shared contact for chat_id:", chat_id);
      const contact = message.contact;
      try {
        await adminDb.collection("registrations").add({
          telegramId: String(contact.user_id || chat_id),
          phoneNumber: contact.phone_number,
          firstName: contact.first_name || "",
          lastName: contact.last_name || "",
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id,
            text: `✅ Спасибо! Ваш номер ${contact.phone_number} зарегистрирован в системе.\n\nТеперь вы можете отправлять мне задачи, контакты и отчеты об объектах.`,
            reply_markup: { remove_keyboard: true }
          })
        });
      } catch (err) {
        console.error("Error saving registration or sending confirmation:", err);
      }
      return res.status(200).send("OK");
    }

    if (!text || !genAI || !adminDb) return res.status(200).send("OK");

    try {
      console.log("Processing message with AI:", text);
      const prompt = `
        You are a smart construction manager assistant. Extract data from the following message: "${text}".
        Decide if it's a TASK, CONTACT, PROJECT, or COMMUNICATION log.
        
        Output valid JSON in one of these formats:
        
        If TASK: { "type": "TASK", "data": { "title": "...", "description": "...", "priority": "Low|Medium|High|Urgent" } }
        If CONTACT: { "type": "CONTACT", "data": { "name": "...", "role": "Contractor|Client|Vendor|Team", "phone": "...", "notes": "..." } }
        If PROJECT: { "type": "PROJECT", "data": { "name": "...", "address": "...", "status": "Planning|In Progress" } }
        If COMMUNICATION: { "type": "COMM", "data": { "content": "...", "commType": "Call|WhatsApp|Telegram|Visit" } }
        
        If unsure, output: { "type": "UNKNOWN", "message": "Short explanation why" }
        Always output ONLY valid JSON.
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      console.log("AI Response:", responseText);
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      if (parsed && parsed.type !== "UNKNOWN") {
        let collectionName = "";
        let finalData: any = {};
        let replyText = "";

        switch (parsed.type) {
          case "TASK":
            collectionName = "tasks";
            finalData = { ...parsed.data, status: "Pending" };
            replyText = `✅ Задача создана: ${parsed.data.title}`;
            break;
          case "CONTACT":
            collectionName = "contacts";
            finalData = { ...parsed.data };
            replyText = `👤 Контакт добавлен: ${parsed.data.name} (${parsed.data.role})`;
            break;
          case "PROJECT":
            collectionName = "projects";
            finalData = { ...parsed.data };
            replyText = `🏗️ Объект зарегистрирован: ${parsed.data.name}`;
            break;
          case "COMM":
            collectionName = "communications";
            finalData = { 
              content: parsed.data.content, 
              type: parsed.data.commType || "Telegram", 
              sender: "System/Telegram",
              timestamp: new Date().toISOString(),
              contactId: parsed.data.contactId || "unknown"
            };
            replyText = `💬 Запись в журнал добавлена.`;
            break;
        }

        if (collectionName) {
          await adminDb.collection(collectionName).add({
             ...finalData,
             createdAt: admin.firestore.FieldValue.serverTimestamp(),
             timestamp: finalData.timestamp ? admin.firestore.Timestamp.fromDate(new Date(finalData.timestamp)) : undefined
          });
          console.log(`Saved ${parsed.type} via Admin SDK`);
          
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id, text: replyText })
          });
        }
      } else {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id,
            text: `❓ Я не смог распознать команду. Попробуйте написать:\n- "Добавь задачу: проверить фундамент"\n- "Запиши контакт: Иван, прораб, +7999..."\n- "Новый объект: ЖК Радужный, ул. Мира 5"`
          })
        });
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Telegram Webhook Error:", error);
      res.status(200).send("OK");
    }
  });

  // Helper route to set the webhook
  app.get("/api/telegram/setup", async (req, res) => {
    const token = process.env.TELEGRAM_BOT_TOKEN || "8725593924:AAFbIhgcc04zvpQKH1inaK2c4ndgSrUPKso";
    
    let appUrl = process.env.APP_URL;
    if (!appUrl || appUrl === "MY_APP_URL" || appUrl.includes('localhost')) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['host'];
      appUrl = `${protocol}://${host}`;
    }
    
    if (appUrl.endsWith('/')) appUrl = appUrl.slice(0, -1);

    const webhookUrl = `${appUrl}/api/telegram/webhook`;
    console.log("Attempting to set Telegram webhook to:", webhookUrl);

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
      const data = await response.json();
      console.log("Telegram setWebhook response:", data);
      res.json({ 
        message: "Webhook setup attempt complete", 
        telegram_response: data, 
        webhook_url: webhookUrl,
        detected_app_url: appUrl
      });
    } catch (error) {
      console.error("Setup Webhook Error:", error);
      res.status(500).json({ error: "Failed to set webhook", details: error instanceof Error ? error.message : String(error) });
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
  });
}

startServer();
