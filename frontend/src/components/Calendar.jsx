import React, { useEffect, useState } from "react";
import { getEvents } from "../lib/api";
import {
  Box,
  Grid,
  Text,
  Heading,
  VStack,
  Badge,
  useTheme,
} from "@chakra-ui/react";

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
    const data = await getEvents();
    setEvents(data || []);
  }

  useEffect(() => {
    loadEvents();
    window.addEventListener("eventsUpdated", loadEvents);
    return () => window.removeEventListener("eventsUpdated", loadEvents);
  }, []);

  const year = 2025;
  const month = 11;
  const monthDays = getDaysInMonth(year, month);

  const eventsByDay = {};
  for (const e of events) {
    const key = new Date(e.start).toISOString().split("T")[0];
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(e);
  }

  return (
    <Box p={8} bg="white" rounded="xl" shadow="md">
      <Heading size="lg" mb={6} textAlign="center">
        December 2025
      </Heading>

      <Grid templateColumns="repeat(7, 1fr)" gap={4} mb={3}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <Text key={d} fontWeight="bold" textAlign="center">
            {d}
          </Text>
        ))}
      </Grid>

      <Grid templateColumns="repeat(7, 1fr)" gap={4}>
        {monthDays.map((day) => {
          const key = day.toISOString().split("T")[0];
          const todaysEvents = eventsByDay[key] || [];

          return (
            <Box key={key} border="1px solid #e2e8f0" rounded="md" p={3} minH="120px">
              <Text fontWeight="bold" mb={2}>
                {day.getDate()}
              </Text>

              <VStack align="stretch" spacing={1}>
                {todaysEvents.map((ev) => (
                  <Badge key={ev.id} colorScheme="blue" px={2} py={1} rounded="md">
                    {ev.name}
                  </Badge>
                ))}

                {todaysEvents.length === 0 && (
                  <Text color="gray.400" fontSize="sm">
                    No events
                  </Text>
                )}
              </VStack>
            </Box>
          );
        })}
      </Grid>
    </Box>
  );
}
