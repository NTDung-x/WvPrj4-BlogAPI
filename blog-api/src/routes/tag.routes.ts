import { Router, Request, Response } from 'express';
import prisma from '../prisma.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const tagRouter = Router();

// Lấy danh sách tag
tagRouter.get('/', async (req: Request, res: Response) => {
  const tags = await prisma.tag.findMany({
    include: {
      _count: { 
        select: { 
          posts: true 
        } 
      },
    },
    orderBy: { 
      name: 'asc' 
    },
  });

  res.status(200).json({
    success: true,
    count: tags.length,
    data: tags,
  });
});

// Tạo tag mới
tagRouter.post('/', authenticate, async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Tên tag không được bỏ trống',
    });
  }

  try {
    const tag = await prisma.tag.create({
      data: { name: name.trim().toLowerCase() },
    });

    res.status(201).json({
      success: true,
      data: tag,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Tag này đã tồn tại',
      });
    }
    throw error;
  }
});

export default tagRouter;