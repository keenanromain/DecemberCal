import React from "react";
import EventForm from "./components/EventForm.jsx";
import EventList from "./components/EventList.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 px-4 py-10">
      <h1 className="text-4xl font-bold mb-10 text-center text-gray-800">
        DecemberCal
      </h1>

      <div className="max-w-4xl mx-auto">
        <EventForm />
        <EventList />
      </div>
    </div>
  );
}

