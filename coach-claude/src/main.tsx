import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { useStore } from "./lib/store";

// Hydrate persisted data before first paint of the app shell.
useStore.getState().init();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
