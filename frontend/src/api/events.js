import axios from "axios";

// The frontend browser always reaches backend through localhost,
// because Docker publishes ports 4000 and 4001 to the host.
export const READ_API =
  import.meta.env.VITE_READ_API || "http://localhost:4001";

export const WRITE_API =
  import.meta.env.VITE_WRITE_API || "http://localhost:4000";


export const readClient = axios.create({ baseURL: READ_API });
export const writeClient = axios.create({ baseURL: WRITE_API });

// ---- REST API CALLS ----
export async function fetchEvents() {
  const res = await readClient.get("/events");
  return res.data;
}

export async function createEvent(payload) {
  const res = await writeClient.post("/events", payload);
  return res.data;
}

export async function updateEvent(id, payload) {
  const res = await writeClient.put(`/events/${id}`, payload);
  return res.data;
}

export async function deleteEvent(id) {
  const res = await writeClient.delete(`/events/${id}`);
  return res.data;
}

export default {
  readClient,
  writeClient,
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
