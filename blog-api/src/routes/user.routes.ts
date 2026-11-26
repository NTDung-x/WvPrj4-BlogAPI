import { Router, Request, Response } from 'express';
import prisma from '../prisma.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const userRouter = Router();

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
};

// Get list các users
userRouter.get('/', async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: safeUserSelect,
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

// Get 1 user
userRouter.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy người dùng',
    });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// Hàm xử lý cập nhật chung cho cả PUT và PATCH (bỏ trống trường nào thì giữ nguyên trường đó)
async function handleUpdateUser(req: Request, res: Response) {
  const id = req.params.id as string;
  const { name, email } = req.body;

  if (req.userId !== id) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không thể chỉnh sửa thông tin này',
    });
  }

  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy người dùng',
    });
  }

  const data: { name?: string; email?: string } = {};
  if (typeof name === 'string' && name.trim()) data.name = name.trim();
  if (typeof email === 'string' && email.trim()) data.email = email.trim().toLowerCase();

  if (Object.keys(data).length === 0) {
    return res.status(200).json({
      success: true,
      data: existingUser,
    });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
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
}

userRouter.put('/:id', authenticate, handleUpdateUser);
userRouter.patch('/:id', authenticate, handleUpdateUser);

// Xóa người dùng
userRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (req.userId !== id) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không thể chỉnh sửa thông tin này'
    })
  }

  try {
    await prisma.user.delete({
      where: { id },
    });
  
    res.status(204).send();
  
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng',
      });
    }
    throw error;
  }
});

export default userRouter;