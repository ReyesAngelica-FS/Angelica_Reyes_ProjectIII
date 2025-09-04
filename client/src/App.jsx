import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "./auth/AuthContext.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";

import Login from "./pages/Login.jsx";
import Callback from "./pages/Callback.jsx";
import SearchPodcasts from "./pages/SearchPodcasts.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          {/* NOTE: callback is now at /callback (not /auth/callback) */}
          <Route path="/callback" element={<Callback />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="/search" element={<SearchPodcasts />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/search" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
