import crypto from "crypto";

const USERS = {
    "admin@smart.com": {
        password: "admin123",
        name: "SMART Admin",
        role: "admin",
    },
    "contributor@smart.com": {
        password: "user123",
        name: "SMART Contributor",
        role: "contributor",
    },
};

const SECRET = process.env.AUTH_SECRET || "smart-demo-auth-secret-2026";

function sign(value) {
    return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createToken(user) {
    const payload = Buffer.from(JSON.stringify({
        email: user.email,
        name: user.name,
        role: user.role,
    })).toString("base64url");

    return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
    if (!token || !token.includes(".")) return null;

    const [payload, signature] = token.split(".");
    const expected = sign(payload);

    if (signature.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return null;
    }

    try {
        return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
        return null;
    }
}

export function login(req, res) {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = USERS[email];

    if (!user || user.password !== password) {
        return res.status(401).json({
            success: false,
            error: "Invalid email or password.",
        });
    }

    const safeUser = {
        email,
        name: user.name,
        role: user.role,
    };

    return res.json({
        success: true,
        user: safeUser,
        token: createToken(safeUser),
    });
}
