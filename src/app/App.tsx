import { BrowserRouter } from "react-router-dom";
import { MindPulseProvider } from "./store";
import { AppRoutes } from "./routes";

export default function App() {
  return (
    <BrowserRouter>
      <MindPulseProvider>
        <AppRoutes />
      </MindPulseProvider>
    </BrowserRouter>
  );
}
