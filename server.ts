import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Load Firebase config from root
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8"));
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route for AI Summaries
  app.post("/api/ai/summarize", async (req, res) => {
    try {
      const { logs } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize the following communication logs for a construction project and suggest next steps:\n\n${logs}`,
      });
      res.json({ summary: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  // Telegram Bot Webhook
  app.post("/api/telegram/webhook", async (req, res) => {
    const token = process.env.TELEGRAM_BOT_TOKEN || "8725593924:AAFbIhgcc04zvpQKH1inaK2c4ndgSrUPKso";
    if (!token) {
      return res.status(500).send("TELEGRAM_BOT_TOKEN not configured");
    }

    const { message } = req.body;
    if (!message || !message.text) {
      return res.status(200).send("OK");
    }

    const chat_id = message.chat.id;
    const text = message.text;

    try {
      // Use Gemini to parse the natural language input
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

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const responseText = result.text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      if (parsed && parsed.type !== "UNKNOWN") {
        let collectionName = "";
        let finalData: any = {};
        let replyText = "";

        switch (parsed.type) {
          case "TASK":
            collectionName = "tasks";
            finalData = { ...parsed.data, status: "Pending", createdAt: serverTimestamp() };
            replyText = `✅ Задача создана: ${parsed.data.title}`;
            break;
          case "CONTACT":
            collectionName = "contacts";
            finalData = { ...parsed.data, createdAt: serverTimestamp() };
            replyText = `👤 Контакт добавлен: ${parsed.data.name} (${parsed.data.role})`;
            break;
          case "PROJECT":
            collectionName = "projects";
            finalData = { ...parsed.data, createdAt: serverTimestamp() };
            replyText = `🏗️ Объект зарегистрирован: ${parsed.data.name}`;
            break;
          case "COMM":
            collectionName = "communicationLogs";
            finalData = { 
              content: parsed.data.content, 
              type: parsed.data.commType || "Telegram", 
              sender: "System/Telegram",
              timestamp: new Date().toISOString()
            };
            replyText = `💬 Запись в журнал добавлена.`;
            break;
        }

        if (collectionName) {
          const docRef = await addDoc(collection(db, collectionName), finalData);
          console.log(`Saved ${parsed.type} with ID:`, docRef.id);
          
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
    const appUrl = process.env.APP_URL;
    
    if (!appUrl) {
      return res.status(400).json({ error: "APP_URL is not set. Please wait for the app to be deployed or check environment." });
    }

    const webhookUrl = `${appUrl}/api/telegram/webhook`;
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
      const data = await response.json();
      res.json({ message: "Webhook setup attempt complete", telegram_response: data, webhook_url: webhookUrl });
    } catch (error) {
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
