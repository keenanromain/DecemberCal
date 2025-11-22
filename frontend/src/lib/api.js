const WRITE_API = "http://localhost:4000";
const READ_API = "http://localhost:4001";

/**
 * Create a new event (write service).
 */
export async function createEvent(payload) {
  const res = await fetch(`${WRITE_API}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to create event: ${res.status}`);
  }

  return res.json().catch(() => ({})); // some endpoints return no body
}

/**
 * Fetch all events (read service).
 */
export async function getEvents() {
  const res = await fetch(`${READ_API}/events`);

  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.status}`);
  }

  return res.json();
}
