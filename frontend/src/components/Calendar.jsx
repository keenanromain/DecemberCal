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
import DateModal from "./DateModal";
import eventsApi, { READ_API } from "../api/events";

const { readClient } = eventsApi;

const DECEMBER_YEAR = 2025;
const DECEMBER_MONTH_INDEX = 11; // December

// Build the grid (Sunday first)
function buildDecemberGrid() {
  const days = [];

  const firstOfMonth = new Date(DECEMBER_YEAR, DECEMBER_MONTH_INDEX, 1);
  const lastOfMonth = new Date(DECEMBER_YEAR, DECEMBER_MONTH_INDEX + 1, 0);

  const daysInMonth = lastOfMonth.getDate();
  const firstWeekday = firstOfMonth.getDay(); // 0 = Sunday

  // Add leading blanks
  for (let i = 0; i < firstWeekday; i++) days.push(null);

  // Add days 1…31
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return days;
}

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); // "2025-12-05"

  const days = buildDecemberGrid();
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const bgDay = useColorModeValue("white", "gray.800");
  const bgHover = useColorModeValue("blue.50", "blue.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // ---- Load events from read-service ----
  const loadEvents = async () => {
    try {
      const res = await readClient.get("/events");
      setEvents(res.data);
    } catch (err) {
      console.error("[Calendar] failed to load events:", err);
    }
  };

  // ---- SSE hookup ----
  useEffect(() => {
    loadEvents(); // initial fetch

    const sseUrl = "http://localhost:4001/events/stream";
    console.log("[SSE] connecting to:", sseUrl);
    const source = new EventSource(sseUrl);


    source.addEventListener("connected", (evt) => {
      console.log("[SSE] connected:", evt.data);
    });

    source.addEventListener("update", (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        console.log("[SSE] update:", payload);
        if (payload.type === "refresh") {
          loadEvents();
        }
      } catch (err) {
        console.error("[SSE] parse error:", err);
      }
    });

    source.onerror = (err) => {
      console.error("[SSE] error:", err);
      // EventSource will retry automatically; we just log.
    };

    return () => {
      console.log("[SSE] closing stream");
      source.close();
    };
  }, []);

  // ---- Group events by YYYY-MM-DD (using raw string to avoid TZ off-by-one) ----
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      if (!ev.start) continue;
      const dateKey = ev.start.split("T")[0]; // backend sends ISO
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(ev);
    }
    return map;
  }, [events]);

  const handleDayClick = (day) => {
    if (!day) return;
    const iso = `2025-12-${String(day).padStart(2, "0")}`;
    setSelectedDate(iso);
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
          {/* Header */}
          <VStack spacing={2} py={6}>
            <Heading size="lg" textAlign="center">
              December 2025
            </Heading>
            <Text fontSize="md" color="gray.500">
              Click a date to create an event
            </Text>
          </VStack>

          {/* Weekday labels */}
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

          {/* Calendar grid */}
          <Grid templateColumns="repeat(7, 1fr)" gap={3} py={4} pb={8}>
            {days.map((day, idx) => {
              if (day === null) {
                return <Box key={`empty-${idx}`} />;
              }

              const dateKey = `2025-12-${String(day).padStart(2, "0")}`;
              const dayEvents = eventsByDate[dateKey] || [];

              return (
                <GridItem key={day}>
                  <Box
                    role="button"
                    cursor="pointer"
                    borderWidth="1px"
                    borderColor={borderColor}
                    rounded="xl"
                    bg={bgDay}
                    minH="110px"
                    p={3}
                    display="flex"
                    flexDirection="column"
                    justifyContent="space-between"
                    transition="background-color 0.15s ease, transform 0.1s ease"
                    _hover={{
                      bg: bgHover,
                      transform: "translateY(-2px)",
                    }}
                    onClick={() => handleDayClick(day)}
                  >
                    {/* Day number */}
                    <Text fontWeight="bold" fontSize="lg">
                      {day}
                    </Text>

                    {/* Events list */}
                    {dayEvents.length === 0 ? (
                      <Text
                        mt={2}
                        fontSize="xs"
                        color="gray.400"
                        fontStyle="italic"
                      >
                        No events
                      </Text>
                    ) : (
                      <VStack
                        mt={2}
                        spacing={1}
                        align="flex-start"
                        maxH="72px"
                        overflow="hidden"
                      >
                        {dayEvents.slice(0, 3).map((ev) => (
                          <Badge
                            key={ev.id}
                            colorScheme="blue"
                            px={2}
                            py={0.5}
                            rounded="md"
                            fontSize="0.65rem"
                            textOverflow="ellipsis"
                            overflow="hidden"
                            whiteSpace="nowrap"
                            maxW="100%"
                          >
                            {ev.name}
                          </Badge>
                        ))}
                        {dayEvents.length > 3 && (
                          <Text fontSize="xs" color="gray.500">
                            +{dayEvents.length - 3} more…
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

      {/* Event creation modal */}
      <DateModal
        dateISO={selectedDate}
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        onCreated={loadEvents}
      />
    </>
  );
}
