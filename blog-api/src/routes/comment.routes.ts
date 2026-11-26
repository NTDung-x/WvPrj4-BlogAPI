import { Router, Request, Response } from 'express';
import prisma from '../prisma.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const commentRouter = Router();

// Chỉnh sửa bình luận (chỉ người viết bình luận)
commentRouter.put('/:id', authenticate, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { content } = req.body;

  const existingComment = await prisma.comment.findUnique({ where: { id } });

  if (!existingComment) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bình luận',
    });
  }

  if (existingComment.authorId !== req.userId) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không thể chỉnh sửa bình luận này',
    });
  }

  const updatedComment = await prisma.comment.update({
    where: { 
      id 
    },
    data: { 
      content: content.trim() 
    },
    include: {
      author: { 
        select: { 
          id: true, 
          name: true 
        } 
      },
    },
  });

  res.status(200).json({
    success: true,
    data: updatedComment,
  });
});

// Xóa bình luận (chỉ người viết bình luận)
commentRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const existingComment = await prisma.comment.findUnique({ where: { id } });
  
  if (!existingComment) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bình luận',
    });
  }

  if (existingComment.authorId !== req.userId) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không thể xóa bình luận này',
    });
  }

  await prisma.comment.delete({ where: { id } });
  res.status(204).send();
});

export default commentRouter;