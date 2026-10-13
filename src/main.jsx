import React from "react";
import { createRoot } from "react-dom/client";
import "./bombus"; // tokens, fonts, component styles and window.Bombus — load once, first
import "./app.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
