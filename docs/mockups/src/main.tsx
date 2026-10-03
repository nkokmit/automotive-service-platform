import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ServicesList from "./pages/ServicesList";
import ServiceDetail from "./pages/ServiceDetail";
import DamageUpload from "./pages/DamageUpload";
import ChatAssistant from "./pages/ChatAssistant";
import FoundationDemo from "./pages/FoundationDemo";
import BoomDemo from "./pages/BoomDemo";
import CarsList from "./pages/CarsList";
import CarDetail from "./pages/CarDetail";
import PartsList from "./pages/PartsList";
import PartDetail from "./pages/PartDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import { ErrorBoundary, NotFoundPage } from "./components/ErrorBoundary";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(error, info) => {
        // eslint-disable-next-line no-console
        console.error("[Top-level ErrorBoundary]", error, info);
        // TODO: gửi lên Sentry / log server khi tích hợp
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="services" element={<ServicesList />} />
            <Route path="services/:slug" element={<ServiceDetail />} />
            <Route path="cars" element={<CarsList />} />
            <Route path="cars/:slug" element={<CarDetail />} />
            <Route path="parts" element={<PartsList />} />
            <Route path="parts/:slug" element={<PartDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="ai/damage" element={<DamageUpload />} />
            <Route path="ai/assistant" element={<ChatAssistant />} />
            <Route
              path="foundation"
              element={<FoundationDemo />}
            />
            <Route
              path="boom-demo"
              element={<BoomDemo />}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);