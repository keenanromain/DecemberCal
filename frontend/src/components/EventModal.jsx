// src/components/EventModal.jsx
import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  SimpleGrid,
  useToast,
  VStack,
} from "@chakra-ui/react";

import eventsApi from "../api/events";
const { createEvent, updateEvent, deleteEvent } = eventsApi;

function prettyDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function EventModal({
  dateISO,
  event,
  isOpen,
  onClose,
  onChange,
}) {
  const toast = useToast();
  const isEdit = !!event;

  // Local state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [onlineLink, setOnlineLink] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [minAttendees, setMinAttendees] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [prepNotes, setPrepNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // -------- Initialize when opened --------
  useEffect(() => {
    if (!isOpen) return;

    if (isEdit) {
      const {
        name,
        description,
        location,
        online_link,
        start,
        end,
        min_attendees,
        max_attendees,
        location_notes,
        preparation_notes,
      } = event;

      const startDate = new Date(start);
      const endDate = new Date(end);

      setName(name);
      setDescription(description || "");
      setLocation(location || "");
      setOnlineLink(online_link || "");
      setStartTime(startDate.toISOString().substring(11, 16));
      setEndTime(endDate.toISOString().substring(11, 16));
      setMinAttendees(min_attendees || "");
      setMaxAttendees(max_attendees || "");
      setLocationNotes(location_notes || "");
      setPrepNotes(preparation_notes || "");
    } else {
      setName("");
      setDescription("");
      setLocation("");
      setOnlineLink("");
      setStartTime("12:00");
      setEndTime("13:00");
      setMinAttendees("");
      setMaxAttendees("");
      setLocationNotes("");
      setPrepNotes("");
    }
  }, [isOpen, isEdit, dateISO, event]);

  // -------- Submit (POST or PUT) --------
  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const baseDate = isEdit ? event.start.split("T")[0] : dateISO;

      const start = new Date(`${baseDate}T${startTime}:00`);
      const end = new Date(`${baseDate}T${endTime}:00`);

      const payload = {
        name,
        description,
        start: start.toISOString(),
        end: end.toISOString(),
        location: location || undefined,
        online_link: onlineLink || undefined,
        min_attendees: minAttendees ? Number(minAttendees) : undefined,
        max_attendees: maxAttendees ? Number(maxAttendees) : undefined,
        location_notes: locationNotes || undefined,
        preparation_notes: prepNotes || undefined,
      };

      if (isEdit) {
        await updateEvent(event.id, payload);
        toast({ title: "Event updated", status: "success" });
      } else {
        await createEvent(payload);
        toast({ title: "Event created", status: "success" });
      }

      onClose();
      onChange();
    } catch (err) {
      console.error("[EventModal] failed:", err);
      toast({
        title: "Error",
        description: "Something went wrong",
        status: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // -------- Delete --------
  const handleDelete = async () => {
    if (!isEdit) return;

    try {
      await deleteEvent(event.id);
      toast({ title: "Event deleted", status: "info" });
      onClose();
      onChange();
    } catch (err) {
      console.error("[EventModal] delete error:", err);
      toast({ title: "Error deleting", status: "error" });
    }
  };

  const headerText = isEdit
    ? `Edit Event – ${prettyDate(event.start.split("T")[0])}`
    : `Create Event – ${prettyDate(dateISO)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{headerText}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Location</FormLabel>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Online Link</FormLabel>
              <Input
                value={onlineLink}
                onChange={(e) => setOnlineLink(e.target.value)}
              />
            </FormControl>

            <SimpleGrid columns={[1, 2]} spacing={4}>
              <FormControl>
                <FormLabel>Start Time</FormLabel>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>End Time</FormLabel>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={[1, 2]} spacing={4}>
              <FormControl>
                <FormLabel>Min Attendees</FormLabel>
                <NumberInput
                  min={0}
                  value={minAttendees}
                  onChange={(v) => setMinAttendees(v)}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Max Attendees</FormLabel>
                <NumberInput
                  min={0}
                  value={maxAttendees}
                  onChange={(v) => setMaxAttendees(v)}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel>Location Notes</FormLabel>
              <Textarea
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Preparation Notes</FormLabel>
              <Textarea
                value={prepNotes}
                onChange={(e) => setPrepNotes(e.target.value)}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          {isEdit && (
            <Button
              colorScheme="red"
              mr="auto"
              onClick={handleDelete}
              isDisabled={submitting}
            >
              Delete
            </Button>
          )}

          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>

          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={submitting}
          >
            {isEdit ? "Save Changes" : "Create Event"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
