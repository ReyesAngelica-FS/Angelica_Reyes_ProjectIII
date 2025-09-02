import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";

export default function Callback() {
    const nav = useNavigate();
    const { loginWithToken } = useAuth();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (token) {
        loginWithToken(token);
        nav("/dashboard", { replace: true });
        } else {
        nav("/login", { replace: true });
        }
    }, [loginWithToken, nav]);

    return null; // or "Signing you in…"
}
