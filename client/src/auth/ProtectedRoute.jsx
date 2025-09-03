import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth.js";

export default function ProtectedRoute() {
    const { token, loading } = useAuth();
    const location = useLocation();

    // Optional loading gate while verifying token
    if (loading) {
        return null; // or return a tiny spinner component
    }

    // No JWT → force login, remember where user tried to go
    if (!token) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Authenticated → render child route
    return <Outlet />;
}
