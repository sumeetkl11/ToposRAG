import jwt from 'jsonwebtoken';

/**
  * Verify the session JWT inside HttpOnly cookie payload.
  */
export function verifyJWT(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication session token is missing. Please sign in.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'topos_rag_session_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired session token.'
    });
  }
}
