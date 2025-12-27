const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
// ===== Meta Webhook Gateway (GET verify + POST forward) =====

// Use an env var if set; otherwise fall back to a hardcoded token for MVP
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "bare_ai_verify_2026";

// GET: Meta verification handshake
app.get("/meta/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
    return res.status(200).send(challenge); // <-- plain text only
  }
  return res.sendStatus(403);
});

// POST: Receive webhook events (Meta) and forward to n8n
app.post("/meta/webhook", async (req, res) => {
  // Always ACK fast
  res.status(200).json({ ok: true });

  try {
    const N8N_EVENTS_URL = process.env.N8N_EVENTS_URL;
    if (!N8N_EVENTS_URL) {
      console.warn("N8N_EVENTS_URL missing; cannot forward.");
      return;
    }

    // Node 18+ usually has global fetch. If not, see Step 2.3 below.
    await fetch(N8N_EVENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
  } catch (err) {
    console.error("Error forwarding to n8n:", err);
  }
});


// TEMP: mock tenant store
const tenantsByPageId = {
  "123456789": {
    tenant_id: "medspa_001",
    page_access_token: "PASTE_REAL_PAGE_ACCESS_TOKEN_LATER",
    brand_name: "Glow Medspa",
    booking_url: "https://glowmedspa.com/book",
    tone: "luxury, warm, concise",
    escalation_keywords: ["infection","swelling","lawsuit","bleeding"]
  }
};

const processed = new Set();

// Health check
app.get("/", (req, res) => {
  res.json({ ok: true });
});

// 1️⃣ Tenant lookup
app.get("/api/tenants/by-page/:pageId", (req, res) => {
  const tenant = tenantsByPageId[req.params.pageId];
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });
  res.json(tenant);
});

// 2️⃣ Dedupe
app.post("/api/events/dedupe", (req, res) => {
  const { tenant_id, comment_id } = req.body || {};
  const key = `${tenant_id}:${comment_id}`;
  if (processed.has(key)) {
    return res.json({ shouldProcess: false });
  }
  processed.add(key);
  res.json({ shouldProcess: true });
});

// 3️⃣ Human review
app.post("/api/review/create", (req, res) => {
  console.log("HUMAN_REVIEW", req.body);
  res.json({ ok: true });
});

// 4️⃣ Log replies
app.post("/api/replies/log", (req, res) => {
  console.log("REPLY_LOG", req.body);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("API running on port", PORT);
});
