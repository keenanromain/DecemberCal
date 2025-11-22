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
app.use((req, res, next) => {
  if (!allowed.includes(req.method)) {
    return res.status(405).json({
      error: `${req.method} not allowed — write service only supports POST, PUT, DELETE`
    });
  }
  next();
});

// CREATE EVENT (POST)
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

    await prisma.$executeRawUnsafe(`
      REFRESH MATERIALIZED VIEW events_read;
    `);
    console.log("[write-service] materialized view refresh complete.");

    return res.status(201).json(created);
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({
      error: err?.errors ?? err?.message ?? 'invalid payload',
    });
  }
});

// UPDATE EVENT (PUT)
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

    await prisma.$executeRawUnsafe(`
      REFRESH MATERIALIZED VIEW events_read;
    `);
    console.log("[write-service] materialized view refresh complete.");

    return res.json(updated);
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({
      error: err?.errors ?? err?.message ?? 'invalid payload',
    });
  }
});

// DELETE EVENT (DELETE)
app.delete('/events/:id', async (req, res) => {
  try {
    const id = req.params.id;

    await prisma.event.delete({
      where: { id },
    });

    await prisma.$executeRawUnsafe(`
      REFRESH MATERIALIZED VIEW events_read;
    `);
    console.log("[write-service] materialized view refresh complete.");

    return res.status(204).send();
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({
      error: err?.errors ?? err?.message ?? 'delete failed',
    });
  }
});

// START SERVER
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`[write-service-ts] listening on port ${port}`);
});
