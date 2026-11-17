import { Router, Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db.js'

const userRouter = Router()

interface UserRow extends RowDataPacket {
    id: number;
    name: string;
    email: string;
    created_at: Date;
}

// Get list các users 
userRouter.get('/', async (req: Request, res: Response) => {
    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users ORDER BY id DESC');
    res.status(200).json({
        success: true,
        count: rows.length,
        data: rows
    });
});

// Get 1 user
userRouter.get('/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID không hợp lệ'
        });
    }

    const [rows] = await pool.execute<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy người dùng'
        });
    }

    res.status(200).json({
        success: true,
        data: rows[0]
    });
});

// Create Tạo người dùng mới
userRouter.post('/', async (req: Request, res: Response) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({
            success: false,
            message: 'Tên và email không được bỏ trống'
        });
    }

    try{
        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO users (name, email) VALUES (?, ?)',
            [name.trim(), email.trim()]
        );

        res.status(201).json({
            success: true,
            data: {
                id: result.insertId,
                name: name.trim(),
                email: email.trim()
            },
        });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }
        throw error;
    }
});

// Update thông tin người dùng
userRouter.put('/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { name, email } = req.body;

    if (Number.isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID không hợp lệ'
        });
    }
    if (!name || !email) {
        return res.status(400).json({
            success: false,
            message: 'Tên và email không được bỏ trống'
        });
    }

    try {
        const [result] = await pool.execute<ResultSetHeader>(
            'UPDATE users SET name = ?, email = ? WHERE id = ?',
            [name.trim(), email.trim(), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id, 
                name: name.trim(),
                email: email.trim()
            },
        });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json ({
                success: false,
                message: 'Email đã được sử dụng'
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
            message: 'ID người dùng không hợp lệ' 
        });
    }
    if (!name && !email) {
        return res.status(400).json({
            success: false,
            // TODO
            message: 'Cần cung cấp ít nhất một trường để cập nhật',
        });
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (name) {
        fields.push('name = ?');
        values.push(name.trim());
    }
    if (email) {
        fields.push('email = ?');
        values.push(email.trim());
    }
    values.push(id);

    try {
        const [result] = await pool.execute<ResultSetHeader>(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Không tìm thấy người dùng' 
            });
        }

        const [updatedRows] = await pool.execute<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]);
        res.status(200).json({ 
            success: true, 
            data: updatedRows[0] 
        });
        
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                success: false, 
                message: 'Email đã được sử dụng' 
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
            message: 'ID không hợp lệ' 
        });
    }

    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
        return res.status(404).json({ 
            success: false, 
            message: 'Không tìm thấy người dùng' 
        });
    }

    res.status(204).send();
});

export default userRouter;