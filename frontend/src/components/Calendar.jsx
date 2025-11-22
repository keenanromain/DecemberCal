import React, { useState, useEffect } from "react";
import { Box, Text, Grid, GridItem, Heading } from "@chakra-ui/react";

// Utility: Get all days in a specific month
function getDaysInMonth(year, month) {
  const date = new Date(year, month, 1);
  const days = [];

  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return days;
}

export default function Calendar() {
  const [events, setEvents] = useState([]);

  async function loadEvents() {
    try {
      const res = await fetch("http://localhost:4001/events");
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  }

  // Initial load
  useEffect(() => {
    loadEvents();
  }, []);

  // Listen for updates from the EventForm
  useEffect(() => {
    function handleUpdate() {
      loadEvents();
    }

    window.addEventListener("eventsUpdated", handleUpdate);
    return () => window.removeEventListener("eventsUpdated", handleUpdate);
  }, []);

  // Hardcode December 2025
  const year = 2025;
  const month = 11; // December (zero-indexed)
  const monthDays = getDaysInMonth(year, month);

  // Group events by date
  const eventsByDate = {};
  for (const ev of events) {
    const date = new Date(ev.start).toISOString().split("T")[0]; // YYYY-MM-DD
    if (!eventsByDate[date]) eventsByDate[date] = [];
    eventsByDate[date].push(ev);
  }

  return (
    <Box width="100%" maxW="1200px" mx="auto" mt={12} px={4}>
      <Heading textAlign="center" fontSize="3xl" mb={4}>
        December 2025
      </Heading>

      {/* Weekday labels */}
      <Grid templateColumns="repeat(7, 1fr)" textAlign="center" mb={4}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dow) => (
          <Text key={dow} fontWeight="bold" fontSize="lg">
            {dow}
          </Text>
        ))}
      </Grid>

      {/* Calendar grid */}
      <Grid templateColumns="repeat(7, 1fr)" gap={4}>
        {monthDays.map((day) => {
          const dateKey = day.toISOString().split("T")[0];
          const todaysEvents = eventsByDate[dateKey] || [];

          return (
            <GridItem key={dateKey}>
              <Box
                borderWidth="1px"
                rounded="lg"
                p={3}
                h="150px"
                overflowY="auto"
                bg="gray.50"
                _hover={{ bg: "gray.100" }}
                transition="0.2s"
              >
                {/* Day number */}
                <Text fontWeight="bold" fontSize="lg">
                  {day.getDate()}
                </Text>

                {/* Events */}
                {todaysEvents.length === 0 ? (
                  <Text
                    fontSize="sm"
                    color="gray.400"
                    mt={2}
                    fontStyle="italic"
                  >
                    No events
                  </Text>
                ) : (
                  todaysEvents.map((ev) => (
                    <Box
                      key={ev.id}
                      bg="blue.50"
                      color="blue.700"
                      p={1}
                      rounded="md"
                      fontSize="xs"
                      mt={2}
                      borderWidth="1px"
                      borderColor="blue.200"
                    >
                      {ev.name}
                    </Box>
                  ))
                )}
              </Box>
            </GridItem>
          );
        })}
      </Grid>
    </Box>
  );
}
