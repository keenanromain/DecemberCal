import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PrismaClient } from '@prisma/client';
import { eventSchema } from './validation';

const prisma = new PrismaClient();
const app = express();
const allowed = ['POST', 'PUT', 'DELETE', 'OPTIONS'];

app.use(cors());
app.use(bodyParser.json());

// Register /healthz as health check
app.get('/healthz', async (req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1;')
    console.log("[write-service] health status endpoint reached.");
    return res.status(200).json({ status: 'ok', service: 'write-service' })
  } catch (err) {
    console.error('[write-service] healthz failed:', err)
    return res.status(503).json({ status: 'error', service: 'write-service' })
  }
})

// Filter out all other GET requests
app.use((req, res, next) => {
  if (!allowed.includes(req.method)) {
    return res.status(405).json({
      error: `${req.method} not allowed — write service only supports POST, PUT, DELETE`
    });
  }
  next();
});

// Create event (POST)
app.post('/events', async (req, res) => {
  try {
    const data = eventSchema.parse(req.body);

    const created = await prisma.event.create({
      data: {
        name: data.name,
        description: data.description || '',
        start: new Date(data.start),
        end: new Date(data.end),
        location: data.location || null,
        online_link: data.online_link || null,
        min_attendees: data.min_attendees ?? null,
        max_attendees: data.max_attendees ?? null,
        location_notes: data.location_notes ?? null,
        preparation_notes: data.preparation_notes ?? null,
      },
    });

    return res.status(201).json(created);
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({
      error: err?.errors ?? err?.message ?? 'invalid payload',
    });
  }
});

// Update event (PUT)
app.put('/events/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const data = eventSchema.parse(req.body);

    const updated = await prisma.event.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || '',
        start: new Date(data.start),
        end: new Date(data.end),
        location: data.location || null,
        online_link: data.online_link || null,
        min_attendees: data.min_attendees ?? null,
        max_attendees: data.max_attendees ?? null,
        location_notes: data.location_notes ?? null,
        preparation_notes: data.preparation_notes ?? null,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({
      error: err?.errors ?? err?.message ?? 'invalid payload',
    });
  }
});

// Delete event (DELETE)
app.delete('/events/:id', async (req, res) => {
  try {
    const id = req.params.id;

    await prisma.event.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({
      error: err?.errors ?? err?.message ?? 'delete failed',
    });
  }
});

// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`[write-service-ts] listening on port ${port}`);
});
