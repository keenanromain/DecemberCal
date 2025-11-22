import React, { useState, useEffect } from "react";

// Utility: Get all days of a month
function getDaysInMonth(year, month) {
  const date = new Date(year, month, 1);
  const days = [];

  while (date.getMonth() === month) {
    days.push(new Date(date)); // clone
    date.setDate(date.getDate() + 1);
  }

  return days;
}

export default function Calendar() {
  const [events, setEvents] = useState([]);

  async function loadEvents() {
    const res = await fetch("http://localhost:4001/events");
    const data = await res.json();
    setEvents(data);
  }

  useEffect(() => {
    loadEvents();
    const listener = () => loadEvents();
    window.addEventListener("eventsUpdated", listener);
    return () => window.removeEventListener("eventsUpdated", listener);
  }, []);

  // Hardcode December 2025
  const year = 2025;
  const month = 11; // December
  const monthDays = getDaysInMonth(year, month);

  // Determine which day of week the 1st falls on
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0=Sun, 1=Mon...

  const leadingEmptyCells = Array(startWeekday).fill(null);

  // Group events by YYYY-MM-DD
  const eventsByDate = {};
  for (const e of events) {
    const date = new Date(e.start).toISOString().split("T")[0];
    if (!eventsByDate[date]) eventsByDate[date] = [];
    eventsByDate[date].push(e);
  }

  return (
    <div className="mt-12 max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-4xl font-bold text-center mb-8">
        December 2025
      </h2>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-4 text-center font-semibold text-lg text-gray-700 mb-4">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-4">

        {/* Leading blanks */}
        {leadingEmptyCells.map((_, i) => (
          <div
            key={`empty-${i}`}
            className="border rounded-lg h-56 bg-gray-100"
          />
        ))}

        {/* Calendar days */}
        {monthDays.map((day) => {
          const dateKey = day.toISOString().split("T")[0];
          const todaysEvents = eventsByDate[dateKey] || [];

          return (
            <div
              key={dateKey}
              className="border rounded-lg h-56 bg-gray-50 p-4 overflow-y-auto"
            >
              {/* Day number */}
              <div className="text-xl font-bold mb-3 text-gray-800">
                {day.getDate()}
              </div>

              {/* Events */}
              {todaysEvents.length === 0 ? (
                <div className="text-gray-400 italic text-sm">No events</div>
              ) : (
                todaysEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-blue-100 text-blue-900 text-sm p-2 rounded mb-2 shadow-sm"
                  >
                    {ev.name}
                  </div>
                ))
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}


// import React, { useState, useEffect } from "react";

// // Utility: Get all days of a month
// function getDaysInMonth(year, month) {
//   const date = new Date(year, month, 1);
//   const days = [];

//   while (date.getMonth() === month) {
//     days.push(new Date(date)); // clone
//     date.setDate(date.getDate() + 1);
//   }

//   return days;
// }

// // Utility: compute leading blank squares before the 1st of the month
// function getLeadingEmptyCells(firstDayOfWeek) {
//   // Sunday = 0, Monday = 1, ..., Saturday = 6
//   // We want to fill empty slots until we reach Monday position
//   return Array(firstDayOfWeek).fill(null);
// }

// export default function Calendar() {
//   const [events, setEvents] = useState([]);

//   async function loadEvents() {
//     const res = await fetch("http://localhost:4001/events");
//     const data = await res.json();
//     setEvents(data);
//   }

//   useEffect(() => {
//     loadEvents();
//   }, []);

//   // 📌 Hardcode December 2025
//   const year = 2025;
//   const month = 11; // December (0-indexed)
//   const monthDays = getDaysInMonth(year, month);

//   // December 1, 2025 — let's get the weekday
//   const firstDay = new Date(year, month, 1);
//   const startWeekday = firstDay.getDay(); 
//   // getDay() → 0=Sun, 1=Mon, 2=Tue...

//   // For December 2025, startWeekday should be 1 (Monday)
//   const leadingCells = getLeadingEmptyCells(startWeekday);

//   // Group events by YYYY-MM-DD
//   const eventsByDate = {};
//   for (const e of events) {
//     const date = new Date(e.start).toISOString().split("T")[0];
//     if (!eventsByDate[date]) eventsByDate[date] = [];
//     eventsByDate[date].push(e);
//   }

//   return (
//     <div className="bg-white shadow-md border rounded-xl p-6 mt-12">
//       <h2 className="text-3xl font-bold mb-6 text-center">
//         December 2025
//       </h2>

//       {/* Weekday headers */}
//       <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-600 mb-3">
//         <div>Sun</div>
//         <div>Mon</div>
//         <div>Tue</div>
//         <div>Wed</div>
//         <div>Thu</div>
//         <div>Fri</div>
//         <div>Sat</div>
//       </div>

//       {/* Calendar Grid */}
//       <div className="grid grid-cols-7 gap-1">

//         {/* Leading empty boxes */}
//         {leadingCells.map((_, i) => (
//           <div key={`empty-${i}`} className="border h-40 bg-gray-100 rounded-lg p-2" />
//         ))}

//         {/* Actual days */}
//         {monthDays.map((day) => {
//           const dateKey = day.toISOString().split("T")[0];
//           const todaysEvents = eventsByDate[dateKey] || [];

//           return (
//             <div
//               key={dateKey}
//               className="border rounded-lg p-2 h-40 overflow-y-auto bg-gray-50"
//             >
//               {/* Date number */}
//               <div className="font-semibold mb-2 text-gray-800">
//                 {day.getDate()}
//               </div>

//               {/* Events */}
//               {todaysEvents.length === 0 ? (
//                 <div className="text-gray-400 text-sm italic">No events</div>
//               ) : (
//                 todaysEvents.map((ev) => (
//                   <div
//                     key={ev.id}
//                     className="bg-blue-100 text-blue-900 text-xs p-2 rounded mb-2 shadow-sm"
//                   >
//                     {ev.name}
//                   </div>
//                 ))
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// import React, { useState, useEffect } from "react";

// // Utility: Get days for current month
// function getDaysInMonth(year, month) {
//   const date = new Date(year, month, 1);
//   const days = [];

//   while (date.getMonth() === month) {
//     days.push(new Date(date)); // clone date
//     date.setDate(date.getDate() + 1);
//   }

//   return days;
// }

// export default function Calendar() {
//   const [events, setEvents] = useState([]);

//   async function loadEvents() {
//     const res = await fetch("http://localhost:4001/events");
//     const data = await res.json();
//     setEvents(data);
//   }

//   useEffect(() => {
//     loadEvents();
//   }, []);

//   // Pick December
// const year = 2025;
// const month = 11; // December (0-indexed)
// const monthDays = getDaysInMonth(year, month);

//   // Group events by date
//   const eventsByDate = {};
//   for (const e of events) {
//     const date = new Date(e.start).toISOString().split("T")[0]; // YYYY-MM-DD
//     if (!eventsByDate[date]) eventsByDate[date] = [];
//     eventsByDate[date].push(e);
//   }

//   return (
//     <div className="bg-white shadow-md border rounded-xl p-6 mt-12">
//       <h2 className="text-2xl font-bold mb-6">
//         {month+1}/{year}
//       </h2>

//       {/* 7-column grid for the days of the week */}
//       <div className="grid grid-cols-7 gap-3 text-center font-semibold text-gray-600 mb-3">
//         <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div>
//         <div>Thu</div><div>Fri</div><div>Sat</div>
//       </div>

//       {/* Month grid */}
//       <div className="grid grid-cols-7 gap-3">
//         {monthDays.map((day) => {
//           const dateKey = day.toISOString().split("T")[0];
//           const todaysEvents = eventsByDate[dateKey] || [];

//           return (
//             <div
//               key={dateKey}
//               className="border rounded-lg p-2 h-32 overflow-y-auto bg-gray-50"
//             >
//               <div className="font-semibold mb-1">{day.getDate()}</div>

//               {todaysEvents.length === 0 ? (
//                 <div className="text-gray-400 text-sm italic">—</div>
//               ) : (
//                 todaysEvents.map((ev) => (
//                   <div
//                     key={ev.id}
//                     className="bg-blue-100 text-blue-800 text-xs p-1 rounded mb-1"
//                   >
//                     {ev.name}
//                   </div>
//                 ))
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }
