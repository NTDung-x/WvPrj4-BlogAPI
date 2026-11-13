import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import pool from './db.js';

const app = express();
const PORT = 3000;

// Middleware hệ thống & ghi log
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[LOG] ${req.method} ${req.url}`);
  next();
});

// Route health
app.get('/api/health', async (req: Request, res: Response) => {
  const [rows] = await pool.query('SELECT 1 + 1 AS result');
  res.json({ status: 'OK', database: 'Connected', testQuery: rows });
});

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
    const connection = await pool.getConnection();
    console.log ('Connected to blog_db on MySQL')
    connection.release();

    app.listen(PORT, () => {
      console.log(`Server is running on: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error ('Connection error: ', error);
    process.exit(1);
  };
}

startServer();