import { Container } from "@chakra-ui/react";
import Calendar from "./components/Calendar";

export default function App() {
  return (
    <Container maxW="container.xl" py={8}>
      <Calendar />
    </Container>
  );
}
