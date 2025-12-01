// src/App.jsx
import React from "react";
import { Container } from "@chakra-ui/react";
import Calendar from "./components/Calendar";

function App() {
  return (
    <Container maxW="container.xl" py={8}>
      <Calendar />
    </Container>
  );
}

export default App;