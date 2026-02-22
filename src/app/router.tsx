import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";
import { AppLayout } from "../layouts/AppLayout/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout/AuthLayout";
import { HomePage } from "../pages/Home/HomePage";
import { LoginPage } from "../pages/Login/LoginPage";
import { PlaceholderPage } from "../pages/Placeholder/PlaceholderPage";
import { AttendimentosPage } from "../pages/Attendimentos/AttendimentosPage";

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
      { path: "/prontuarios", element: <PlaceholderPage title="Prontuários" /> },
      { path: "/estoque-insumos", element: <PlaceholderPage title="Consulta de estoque" /> },
      { path: "/pacientes", element: <PlaceholderPage title="Pacientes" /> },
      { path: "/tutores", element: <PlaceholderPage title="Tutores" /> },
      { path: "/config", element: <PlaceholderPage title="Configurações" /> },
    ],
  },
]);
