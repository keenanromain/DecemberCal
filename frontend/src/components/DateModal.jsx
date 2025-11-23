// src/components/DateModal.jsx
import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  useToast,
  SimpleGrid,
  VStack,
  HStack,
} from "@chakra-ui/react";
import {
  createEvent,
  updateEvent,
  deleteEvent,
} from "../api/events";

function formatNiceDate(dateISO) {
  if (!dateISO) return "";
  const [year, month, day] = dateISO.split("-").map(Number);
  const d = new Date(year, month - 1, day); // local date, no TZ shift
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

export default function DateModal({
  dateISO,
  activeEvent,   // optional event object for edit mode
  isOpen,
  onClose,
  onChanged,      // callback after create/update/delete
}) {
  const toast = useToast();

  // Form state
  const [localDate, setLocalDate] = useState(dateISO || "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [onlineLink, setOnlineLink] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [minAttendees, setMinAttendees] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [preparationNotes, setPreparationNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = !!activeEvent;

  // Populate form when modal opens / event changes
  useEffect(() => {
    if (!isOpen) return;

    if (activeEvent) {
      // EDIT MODE
      setName(activeEvent.name || "");
      setDescription(activeEvent.description || "");
      setLocation(activeEvent.location || "");
      setOnlineLink(activeEvent.online_link || "");

      // Dates & times from event
      if (activeEvent.start) {
        const start = new Date(activeEvent.start);
        const dateKey = activeEvent.start.split("T")[0];
        setLocalDate(dateKey);
        setStartTime(`${pad2(start.getHours())}:${pad2(start.getMinutes())}`);
      } else {
        setStartTime("12:00");
      }

      if (activeEvent.end) {
        const end = new Date(activeEvent.end);
        setEndTime(`${pad2(end.getHours())}:${pad2(end.getMinutes())}`);
      } else {
        setEndTime("13:00");
      }

      setMinAttendees(
        typeof activeEvent.min_attendees === "number"
          ? String(activeEvent.min_attendees)
          : ""
      );
      setMaxAttendees(
        typeof activeEvent.max_attendees === "number"
          ? String(activeEvent.max_attendees)
          : ""
      );
      setLocationNotes(activeEvent.location_notes || "");
      setPreparationNotes(activeEvent.preparation_notes || "");
    } else {
      // CREATE MODE
      setLocalDate(dateISO || "");
      setName("");
      setDescription("");
      setLocation("");
      setOnlineLink("");
      setStartTime("12:00");
      setEndTime("13:00");
      setMinAttendees("");
      setMaxAttendees("");
      setLocationNotes("");
      setPreparationNotes("");
    }

    setSubmitting(false);
  }, [isOpen, dateISO, activeEvent]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    const dateStr = localDate || dateISO;
    if (!dateStr) {
      toast({
        title: "Missing date",
        description: "Please choose a date for the event.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setSubmitting(true);

      const start = new Date(`${dateStr}T${startTime}:00`);
      const end = new Date(`${dateStr}T${endTime}:00`);

      const payload = {
        name,
        description: description || "",
        start: start.toISOString(),
        end: end.toISOString(),
        // Zod rule: must have either location or online_link
        location: location || undefined,
        online_link: onlineLink || undefined,
        min_attendees: minAttendees ? Number(minAttendees) : undefined,
        max_attendees: maxAttendees ? Number(maxAttendees) : undefined,
        location_notes: locationNotes || undefined,
        preparation_notes: preparationNotes || undefined,
      };

      if (isEditMode && activeEvent?.id) {
        await updateEvent(activeEvent.id, payload);
        toast({
          title: "Event updated",
          description: "Your changes have been saved.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        await createEvent(payload);
        toast({
          title: "Event created",
          description: "Your event has been added to the calendar.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      onClose?.();
      onChanged?.();
    } catch (err) {
      console.error("[DateModal] submit failed:", err);
      toast({
        title: "Error",
        description:
          "Failed to save event. Make sure required fields are filled and try again.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !activeEvent?.id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this event?"
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      await deleteEvent(activeEvent.id);

      toast({
        title: "Event deleted",
        status: "info",
        duration: 2500,
        isClosable: true,
      });

      onClose?.();
      onChanged?.();
    } catch (err) {
      console.error("[DateModal] delete failed:", err);
      toast({
        title: "Error",
        description: "Failed to delete event.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!dateISO && !isEditMode) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>
          {isEditMode
            ? `Edit Event – ${formatNiceDate(localDate || dateISO)}`
            : `Create Event – ${formatNiceDate(localDate || dateISO)}`}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Date</FormLabel>
              <Input
                type="date"
                value={localDate || ""}
                onChange={(e) => setLocalDate(e.target.value)}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Event name"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Event details…"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Location</FormLabel>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Physical location (or leave blank if online)"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Online Link (optional)</FormLabel>
              <Input
                value={onlineLink}
                onChange={(e) => setOnlineLink(e.target.value)}
                placeholder="https://…"
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
              <FormLabel>Location Notes (optional)</FormLabel>
              <Textarea
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                placeholder="Building, floor, parking notes…"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Preparation Notes (optional)</FormLabel>
              <Textarea
                value={preparationNotes}
                onChange={(e) => setPreparationNotes(e.target.value)}
                placeholder="Things to bring, setup instructions…"
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            {isEditMode && (
              <Button
                variant="outline"
                colorScheme="red"
                onClick={handleDelete}
                isLoading={submitting}
              >
                Delete
              </Button>
            )}
            <Button onClick={onClose} variant="ghost">
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={submitting}
            >
              {isEditMode ? "Save Changes" : "Create Event"}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
