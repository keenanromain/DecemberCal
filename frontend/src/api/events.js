// src/api/events.js

import axios from "axios";

const READ_URL = "http://localhost:4001";
const WRITE_URL = "http://localhost:4000";

//
// ---------- READ SERVICE ----------
//

/** GET /events → returns array */
export async function fetchEvents() {
  const res = await axios.get(`${READ_URL}/events`);
  return res.data;
}

/** GET /events/:id → returns single event */
export async function fetchEvent(id) {
  const res = await axios.get(`${READ_URL}/events/${id}`);
  return res.data;
}

//
// ---------- WRITE SERVICE ----------
//

/** PUT /events/:id → updates event */
export async function updateEvent(id, payload) {
  const res = await axios.put(`${WRITE_URL}/events/${id}`, payload);
  return res.data;
}

/** POST /events → create event */
export async function createEvent(payload) {
  const res = await axios.post(`${WRITE_URL}/events`, payload);
  return res.data;
}

/** DELETE /events/:id */
export async function deleteEvent(id) {
  await axios.delete(`${WRITE_URL}/events/${id}`);
}

//
// ---------- EXPORT API OBJECT ----------
//
export default {
  fetchEvents,
  fetchEvent,
  updateEvent,
  createEvent,
  deleteEvent,
};
