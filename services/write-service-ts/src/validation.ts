import { z } from 'zod'

export const eventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().or(z.literal('')),
  start: z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Invalid start date' }),
  end: z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Invalid end date' }),
  location: z.string().optional(),
  online_link: z.string().optional(),
  min_attendees: z.number().int().positive().optional(),
  max_attendees: z.number().int().positive().optional(),
  location_notes: z.string().optional(),
  preparation_notes: z.string().optional()
})
.refine(d => new Date(d.end) > new Date(d.start), {
  message: 'end must be after start'
})
.refine(d => d.location || d.online_link, {
  message: 'provide either location or online_link'
})