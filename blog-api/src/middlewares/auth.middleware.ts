import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const RAW_JWT_SECRET = process.env.JWT_SECRET;
if (!RAW_JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET chưa được định nghĩa trong tệp .env');
}
const JWT_SECRET: string = RAW_JWT_SECRET;

interface JwtPayload {
  userId: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để tiếp tục',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại',
    });
  }
}