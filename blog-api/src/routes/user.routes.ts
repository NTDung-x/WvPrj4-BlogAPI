import { Router, Request, Response } from 'express';
import prisma from '../prisma.js';

const userRouter = Router();

// Get list các users
userRouter.get('/', async (req: Request, res: Response) => {
  const users = await prisma.users.findMany({
    orderBy: { id: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

// Get 1 user
userRouter.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID không hợp lệ',
    });
  }

  const user = await prisma.users.findUnique({
    where: { id },
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

// Create Tạo người dùng mới
userRouter.post('/', async (req: Request, res: Response) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Tên và email không được bỏ trống',
    });
  }

  try {
    const newUser = await prisma.users.create({
      data: {
        name: name.trim(),
        email: email.trim(),
      },
    });

    res.status(201).json({
      success: true,
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

// Update toàn bộ thông tin người dùng
userRouter.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, email } = req.body;

  if (Number.isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID không hợp lệ',
    });
  }
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Tên và email không được bỏ trống',
    });
  }

  try {
    const updatedUser = await prisma.users.update({
      where: { id },
      data: {
        name: name.trim(),
        email: email.trim(),
      },
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng',
      });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Email đã được sử dụng',
      });
    }
    throw error;
  }
});

// Update 1 phần thông tin
userRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, email } = req.body;

  if (Number.isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID người dùng không hợp lệ',
    });
  }
  if (!name && !email) {
    return res.status(400).json({
      success: false,
      message: 'Cần cung cấp ít nhất một trường để cập nhật',
    });
  }

  const data: { name?: string; email?: string } = {};
  if (name) data.name = name.trim();
  if (email) data.email = email.trim();

  try {
    const updatedUser = await prisma.users.update({
      where: { id },
      data,
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng',
      });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Email đã được sử dụng',
      });
    }
    throw error;
  }
});

// Xóa người dùng
userRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID không hợp lệ',
    });
  }

  try {
    await prisma.users.delete({
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