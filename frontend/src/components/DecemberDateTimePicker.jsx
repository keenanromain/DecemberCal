import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  SimpleGrid,
  Text,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";

export default function DecemberDateTimePicker({ label, value, onChange }) {
  const YEAR = 2025;
  const MONTH = 11; // JS months are 0-indexed → 11 = December

  // Determine the weekday of Dec 1, 2025
  const firstDayWeekday = new Date(YEAR, MONTH, 1).getDay(); 
  // Dec 1 2025 = Monday → 1

  // Prepend empty cells so December starts in the correct column
  const daysInMonth = 31;
  const blanks = Array(firstDayWeekday).fill(null); 
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Convert incoming ISO → selected calendar day
  const initial = value ? new Date(value) : null;
  const [selectedDay, setSelectedDay] = useState(
    initial && initial.getMonth() === MONTH ? initial.getDate() : null
  );
  const [time, setTime] = useState(
    initial ? initial.toISOString().substring(11, 16) : "12:00"
  );

  const bgSelected = useColorModeValue("blue.500", "blue.300");
  const colorSelected = useColorModeValue("white", "black");

  // Build ISO timestamp whenever changes occur
  useEffect(() => {
    if (!selectedDay) return;
    const iso = `${YEAR}-12-${String(selectedDay).padStart(2, "0")}T${time}:00.000Z`;
    onChange(iso);
  }, [selectedDay, time]);

  return (
    <FormControl>
      <FormLabel fontWeight="bold">{label}</FormLabel>

      <Box p={4} borderWidth="1px" rounded="md" bg="white" shadow="sm">
        {/* Header */}
        <Text fontSize="lg" fontWeight="bold" textAlign="center" mb={2}>
          December {YEAR}
        </Text>

        {/* Weekday labels */}
        <SimpleGrid columns={7} textAlign="center" mb={2}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dow) => (
            <Text key={dow} fontWeight="semibold" fontSize="sm" color="gray.600">
              {dow}
            </Text>
          ))}
        </SimpleGrid>

        {/* Calendar Grid with correct alignment */}
        <SimpleGrid columns={7} spacing={2}>
          {/* Empty leading blanks */}
          {blanks.map((_, i) => (
            <Box key={`blank-${i}`} />
          ))}

          {/* Actual days */}
          {days.map((day) => {
            const isSelected = selectedDay === day;

            return (
              <Button
                key={day}
                size="sm"
                variant={isSelected ? "solid" : "outline"}
                bg={isSelected ? bgSelected : "transparent"}
                color={isSelected ? colorSelected : "inherit"}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </Button>
            );
          })}
        </SimpleGrid>

        {/* Time Picker */}
        <VStack mt={4} align="stretch">
          <FormLabel fontSize="sm">Time</FormLabel>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </VStack>
      </Box>
    </FormControl>
  );
}
