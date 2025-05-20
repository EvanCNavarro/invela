"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// For now, we'll default to allowing dashboard access for authenticated users
router.get("/api/access/dashboard", (req, res) => {
    // Ensure user is authenticated
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            hasAccess: false,
            message: "Authentication required"
        });
    }
    // For testing: Allow access to the dashboard for authenticated users
    res.json({
        hasAccess: true,
        message: "User has dashboard access"
    });
});
exports.default = router;
