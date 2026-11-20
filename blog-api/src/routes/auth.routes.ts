import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

const authRouter = Router();

const RAW_JWT_SECRET = process.env.JWT_SECRET;
const RAW_JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!RAW_JWT_SECRET || !RAW_JWT_REFRESH_SECRET) {
  throw new Error('FATAL ERROR: Thiếu JWT_SECRET hoặc JWT_REFRESH_SECRET trong tệp .env');
}

const JWT_SECRET: string = RAW_JWT_SECRET
const JWT_REFRESH_SECRET: string = RAW_JWT_REFRESH_SECRET

function generateTokens(userId: string) {
    const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
}

// Đăng ký tài khoản
authRouter.post('/register', async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
        return res.status(400).json({
            success: false,
            message: 'Tên, email và mật khẩu không được để trống'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Mật khẩu cần ít nhất 6 ký tự'
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password: hashedPassword,
            },

            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản thành công',
            data: newUser,
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                message: 'Email đã được sử dụng',
            });
        }
        throw error;
    }
});

// Đăng nhập, cấp token
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email và mật khẩu không được để trống',
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({
      success: false,
      message: 'Email hoặc mật khẩu không chính xác',
    });
  }

  const { accessToken, refreshToken } = generateTokens(user.id);

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    },
  });
});

// Cấp lại token
authRouter.post('/refresh', async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng đăng nhập lại (Thiếu refreshToken)'
        });
    }

    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        const tokens = generateTokens(user.id);

        res.status(200).json({
            success: true,
            data: tokens,
        });
    } catch {
        return res.status(401).json({
            success: false,
            message: 'Vui lòng đăng nhập lại(refreshToken không hợp lệ hoặc hết hạn)'
        })
    }
});

// Đăng xuất
authRouter.post('/logout', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Đăng xuất thành công'
    });
});

export default authRouter;