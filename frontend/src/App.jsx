import React from "react";
import { Box, Container, Heading, Stack } from "@chakra-ui/react";
import EventForm from "./components/EventForm";
import Calendar from "./components/Calendar";

export default function App() {
  return (
    <Container maxW="6xl" py={10}>
      <Stack spacing={12}>
        <Box textAlign="center">
          <Heading size="2xl">DecemberCal</Heading>
        </Box>

        <Calendar />

        <EventForm />
      </Stack>
    </Container>
  );
}


