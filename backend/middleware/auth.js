import { verifyToken } from "../controllers/authController.js";

export function requireAuth(req, res, next) {
    const header = String(req.headers.authorization || "");
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const user = verifyToken(token);

    if (!user) {
        return res.status(401).json({
            success: false,
            error: "Authentication required.",
        });
    }

    req.user = user;
    next();
}

export function requireAdmin(req, res, next) {
    if (req.user?.role !== "admin") {
        return res.status(403).json({
            success: false,
            error: "Admin access required.",
        });
    }

    next();
}
