import React, { useEffect, useState } from 'react'
import API from '../api'

const empty = {
  name: '',
  description: '',
  start: '',
  end: '',
  location: '',
  online_link: '',
  min_attendees: '',
  max_attendees: '',
  location_notes: '',
  preparation_notes: ''
}

export default function EventForm({ editing, onSaved, onCancel }) {
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (editing) {
      setForm({
        ...editing,
        start: new Date(editing.start).toISOString().slice(0, 16),
        end: new Date(editing.end).toISOString().slice(0, 16)
      })
    } else {
      setForm(empty)
    }
  }, [editing])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()

    const payload = {
      ...form,
      min_attendees: form.min_attendees
        ? Number(form.min_attendees)
        : undefined,
      max_attendees: form.max_attendees
        ? Number(form.max_attendees)
        : undefined
    }

    if (editing) {
      await API.writeClient.put(`/events/${editing.id}`, payload)
    } else {
      await API.writeClient.post('/events', payload)
    }

    onSaved()
  }

  return (
    <form
      onSubmit={submit}
      className="border p-4 rounded-md space-y-4 bg-gray-50"
    >
      <h2 className="font-bold text-lg">
        {editing ? 'Edit Event' : 'Create Event'}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Name</label>
          <input
            className="w-full border p-1"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
          />
        </div>

        <div>
          <label>Start</label>
          <input
            type="datetime-local"
            className="w-full border p-1"
            value={form.start}
            onChange={(e) => update('start', e.target.value)}
            required
          />
        </div>

        <div>
          <label>End</label>
          <input
            type="datetime-local"
            className="w-full border p-1"
            value={form.end}
            onChange={(e) => update('end', e.target.value)}
            required
          />
        </div>

        <div>
          <label>Location</label>
          <input
            className="w-full border p-1"
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label>Description</label>
        <textarea
          className="w-full border p-1"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
        ></textarea>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Min Attendees</label>
          <input
            className="w-full border p-1"
            value={form.min_attendees}
            onChange={(e) => update('min_attendees', e.target.value)}
          />
        </div>

        <div>
          <label>Max Attendees</label>
          <input
            className="w-full border p-1"
            value={form.max_attendees}
            onChange={(e) => update('max_attendees', e.target.value)}
          />
        </div>
      </div>

      <div className="space-x-2">
        <button className="px-3 py-1 border rounded" type="submit">
          {editing ? 'Save' : 'Create'}
        </button>

        {editing && (
          <button
            className="px-3 py-1 border rounded"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
