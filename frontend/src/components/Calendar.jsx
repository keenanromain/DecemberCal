// src/components/Calendar.jsx
import React, { useState } from "react";
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";

import DateModal from "./DateModal";

const DECEMBER_YEAR = 2025;
const DECEMBER_MONTH_INDEX = 11; // December

// Build the grid (Sunday-first)
function buildDecemberGrid() {
  const days = [];

  const firstOfMonth = new Date(DECEMBER_YEAR, DECEMBER_MONTH_INDEX, 1);
  const lastOfMonth = new Date(DECEMBER_YEAR, DECEMBER_MONTH_INDEX + 1, 0);

  const daysInMonth = lastOfMonth.getDate();

  // JS getDay(): 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const firstWeekday = firstOfMonth.getDay(); // Sunday-first layout

  // Add leading blanks
  for (let i = 0; i < firstWeekday; i++) {
    days.push(null);
  }

  // Add days 1–31
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  return days;
}

export default function Calendar() {
  const days = buildDecemberGrid();
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDateISO, setActiveDateISO] = useState(null);

  function handleDateClick(day) {
    const iso = `${DECEMBER_YEAR}-12-${String(day).padStart(2, "0")}`;
    setActiveDateISO(iso);
    setModalOpen(true);
  }

  const bgDay = useColorModeValue("white", "gray.800");
  const bgHover = useColorModeValue("blue.50", "blue.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  return (
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
            Click a date to create an event ✨
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
                  onClick={() => handleDateClick(day)} // <<< IMPORTANT
                >
                  {/* Day number */}
                  <Text fontWeight="bold" fontSize="lg">
                    {day}
                  </Text>

                  {/* Placeholder for events */}
                  <Text
                    mt={2}
                    fontSize="xs"
                    color="gray.400"
                    fontStyle="italic"
                  >
                    No events
                  </Text>
                </Box>
              </GridItem>
            );
          })}
        </Grid>
      </Box>

      {/* Event creation modal */}
      <DateModal
        isOpen={modalOpen}
        dateISO={activeDateISO}
        onClose={() => setModalOpen(false)}
      />
    </Box>
  );
}
