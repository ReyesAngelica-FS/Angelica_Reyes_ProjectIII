// client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "./auth/AuthContext.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";

// Pages
import Login from "./pages/Login.jsx";
import Callback from "./pages/Callback.jsx";
import SearchPodcasts from "./pages/SearchPodcasts.jsx";
// Optional extras:
// import Dashboard from "./pages/Dashboard.jsx";
// import Playlists from "./pages/Playlists.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<Callback />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            {/* Default → /search */}
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="/search" element={<SearchPodcasts />} />
            {/* Optional:
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/playlists" element={<Playlists />} />
            */}
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/search" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
