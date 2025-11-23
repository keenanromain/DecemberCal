import React, { useState } from "react";
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
    VStack,
    useToast,
} from "@chakra-ui/react";

export default function DateModal({ isOpen, onClose, dateISO }) {
    const toast = useToast();

    const [form, setForm] = useState({
        name: "",
        description: "",
        location: "",
        startTime: "12:00",
        endTime: "13:00",
        minAttendees: "",
        maxAttendees: "",
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        // Construct full ISO datetime from selected date + time fields
        const start = `${dateISO}T${form.startTime}:00.000Z`;
        const end = `${dateISO}T${form.endTime}:00.000Z`;

        const payload = {
            name: form.name,
            description: form.description,
            location: form.location,
            start,
            end,
            min_attendees: form.minAttendees ? Number(form.minAttendees) : undefined,
            max_attendees: form.maxAttendees ? Number(form.maxAttendees) : undefined,
        };

        try {
            const res = await fetch("http://localhost:4000/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Submit failed");

            toast({
                title: "Event created!",
                status: "success",
                duration: 2500,
                isClosable: true,
            });

            onClose(true); // signal success to parent (calendar)
        } catch (err) {
            toast({
                title: "Error creating event",
                status: "error",
                duration: 2500,
                isClosable: true,
            });

            onClose(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={() => onClose(false)}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    Create Event – {(() => {
                        if (!dateISO) return "";

                        const [year, month, day] = dateISO.split("-").map(Number);
                        const d = new Date(year, month - 1, day); // local date, no timezone shift

                        return d.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        });
                    })()}
                </ModalHeader>



                <ModalCloseButton />

                <ModalBody>
                    <VStack spacing={4}>

                        <FormControl>
                            <FormLabel>Name</FormLabel>
                            <Input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Event name"
                            />
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
                            <Input
                                name="location"
                                value={form.location}
                                onChange={handleChange}
                            />
                        </FormControl>

                        {/* Time fields */}
                        <FormControl>
                            <FormLabel>Start Time</FormLabel>
                            <Input
                                type="time"
                                name="startTime"
                                value={form.startTime}
                                onChange={handleChange}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>End Time</FormLabel>
                            <Input
                                type="time"
                                name="endTime"
                                value={form.endTime}
                                onChange={handleChange}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Min Attendees</FormLabel>
                            <Input
                                type="number"
                                name="minAttendees"
                                value={form.minAttendees}
                                onChange={handleChange}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Max Attendees</FormLabel>
                            <Input
                                type="number"
                                name="maxAttendees"
                                value={form.maxAttendees}
                                onChange={handleChange}
                            />
                        </FormControl>

                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" onClick={handleSubmit}>
                        Submit
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
