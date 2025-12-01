import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { eventSchema } from "./validation";

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/healthz", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1;");
    return res.json({ status: "ok", service: "write-service" });
  } catch {
    return res.status(503).json({ status: "error", service: "write-service" });
  }
});

// Create event
app.post("/events", async (req, res) => {
  try {
    const data = eventSchema.parse(req.body);

    const payload = {
      name: data.name,
      description: data.description ?? "",
      start: new Date(data.start),
      end: new Date(data.end),
      location: data.location ?? null,
      online_link: data.online_link ?? null,
      min_attendees: data.min_attendees ?? null,
      max_attendees: data.max_attendees ?? null,
      location_notes: data.location_notes ?? null,
      preparation_notes: data.preparation_notes ?? null,
    };

    const created = await prisma.event.create({ data: payload });

    return res.status(201).json(created);
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({
      error: err.errors ?? err.message ?? "invalid payload",
    });
  }
});


// Update event
app.put("/events/:id", async (req, res) => {
  try {
    const data = eventSchema.parse(req.body);
    const id = req.params.id;

    const payload = {
      name: data.name,
      description: data.description ?? "",
      start: new Date(data.start),
      end: new Date(data.end),
      location: data.location ?? null,
      online_link: data.online_link ?? null,
      min_attendees: data.min_attendees ?? null,
      max_attendees: data.max_attendees ?? null,
      location_notes: data.location_notes ?? null,
      preparation_notes: data.preparation_notes ?? null,
    };

    const updated = await prisma.event.update({
      where: { id },
      data: payload,
    });

    return res.json(updated);
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({
      error: err.errors ?? err.message ?? "invalid payload",
    });
  }
});

// Delete event
app.delete("/events/:id", async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Restrict GET methods
app.all("*", (req, res) => {
  if (req.method !== "OPTIONS" && !["POST", "PUT", "DELETE"].includes(req.method)) {
    return res.status(405).json({ error: `GET not allowed on write-service` });
  }
  res.end();
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, "0.0.0.0", () => {
  console.log(`[write-service-ts] listening on ${port}`);
});
