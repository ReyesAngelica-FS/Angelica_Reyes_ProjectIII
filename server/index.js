import "dotenv/config";
import app from "./app.js";

// Prefer PORT from .env, default to 8080
const port = Number(process.env.PORT || 8080);
const host = "127.0.0.1";

const server = app.listen(port, host, () => {
    console.log(`API listening on http://${host}:${port}`);
});

// ----- graceful shutdown & error logging -----
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Promise Rejection:", err);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down…`);
    server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
    // Force-exit if something hangs
    setTimeout(() => process.exit(1), 5000).unref();
}

["SIGINT", "SIGTERM"].forEach((sig) => process.on(sig, () => shutdown(sig)));
