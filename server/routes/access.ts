import { Router } from "express";

const router = Router();

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

export default router;