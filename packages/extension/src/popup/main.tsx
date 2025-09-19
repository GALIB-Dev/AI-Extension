import React from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "./popupApp";
const el = document.getElementById("root");
if (el) createRoot(el).render(<PopupApp />);
