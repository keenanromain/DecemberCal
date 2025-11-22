import React, { useEffect, useState } from "react";

export default function EventList() {
  const [events, setEvents] = useState([]);

  async function loadEvents() {
    const res = await fetch("http://localhost:4001/events");
    const data = await res.json();
    setEvents(data);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  if (events.length === 0) {
    return (
      <p className="text-gray-500 italic text-center">
        No events found.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold mb-4">Upcoming Events</h2>

      {events.map((e) => (
        <div
          key={e.id}
          className="bg-white shadow-sm border rounded-lg p-6 hover:shadow-md transition"
        >
          <h3 className="text-xl font-semibold">{e.name}</h3>

          <p className="text-gray-600 mt-1">{e.description}</p>

          <div className="mt-3 text-sm text-gray-500 space-y-1">
            <p>
              <span className="font-medium">When:</span>{" "}
              {new Date(e.start).toLocaleString()} →{" "}
              {new Date(e.end).toLocaleString()}
            </p>

            <p>
              <span className="font-medium">Location:</span> {e.location}
            </p>

            {e.minattendees && (
              <p>
                <span className="font-medium">Min Attendees:</span>{" "}
                {e.minattendees}
              </p>
            )}

            {e.maxattendees && (
              <p>
                <span className="font-medium">Max Attendees:</span>{" "}
                {e.maxattendees}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
