import React, { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  SimpleGrid,
  NumberInput,
  NumberInputField,
  useToast,
  VStack,
} from "@chakra-ui/react";

export default function EventForm() {
  const toast = useToast();

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
      minAttendees: form.minAttendees ? Number(form.minAttendees) : null,
      maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : null,
    };

    try {
      const res = await fetch("http://localhost:4000/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create event");

      toast({
        title: "Event created!",
        description: "Your event has been added to the calendar.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Reset form
      setForm({
        name: "",
        start: "",
        end: "",
        location: "",
        description: "",
        minAttendees: "",
        maxAttendees: "",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create event. Check the backend.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box
      bg="white"
      p={8}
      mt={12}
      rounded="xl"
      shadow="md"
      borderWidth="1px"
      maxW="900px"
      mx="auto"
    >
      <form onSubmit={handleSubmit}>
        <VStack spacing={6} align="stretch">

          {/* Name */}
          <FormControl>
            <FormLabel>Event Name</FormLabel>
            <Input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Christmas Party"
            />
          </FormControl>

          {/* Start / End */}
          <SimpleGrid columns={[1, 2]} spacing={6}>
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
          </SimpleGrid>

          {/* Location */}
          <FormControl>
            <FormLabel>Location</FormLabel>
            <Input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="New York City"
            />
          </FormControl>

          {/* Description */}
          <FormControl>
            <FormLabel>Description</FormLabel>
            <Textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Event details..."
              resize="vertical"
            />
          </FormControl>

          {/* Min / Max attendees */}
          <SimpleGrid columns={[1, 2]} spacing={6}>
            <FormControl>
              <FormLabel>Minimum Attendees</FormLabel>
              <NumberInput
                min={0}
                value={form.minAttendees}
                onChange={(v) =>
                  setForm({ ...form, minAttendees: v })
                }
              >
                <NumberInputField name="minAttendees" />
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>Maximum Attendees</FormLabel>
              <NumberInput
                min={0}
                value={form.maxAttendees}
                onChange={(v) =>
                  setForm({ ...form, maxAttendees: v })
                }
              >
                <NumberInputField name="maxAttendees" />
              </NumberInput>
            </FormControl>
          </SimpleGrid>

          {/* Submit */}
          <Button
            type="submit"
            colorScheme="blue"
            size="lg"
            alignSelf="flex-start"
          >
            Create Event
          </Button>
        </VStack>
      </form>
    </Box>
  );
}
