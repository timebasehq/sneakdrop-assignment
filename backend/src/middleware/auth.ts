import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const cookieName = process.env.COOKIE_NAME || "sneakdrop_session";
const jwtSecret = process.env.JWT_SECRET || "secret";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies[cookieName];
  if (!token) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  next();
};
