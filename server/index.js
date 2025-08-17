import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
