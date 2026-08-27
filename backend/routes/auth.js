import express from "express";
import { login } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", login);

router.get("/me", requireAuth, (req, res) => {
    res.json({ success: true, user: req.user });
});

export default router;
