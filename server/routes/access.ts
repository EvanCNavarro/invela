import { Router } from "express";

const router = Router();

// For now, we'll hard-code the access control
// Later this can be extended with real logic based on user roles, etc.
router.get("/api/access/dashboard", (req, res) => {
  // Ensure user is authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      hasAccess: false,
      message: "Authentication required"
    });
  }

  // For testing: Allow access to the dashboard
  res.json({ 
    hasAccess: true,
    message: "User has dashboard access"
  });
});

export default router;
