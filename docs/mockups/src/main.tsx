import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import Login from "./pages/Login";
import GarageList from "./pages/GarageList";
import GarageDetail from "./pages/GarageDetail";
import DamageUpload from "./pages/DamageUpload";
import ChatAssistant from "./pages/ChatAssistant";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="garages" element={<GarageList />} />
          <Route path="garages/:slug" element={<GarageDetail />} />
          <Route path="ai/damage" element={<DamageUpload />} />
          <Route path="ai/assistant" element={<ChatAssistant />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);