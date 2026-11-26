import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import prisma from './prisma.js';
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import postRouter from './routes/post.routes.js';
import commentRouter from './routes/comment.routes.js';
import categoryRouter from './routes/category.routes.js';
import tagRouter from './routes/tag.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware hệ thống & ghi log
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[LOG] ${req.method} ${req.url}`);
  next();
});

// Route health
app.get('/api/health', async (req: Request, res: Response) => {
  const rows = await prisma.$queryRaw<Array<{ result: bigint | number }>>`SELECT 1 + 1 AS result`;
  res.json({
    status: 'OK',
    database: 'Connected',
    testQuery: rows.map((row) => ({ result: Number(row.result) })),
  });
});

// Đăng ký các nhóm API
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/posts', postRouter);
app.use('/api/comments', commentRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/tags', tagRouter);

// Middleware lỗi 404, chạy khi không có route nào phía trên khớp với URL
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy đường dẫn: ${req.method} ${req.originalUrl}`
  });
});

// Middleware xử lý lỗi tập trung
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR]:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ'
  });
});

// Kiểm tra kết nối
async function startServer() {
  try{
    await prisma.$connect();
    console.log('Connected to blog_db on MySQL via Prisma');

    app.listen(PORT, () => {
      console.log(`Server đang chạy trên đường dẫn: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error ('Lỗi kết nối: ', error);
    process.exit(1);
  };
}

startServer();