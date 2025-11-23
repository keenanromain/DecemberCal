"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const validation_1 = require("./validation");
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// ----------------------
// CREATE EVENT (POST)
// ----------------------
app.post('/events', async (req, res) => {
    try {
        const data = validation_1.eventSchema.parse(req.body);
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
        });
        res.status(201).json(created);
    }
    catch (err) {
        console.error(err);
        res.status(400).json({
            error: err?.errors ?? err?.message ?? 'invalid payload'
        });
    }
});
// ----------------------
// UPDATE EVENT (PUT)
// ----------------------
app.put('/events/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = validation_1.eventSchema.parse(req.body);
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
        });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(400).json({
            error: err?.errors ?? err?.message ?? 'invalid payload'
        });
    }
});
// ----------------------
// DELETE EVENT (DELETE)
// ----------------------
app.delete('/events/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await prisma.event.delete({ where: { id } });
        res.status(204).send();
    }
    catch (err) {
        console.error(err);
        res.status(400).json({
            error: err?.errors ?? err?.message ?? 'delete failed'
        });
    }
});
// ----------------------
// SERVER START
// ----------------------
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`[write-service-ts] listening on port ${port}`);
});
