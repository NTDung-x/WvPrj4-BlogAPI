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
  const id = req.params.id as string;

  if (Number.isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID không hợp lệ',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect
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
// userRouter.post('/', async (req: Request, res: Response) => {
//   const { name, email } = req.body;

//   if (!name || !email) {
//     return res.status(400).json({
//       success: false,
//       message: 'Tên và email không được bỏ trống',
//     });
//   }

//   try {
//     const newUser = await prisma.users.create({
//       data: {
//         name: name.trim(),
//         email: email.trim(),
//       },
//     });

//     res.status(201).json({
//       success: true,
//       data: newUser,
//     });
//   } catch (error: any) {
//     if (error.code === 'P2002') {
//       return res.status(409).json({
//         success: false,
//         message: 'Email đã được sử dụng',
//       });
//     }
//     throw error;
//   }
// });

// Update toàn bộ thông tin người dùng
userRouter.put('/:id', authenticate, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, email } = req.body;

  if (Number.isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID không hợp lệ',
    });
  }

  if (req.userId !== id) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không thể chỉnh sửa thông tin này'
    })
  }

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Tên và email không được bỏ trống',
    });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      },
      select: safeUserSelect,
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
userRouter.patch('/:id', authenticate, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, email } = req.body;

  if (req.userId !== id) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không thể chỉnh sửa thông tin này'
    });
  }

  if (!name?.trim() && !email?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Cần cung cấp ít nhất một trường để cập nhật',
    });
  }

  const data: { name?: string; email?: string } = {};
  if (name?.trim()) data.name = name.trim();
  if (email?.trim()) data.email = email.trim().toLowerCase();
  
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
userRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (Number.isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID không hợp lệ',
    });
  }

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