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
} from "@chakra-ui/react";
import eventsApi, { WRITE_API } from "../api/events";

const { writeClient } = eventsApi;

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

export default function DateModal({ dateISO, isOpen, onClose, onCreated }) {
    const toast = useToast();

    // basic guard
    useEffect(() => {
        if (!isOpen) return;
        // reset when opening
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
    }, [isOpen, dateISO]);

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

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        if (!dateISO) return;

        try {
            setSubmitting(true);

            const start = new Date(`${dateISO}T${startTime}:00`);
            const end = new Date(`${dateISO}T${endTime}:00`);

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

            await writeClient.post("/events", payload);


            toast({
                title: "Event created",
                description: "Your event has been added to the calendar.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });

            onClose?.();
            onCreated?.();
        } catch (err) {
            console.error("[DateModal] create event failed:", err);
            toast({
                title: "Error",
                description:
                    "Failed to create event. Make sure required fields are filled.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (!dateISO) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
            <ModalOverlay />
            <ModalContent as="form" onSubmit={handleSubmit}>
                <ModalHeader>
                    Create Event – {formatNiceDate(dateISO)}
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <FormControl isRequired>
                            <FormLabel>Name</FormLabel>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Event name"
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Description</FormLabel>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Event details…"
                            />
                        </FormControl>

                        <FormControl>
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
                    <Button mr={3} onClick={onClose} variant="ghost">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        colorScheme="blue"
                        isLoading={submitting}
                    >
                        Create Event
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
