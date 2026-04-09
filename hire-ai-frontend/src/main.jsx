import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />

    <Toaster
      position="top-center"
      containerStyle={{
        zIndex: 99999, // ensures toast is above modals, navbars, etc.
      }}
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
        success: {
          style: {
            background: "#10b981",
            color: "white",
          },
        },
        error: {
          style: {
            background: "#ef4444",
            color: "white",
          },
        },
      }}
    />
  </StrictMode>
);