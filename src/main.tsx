import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { OidcAuthProvider } from "./auth/OidcAuthProvider";
import { AuthBootstrap } from "./Bootstrap";
import { Naming } from "./i18n/naming";
import "./theme/global.css";

Naming.init();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OidcAuthProvider>
      <RouterProvider router={router} />
      <AuthBootstrap />
    </OidcAuthProvider>
  </StrictMode>
);
