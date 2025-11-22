import React, { useState, useEffect } from 'react'
import API from './api'
import EventForm from './components/EventForm'
import EventList from './components/EventList'

export default function App() {
  const [events, setEvents] = useState([])
  const [editing, setEditing] = useState(null)

  async function loadEvents() {
    const res = await API.readClient.get('/events')
    setEvents(res.data)
  }

  useEffect(() => {
    loadEvents()
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">EventBoard</h1>

      <EventForm
        editing={editing}
        onSaved={() => {
          setEditing(null)
          loadEvents()
        }}
        onCancel={() => setEditing(null)}
      />

      <EventList
        events={events}
        onEdit={(evt) => setEditing(evt)}
        onDeleted={() => loadEvents()}
      />
    </div>
  )
}