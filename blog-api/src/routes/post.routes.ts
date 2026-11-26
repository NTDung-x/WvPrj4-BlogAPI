import { Router, Request, Response } from 'express';
import prisma from '../prisma.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const postRouter = Router();

// Hàm tạo slug từ title tiếng Việt
function createSlug (title: string): string {
    const base = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

    return `${base}-${Date.now().toString(36)}`;
}

// Phân trang, tìm kiếm, lọc
postRouter.get('/', async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const search = (req.query.search as string)?.trim();
    const categoryId = (req.query.categoryId as string)?.trim();
    const tag = (req.query.tag as string)?.trim().toLowerCase();

    const where: any = {};

    if (search) {
        where.OR = [
            { title: { contains: search } },
            { content: { contains: search } }
        ];
    }

    if (categoryId) {
        where.categoryId = categoryId;
    }

    if (tag) {
        where.tags = {
            some: { name: tag },
        };
    }

    const [total, posts] = await Promise.all([
        prisma.post.count({ where }),
        prisma.post.findMany({
            where, 
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { 
                createdAt: 'desc' 
            },
            include: {
                author: { 
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                category: true,
                tags: true,
                _count: {
                    select: {
                        comments: true
                    }
                }
            }
        })
    ]);

    res.status(200).json({
        success: true,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: posts,
    });
});

// Lấy chi tiết 1 post
postRouter.get('/:id', async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const post = await prisma.post.findUnique({
        where: { id },
        include: {
            author: { 
                select: {
                    id: true,
                    name: true,
                    email: true, 
                }
            },
            category: true,
            tags: true,
            comments: {
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc',
                }
            }
        }
    });

    if (!post) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy bài viết',
        });
    }

    res.status(200).json({
        success: true,
        data: post,
    });
});

// Tạo post
postRouter.post('/', authenticate, async (req: Request, res: Response) => {
    const { title, content, published, categoryId, tags } = req.body;

    if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Tiêu đề và nội dung không được để trống'
        });
    }

    const normalizedTags: string[] = Array.isArray(tags)
        ? [...new Set(tags.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean))]
        : [];

    try {
        const newPost = await prisma.post.create({
            data: {
                title: title.trim(),
                slug: createSlug(title),
                content: content.trim(),
                published: Boolean(published),
                authorId: req.userId!,
                categoryId: categoryId?.trim() || null,
                tags: normalizedTags.length
                    ? {
                        connectOrCreate: normalizedTags.map((name) => ({
                            where: { name },
                            create: { name },
                        })),
                    }
                    : undefined,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                category: true,
                tags: true
            }
        });

        res.status(201).json({
            success: true,
            data: newPost
        });
    } catch (error: any) {
        if (error.code === 'P2003') {
            return res.status(400).json({
                success: false,
                message: 'Danh mục không tồn tại hoặc sai ID danh mục',
            });
        }
        throw error;
    }
});

// Update post
postRouter.put('/:id', authenticate, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { title, content, published, categoryId, tags } = req.body;

  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Tiêu đề và nội dung bài viết không được bỏ trống',
    });
  }

  const existingPost = await prisma.post.findUnique({ where: { id } });
  if (!existingPost) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bài viết',
    });
  }

  if (existingPost.authorId !== req.userId) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền chỉnh sửa bài viết này',
    });
  }

  const normalizedTags: string[] | undefined = Array.isArray(tags)
    ? [...new Set(tags.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean))]
    : undefined;

  try {
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title: title.trim(),
        content: content.trim(),
        published: published !== undefined ? Boolean(published) : existingPost.published,
        categoryId: categoryId !== undefined ? categoryId?.trim() || null : existingPost.categoryId,
        tags: normalizedTags
          ? {
              set: [],
              connectOrCreate: normalizedTags.map((name) => ({
                where: { name },
                create: { name },
              })),
            }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true } },
        category: true,
        tags: true,
      },
    });

    res.status(200).json({
      success: true,
      data: updatedPost,
    });
  } catch (error: any) {
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Danh mục không tồn tại hoặc sai ID danh mục',
      });
    }
    throw error;
  }
});

// Xóa post
postRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const existingPost = await prisma.post.findUnique({ where: { id } });
  if (!existingPost) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bài viết',
    });
  }

  if (existingPost.authorId !== req.userId) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền xóa bài viết này',
    });
  }

  await prisma.post.delete({ where: { id } });
  res.status(204).send();
});

// Lấy comment trong post
postRouter.get('/:postId/comments', async (req: Request, res: Response) => {
  const postId = req.params.postId as string;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bài viết',
    });
  }

  const comments = await prisma.comment.findMany({
    where: { postId },
    include: {
      author: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: comments.length,
    data: comments,
  });
});

// Viết comment vào 1 post
postRouter.post('/:postId/comments', authenticate, async (req: Request, res: Response) => {
  const postId = req.params.postId as string;
  const { content } = req.body;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bài viết',
    });
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      postId,
      authorId: req.userId!,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({
    success: true,
    data: comment,
  });
});

export default postRouter;