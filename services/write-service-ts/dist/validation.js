"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventSchema = void 0;
const zod_1 = require("zod");
exports.eventSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional().or(zod_1.z.literal('')),
    start: zod_1.z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Invalid start date' }),
    end: zod_1.z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Invalid end date' }),
    location: zod_1.z.string().optional(),
    online_link: zod_1.z.string().optional(),
    min_attendees: zod_1.z.number().int().positive().optional(),
    max_attendees: zod_1.z.number().int().positive().optional(),
    location_notes: zod_1.z.string().optional(),
    preparation_notes: zod_1.z.string().optional()
})
    .refine(d => new Date(d.end) > new Date(d.start), {
    message: 'end must be after start'
})
    .refine(d => d.location || d.online_link, {
    message: 'provide either location or online_link'
});
