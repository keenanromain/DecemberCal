// src/components/Calendar.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
  Badge,
  useColorModeValue,
} from "@chakra-ui/react";
import EventModal from "./EventModal";
import eventsApi from "../api/events";

const { readClient } = eventsApi;

const DECEMBER_YEAR = 2025;
const DECEMBER_MONTH_INDEX = 11; // December

function buildDecemberGrid() {
  const days = [];
  const firstOfMonth = new Date(DECEMBER_YEAR, DECEMBER_MONTH_INDEX, 1);
  const lastOfMonth = new Date(DECEMBER_YEAR, DECEMBER_MONTH_INDEX + 1, 0);
  const daysInMonth = lastOfMonth.getDate();
  const firstWeekday = firstOfMonth.getDay();

  for (let i = 0; i < firstWeekday; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const bgDay = useColorModeValue("white", "gray.800");
  const bgHover = useColorModeValue("blue.50", "blue.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const days = buildDecemberGrid();
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const loadEvents = async () => {
    try {
      const res = await readClient.get("/events");
      setEvents(res.data);
    } catch (err) {
      console.error("[Calendar] failed to load events:", err);
    }
  };

  useEffect(() => {
    loadEvents();
    const source = new EventSource("http://localhost:4001/events/stream");

    source.addEventListener("connected", (evt) =>
      console.log("[SSE] connected:", evt.data)
    );

    source.addEventListener("update", (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        if (payload.type === "refresh") loadEvents();
      } catch (err) {
        console.error("[SSE] parse error:", err);
      }
    });

    source.onerror = (err) => console.error("[SSE] error:", err);

    return () => source.close();
  }, []);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      if (!ev.start) continue;
      const key = ev.start.split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const handleDayClick = (day) => {
    if (!day) return;
    const iso = `2025-12-${String(day).padStart(2, "0")}`;
    setSelectedEvent(null);
    setSelectedDate(iso);
  };

  const handleEventClick = (ev, e) => {
    e.stopPropagation();
    setSelectedDate(null);
    setSelectedEvent(ev);
  };

  return (
    <>
      <Box minH="100vh" bg={useColorModeValue("gray.100", "gray.900")} py={10}>
        <Box
          maxW="1200px"
          mx="auto"
          px={[4, 6, 8]}
          bg={useColorModeValue("white", "gray.800")}
          rounded="2xl"
          shadow="xl"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <VStack spacing={2} py={6}>
            <Heading size="lg">December 2025</Heading>
            <Text color="gray.500">
              Click a date to create an event. Click an event to edit or delete.
            </Text>
          </VStack>

          <Grid
            templateColumns="repeat(7, 1fr)"
            textAlign="center"
            fontWeight="bold"
            color="gray.600"
            pb={3}
            borderBottomWidth="1px"
            borderColor={borderColor}
          >
            {weekdayLabels.map((label) => (
              <Box key={label} py={2}>
                {label}
              </Box>
            ))}
          </Grid>

          <Grid templateColumns="repeat(7, 1fr)" gap={3} py={4}>
            {days.map((day, idx) => {
              if (day === null) return <Box key={idx} />;

              const dateKey = `2025-12-${String(day).padStart(2, "0")}`;
              const list = eventsByDate[dateKey] || [];

              return (
                <GridItem key={day}>
                  <Box
                    role="button"
                    cursor="pointer"
                    borderWidth="1px"
                    borderColor={borderColor}
                    rounded="xl"
                    bg={bgDay}
                    minH="120px"
                    p={3}
                    transition="all 0.15s"
                    _hover={{ bg: bgHover, transform: "translateY(-2px)" }}
                    onClick={() => handleDayClick(day)}
                  >
                    <Text fontWeight="bold" fontSize="lg">
                      {day}
                    </Text>

                    {list.length === 0 ? (
                      <Text mt={2} color="gray.400" fontSize="xs" fontStyle="italic">
                        No events
                      </Text>
                    ) : (
                      <VStack mt={2} align="flex-start" spacing={1} maxH="70px" overflow="hidden">
                        {list.slice(0, 3).map((ev) => (
                          <Badge
                            key={ev.id}
                            px={2}
                            py={0.5}
                            rounded="md"
                            fontSize="0.65rem"
                            colorScheme="blue"
                            cursor="pointer"
                            _hover={{ opacity: 0.8 }}
                            onClick={(e) => handleEventClick(ev, e)}
                          >
                            {ev.name}
                          </Badge>
                        ))}
                        {list.length > 3 && (
                          <Text fontSize="xs" color="gray.500">
                            +{list.length - 3} more…
                          </Text>
                        )}
                      </VStack>
                    )}
                  </Box>
                </GridItem>
              );
            })}
          </Grid>
        </Box>
      </Box>

      <EventModal
        dateISO={selectedDate}
        event={selectedEvent}
        isOpen={!!selectedDate || !!selectedEvent}
        onClose={() => {
          setSelectedDate(null);
          setSelectedEvent(null);
        }}
        onChange={loadEvents}
      />
    </>
  );
}
