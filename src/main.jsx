import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { MoneyLensProvider } from "./context/MoneyLensContext.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SettingsProvider>
      <MoneyLensProvider>
        <App />
      </MoneyLensProvider>
    </SettingsProvider>
  </React.StrictMode>
);
