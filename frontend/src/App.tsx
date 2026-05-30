import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import CanvasPage from "./canvas/CanvasPage";
import NavigatorPage from "./navigator/NavigatorPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/navigator" replace />} />
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="/navigator/*" element={<NavigatorPage />} />
        <Route path="*" element={<Navigate to="/navigator" replace />} />
      </Routes>
    </HashRouter>
  );
}
