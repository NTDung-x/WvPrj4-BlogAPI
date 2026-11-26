import { Router, Request, Response } from 'express';
import prisma from '../prisma.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const categoryRouter = Router();

// Lấy danh sách danh mục
categoryRouter.get('/', async (req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
        include: {
            _count: {
                select: {
                    posts: true
                }
            }
        },
        orderBy: { 
            name: 'asc'
        }
    });

    res.status(200).json({
        success: true,
        count: categories.length,
        data: categories
    });
});

// Taọ danh mục mới
categoryRouter.post('/', authenticate, async (req: Request, res: Response) => {
    const { name } = req.body;

    if (!name?.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Tên danh mục không được bỏ trống'
        });
    }

    try {
        const category = await prisma.category.create({
            data: {
                name: name.trim()
            }
        });

        res.status(201).json({
            success: true,
            data: category
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                message: 'Danh mục đã tồn tại'
            });
        }
        throw error;
    }
});

export default categoryRouter;