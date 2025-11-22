import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { eventSchema } from './validation'

const prisma = new PrismaClient()
const app = express()

app.use(cors())
app.use(bodyParser.json())

// ----------------------
// CREATE EVENT (POST)
// ----------------------
app.post('/events', async (req, res) => {
  try {
    const data = eventSchema.parse(req.body)

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
        preparation_notes: data.preparation_notes ?? null
      }
    })

    // Refresh materialized view
    await prisma.$executeRawUnsafe(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY events_read;'
    )

    res.status(201).json(created)
  } catch (err: any) {
    console.error(err)
    res.status(400).json({
      error: err?.errors ?? err?.message ?? 'invalid payload'
    })
  }
})

// ----------------------
// UPDATE EVENT (PUT)
// ----------------------
app.put('/events/:id', async (req, res) => {
  try {
    const id = req.params.id
    const data = eventSchema.parse(req.body)

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
        preparation_notes: data.preparation_notes ?? null
      }
    })

    await prisma.$executeRawUnsafe(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY events_read;'
    )

    res.json(updated)
  } catch (err: any) {
    console.error(err)
    res.status(400).json({
      error: err?.errors ?? err?.message ?? 'invalid payload'
    })
  }
})

// ----------------------
// DELETE EVENT (DELETE)
// ----------------------
app.delete('/events/:id', async (req, res) => {
  try {
    const id = req.params.id

    await prisma.event.delete({ where: { id } })

    await prisma.$executeRawUnsafe(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY events_read;'
    )

    res.status(204).send()
  } catch (err: any) {
    console.error(err)
    res.status(400).json({
      error: err?.errors ?? err?.message ?? 'delete failed'
    })
  }
})

// ----------------------
// SERVER START
// ----------------------
const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`[write-service-ts] listening on port ${port}`)
})