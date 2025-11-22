import React, { useState } from "react";

export default function EventForm({ onEventCreated }) {
  const [form, setForm] = useState({
    name: "",
    start: "",
    end: "",
    location: "",
    description: "",
    minAttendees: "",
    maxAttendees: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name,
      description: form.description,
      location: form.location,
      start: new Date(form.start).toISOString(),
      end: new Date(form.end).toISOString(),
      minAttendees: form.minAttendees ? Number(form.minAttendees) : null,
      maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : null,
    };

    await fetch("http://localhost:4000/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setForm({
      name: "",
      start: "",
      end: "",
      location: "",
      description: "",
      minAttendees: "",
      maxAttendees: "",
    });

    if (onEventCreated) onEventCreated();
  };

  return (
    <div className="bg-white shadow-md border rounded-xl p-8 mb-12">
      <h2 className="text-2xl font-semibold mb-6">Create Event</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* NAME */}
        <div>
          <label className="block font-medium mb-1">Event Name</label>
          <input
            type="text"
            name="name"
            className="w-full border rounded-lg px-3 py-2"
            value={form.name}
            onChange={handleChange}
          />
        </div>

        {/* START / END */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-medium mb-1">Start</label>
            <input
              type="datetime-local"
              name="start"
              className="w-full border rounded-lg px-3 py-2"
              value={form.start}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">End</label>
            <input
              type="datetime-local"
              name="end"
              className="w-full border rounded-lg px-3 py-2"
              value={form.end}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* LOCATION */}
        <div>
          <label className="block font-medium mb-1">Location</label>
          <input
            type="text"
            name="location"
            className="w-full border rounded-lg px-3 py-2"
            value={form.location}
            onChange={handleChange}
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea
            name="description"
            className="w-full border rounded-lg px-3 py-2 h-24"
            value={form.description}
            onChange={handleChange}
          />
        </div>

        {/* MIN / MAX ATTENDEES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-medium mb-1">Minimum Attendees</label>
            <input
              type="number"
              name="minAttendees"
              className="w-full border rounded-lg px-3 py-2"
              value={form.minAttendees}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Maximum Attendees</label>
            <input
              type="number"
              name="maxAttendees"
              className="w-full border rounded-lg px-3 py-2"
              value={form.maxAttendees}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Create Event
        </button>
      </form>
    </div>
  );
}
