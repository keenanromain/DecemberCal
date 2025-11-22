import React from 'react'
import API from '../api'

export default function EventList({ events, onEdit, onDeleted }) {
    async function remove(id) {
        if (!confirm('Delete this event?')) return
        await API.writeClient.delete(`/events/${id}`)
        onDeleted()
    }

    return (
        <div>
            {events.length === 0 && <p>No events found.</p>}

            <ul className="space-y-4">
                {events.map((evt) => (
                    <li key={evt.id} className="border p-4 rounded-md">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-lg">{evt.name}</h3>
                                <p className="text-sm text-gray-600">
                                    {new Date(evt.start).toLocaleString()} —{' '}
                                    {new Date(evt.end).toLocaleString()}
                                </p>
                                <p className="text-sm">{evt.location_display}</p>
                            </div>

                            <div className="space-x-2">
                                <button
                                    className="px-3 py-1 border rounded"
                                    onClick={() => onEdit(evt)}
                                >
                                    Edit
                                </button>
                                <button
                                    className="px-3 py-1 border rounded"
                                    onClick={() => remove(evt.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}