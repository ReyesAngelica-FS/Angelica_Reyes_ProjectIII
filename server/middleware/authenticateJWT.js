import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export default function makeAuthenticateJWT(Sessions) {
    return async function authenticateJWT(req, res, next) {
        try {
        const bearer = req.header('Authorization')?.replace('Bearer ', '');
        const raw = req.cookies.app_jwt || bearer;
        if (!raw) return res.status(401).json({ error: 'Missing token' });

        const decoded = jwt.verify(raw, process.env.JWT_SECRET);
        const session = await Sessions.findOne({ jti: decoded.jti, userId: new ObjectId(decoded.sub) });
        if (!session) return res.status(401).json({ error: 'Session revoked' });

        req.user = { id: decoded.sub, jti: decoded.jti };
        next();
        } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
        }
    };
}
