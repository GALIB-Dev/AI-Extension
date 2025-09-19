import React from "react";
import { createRoot } from "react-dom/client";
import { SettingsPanelMinimal } from "../components/SettingsPanelMinimal";

const OptionsApp: React.FC = () => {
  return <SettingsPanelMinimal />;
};

const el = document.getElementById("options-root");
if (el) createRoot(el).render(<OptionsApp />);
