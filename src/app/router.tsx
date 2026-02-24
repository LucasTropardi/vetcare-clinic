import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";
import { AppLayout } from "../layouts/AppLayout/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout/AuthLayout";
import { HomePage } from "../pages/Home/HomePage";
import { LoginPage } from "../pages/Login/LoginPage";
import { PlaceholderPage } from "../pages/Placeholder/PlaceholderPage";
import { AttendimentosPage } from "../pages/Attendimentos/AttendimentosPage";
import { ProntuariosPage } from "../pages/Prontuarios/ProntuariosPage";
import { PacientesPage } from "../pages/Pacientes/PacientesPage";
import { TutoresPage } from "../pages/Tutores/TutoresPage";
import { EstoqueInsumosPage } from "../pages/EstoqueInsumos/EstoqueInsumosPage";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/agenda", element: <HomePage /> },
      { path: "/atendimentos", element: <AttendimentosPage /> },
      { path: "/prontuarios", element: <ProntuariosPage /> },
      { path: "/estoque-insumos", element: <EstoqueInsumosPage /> },
      { path: "/pacientes", element: <PacientesPage /> },
      { path: "/tutores", element: <TutoresPage /> },
      { path: "/config", element: <PlaceholderPage title="Configurações" /> },
    ],
  },
]);
