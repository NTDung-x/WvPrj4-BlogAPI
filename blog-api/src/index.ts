import express, { Request, Response} from 'express'

const app = express()
const PORT = process.env.PORT || 3000;

app.use(express.json())

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})