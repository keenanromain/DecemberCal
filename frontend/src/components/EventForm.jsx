import React, { useState } from "react";
import { createEvent } from "../lib/api";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  VStack,
  Heading,
} from "@chakra-ui/react";

export default function EventForm() {
  const [form, setForm] = useState({
    name: "",
    start: "",
    end: "",
    location: "",
    description: "",
    minAttendees: "",
    maxAttendees: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name,
      description: form.description,
      location: form.location,
      start: new Date(form.start).toISOString(),
      end: new Date(form.end).toISOString(),
      minAttendees: form.minAttendees || null,
      maxAttendees: form.maxAttendees || null,
    };

    await createEvent(payload);

    // Notify calendar to reload
    window.dispatchEvent(new Event("eventsUpdated"));

    setForm({
      name: "",
      start: "",
      end: "",
      location: "",
      description: "",
      minAttendees: "",
      maxAttendees: "",
    });
  };

  return (
    <Box p={8} bg="white" rounded="xl" shadow="md">
      <Heading size="lg" mb={6}>
        Create Event
      </Heading>

      <form onSubmit={handleSubmit}>
        <VStack spacing={5}>
          <FormControl>
            <FormLabel>Event Name</FormLabel>
            <Input name="name" value={form.name} onChange={handleChange} />
          </FormControl>

          <FormControl>
            <FormLabel>Description</FormLabel>
            <Textarea
              name="description"
              value={form.description}
              onChange={handleChange}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Location</FormLabel>
            <Input name="location" value={form.location} onChange={handleChange} />
          </FormControl>

          <FormControl>
            <FormLabel>Start</FormLabel>
            <Input
              type="datetime-local"
              name="start"
              value={form.start}
              onChange={handleChange}
            />
          </FormControl>

          <FormControl>
            <FormLabel>End</FormLabel>
            <Input
              type="datetime-local"
              name="end"
              value={form.end}
              onChange={handleChange}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Minimum Attendees</FormLabel>
            <NumberInput>
              <NumberInputField
                name="minAttendees"
                value={form.minAttendees}
                onChange={handleChange}
              />
            </NumberInput>
          </FormControl>

          <FormControl>
            <FormLabel>Maximum Attendees</FormLabel>
            <NumberInput>
              <NumberInputField
                name="maxAttendees"
                value={form.maxAttendees}
                onChange={handleChange}
              />
            </NumberInput>
          </FormControl>

          <Button colorScheme="blue" type="submit" width="full" size="lg">
            Create Event
          </Button>
        </VStack>
      </form>
    </Box>
  );
}
