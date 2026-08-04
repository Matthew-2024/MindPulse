import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MindPulseProvider } from "./store";
import { AppRoutes } from "./routes";
import { ResourceAdminPage } from "../features/resource-admin/ResourceAdminPage";

function ResourceAdminRoute() {
  return import.meta.env.DEV ? <ResourceAdminPage /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/resource-admin" element={<ResourceAdminRoute />} />
        <Route path="*" element={<MindPulseProvider><AppRoutes /></MindPulseProvider>} />
      </Routes>
    </BrowserRouter>
  );
}
