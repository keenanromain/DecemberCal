import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
  Badge,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";

import EventModal from "./EventModal";
import eventsApi from "../api/events";

// Pull full API: fetchEvents, fetchEvent, updateEvent
const { fetchEvents, fetchEvent, updateEvent } = eventsApi;

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
  const toast = useToast();

  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const dragInfoRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const bgDay = useColorModeValue("white", "gray.800");
  const bgHover = useColorModeValue("blue.50", "blue.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const days = buildDecemberGrid();
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /**
   * LOAD ALL EVENTS
   */
  const loadEvents = async () => {
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      console.error("[Calendar] loadEvents error:", err);
    }
  };

  /**
   * DELETE EVENT LOCALLY
   */
  const deleteEventLocally = (id) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
  };

  /**
   * SSE WIRING — REAL-TIME UPDATES
   */
  useEffect(() => {
    loadEvents(); // Load immediately on mount

    const source = new EventSource("http://localhost:4001/events/stream");

    source.addEventListener("update", async (evt) => {
      try {
        const payload = JSON.parse(evt.data);

        switch (payload.type) {
          case "insert":
          case "update":
            try {
              const updated = await fetchEvent(payload.id);

              setEvents((prev) => {
                const exists = prev.some((e) => e.id === payload.id);
                if (!exists) return [...prev, updated]; // new event
                return prev.map((e) => (e.id === payload.id ? updated : e)); // updated event
              });
            } catch (err) {
              console.error("[SSE fetchEvent failed]", err);
              loadEvents();
            }
            break;

          case "delete":
            deleteEventLocally(payload.id);
            break;

          case "refresh":
          default:
            loadEvents();
        }
      } catch (err) {
        console.error("[SSE parse error]", err);
      }
    });

    return () => source.close();
  }, []);

  /**
   * MAP EVENTS BY DATE FOR RENDERING
   */
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      const key = ev.start?.split("T")[0];
      if (!key) continue;
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
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    setSelectedDate(null);
    setSelectedEvent(ev);
  };

  /**
   * MOVE DATE OF EVENT WHILE PRESERVING TIME
   */
  const moveDateToNewDay = (originalISO, targetDay) => {
    const original = new Date(originalISO);
    return new Date(
      targetDay.getFullYear(),
      targetDay.getMonth(),
      targetDay.getDate(),
      original.getHours(),
      original.getMinutes(),
      original.getSeconds(),
      original.getMilliseconds()
    ).toISOString();
  };

  /** Drag start */
  const handleEventDragStart = (ev) => (e) => {
    dragInfoRef.current = {
      eventId: ev.id,
      originalStart: ev.start,
      originalEnd: ev.end,
    };

    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ev.id);
  };

  /** Drag end */
  const handleEventDragEnd = () => {
    dragInfoRef.current = null;
    setIsDragging(false);
  };

  /** Allow drop */
  const handleDayDragOver = (e) => {
    if (!dragInfoRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  /**
   * CLEAN PAYLOAD FOR PUT /events/:id
   */
  const buildCleanPayload = (ev, newStart, newEnd) => {
    const payload = {
      name: ev.name,
      description: ev.description,
      start: newStart,
      end: newEnd,
    };

    const stringFields = [
      ["location", ev.location],
      ["online_link", ev.online_link],
      ["location_notes", ev.location_notes],
      ["preparation_notes", ev.preparation_notes],
    ];

    for (const [key, value] of stringFields) {
      if (typeof value === "string" && value.trim().length > 0) {
        payload[key] = value;
      }
    }

    if (typeof ev.min_attendees === "number") {
      payload.min_attendees = ev.min_attendees;
    }
    if (typeof ev.max_attendees === "number") {
      payload.max_attendees = ev.max_attendees;
    }

    if (!payload.location && !payload.online_link) {
      throw new Error("Event must have either a location or online_link.");
    }

    return payload;
  };

  /**
   * DRAG + DROP MOVE
   */
  const handleDropOnDay = (day) => async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const dragInfo = dragInfoRef.current;
    if (!dragInfo) return;

    const { eventId, originalStart, originalEnd } = dragInfo;
    const ev = events.find((x) => x.id === eventId);
    if (!ev) return;

    const targetDate = new Date(DECEMBER_YEAR, DECEMBER_MONTH_INDEX, day);

    const originalDate = originalStart.split("T")[0];
    const targetKey = `2025-12-${String(day).padStart(2, "0")}`;
    if (originalDate === targetKey) return;

    const newStart = moveDateToNewDay(originalStart, targetDate);
    const newEnd = moveDateToNewDay(originalEnd, targetDate);

    try {
      const payload = buildCleanPayload(ev, newStart, newEnd);
      await updateEvent(eventId, payload);

      // optimistic update
      setEvents((prev) =>
        prev.map((x) =>
          x.id === eventId ? { ...x, start: newStart, end: newEnd } : x
        )
      );
    } catch (err) {
      console.error("[move event failed]", err);
      toast({
        title: "Failed to move event",
        description: err.message ?? "Error updating event.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      dragInfoRef.current = null;
      setIsDragging(false);
    }
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
              Drag an event to move it.
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
            {weekdayLabels.map((lab) => (
              <Box key={lab} py={2}>
                {lab}
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
                    onDragOver={handleDayDragOver}
                    onDrop={handleDropOnDay(day)}
                  >
                    <Text fontWeight="bold" fontSize="lg">
                      {day}
                    </Text>

                    {list.length === 0 ? (
                      <Text mt={2} color="gray.400" fontSize="xs" fontStyle="italic">
                        No events
                      </Text>
                    ) : (
                      <VStack
                        mt={2}
                        align="flex-start"
                        spacing={1}
                        maxH="70px"
                        overflow="hidden"
                      >
                        {list.slice(0, 3).map((ev) => (
                          <Badge
                            key={ev.id}
                            px={2}
                            py={0.5}
                            rounded="md"
                            fontSize="0.65rem"
                            colorScheme="blue"
                            cursor="grab"
                            draggable
                            _hover={{ opacity: 0.8 }}
                            onDragStart={handleEventDragStart(ev)}
                            onDragEnd={handleEventDragEnd}
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
