// src/App.jsx
import React from "react";
import { ChakraProvider, Container } from "@chakra-ui/react";
import Calendar from "./components/Calendar";

function App() {
  return (
    <ChakraProvider>
      <Container maxW="container.xl" py={8}>
        <Calendar />
      </Container>
    </ChakraProvider>
  );
}

export default App;