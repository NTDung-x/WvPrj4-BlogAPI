import express, { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = 3000;

// Middleware hệ thống & ghi log
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[LOG] ${req.method} ${req.url}`);
  next();
});

// Route bình thường
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK' });
});

// Route bất đồng bộ, async, phát sinh lỗi
app.get('/api/test-error', async (req: Request, res: Response) => {
  // Giả lập một thao tác database bị lỗi
  throw new Error('Không thể kết nối tới cơ sở dữ liệu');
});

// Middleware bắt lỗi 404, chạy khi không có route nào phía trên khớp với URL
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

app.listen(PORT, () => {
  console.log(`Server is running on: http://localhost:${PORT}`);
});
