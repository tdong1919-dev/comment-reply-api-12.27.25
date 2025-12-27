const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

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
