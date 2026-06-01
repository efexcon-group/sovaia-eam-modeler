import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@sovaia/app-shell-theming/react";
import { SOVAIA_THEME } from "@sovaia/app-shell-theming";
import CanvasPage from "./canvas/CanvasPage";
import NavigatorPage from "./navigator/NavigatorPage";
import ModelerShell from "./shell/ModelerShell";

export default function App() {
  return (
    <ThemeProvider theme={SOVAIA_THEME}>
      <HashRouter>
        <ModelerShell>
          <Routes>
            <Route path="/" element={<Navigate to="/navigator" replace />} />
            <Route path="/canvas" element={<CanvasPage />} />
            <Route path="/navigator/*" element={<NavigatorPage />} />
            <Route path="*" element={<Navigate to="/navigator" replace />} />
          </Routes>
        </ModelerShell>
      </HashRouter>
    </ThemeProvider>
  );
}
