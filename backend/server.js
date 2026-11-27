const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
app.set('trust proxy', 1);
const PORT = 5000;
const JWT_SECRET = 'procoating_secret';

// CORS
app.use(cors({ origin: (origin, cb) => cb(null, !origin || /^https?:\/\/(192\.168\.80\.10|10\.147\.20\.1|localhost|127\.0\.0\.1|[a-z0-9-]+\.trycloudflare\.com)(:\d+)?$/.test(origin)), credentials: true }));
app.use(cookieParser());
app.use(express.json());
const registerActivityLogger = require('./activity-logger');
registerActivityLogger(app, () => pool);
const { registerAutoRentalHook } = require('./auto-rental');
registerAutoRentalHook(app, () => pool);


// Multer para archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// PostgreSQL
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'procoatuser',
    password: 'Gonda0216*',
    database: 'procoatingdb',
});

// ============ HEALTH ============
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API running' });
});

// ============ AUTH ============
const bcryptLib = require('bcrypt');

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(`
            SELECT u.*, r.name AS role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.username = $1 AND u.is_active = TRUE
        `, [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = result.rows[0];
        const valid = user.password.startsWith('$2')
            ? await bcryptLib.compare(password, user.password)
            : crypto.createHash('md5').update(password).digest('hex') === user.password;
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        const role = user.role_name || 'operator';
        const token = jwt.sign(
            { id: user.id, username: user.username, full_name: user.full_name, role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        res.json({
            success: true,
            user: { id: user.id, username: user.username, full_name: user.full_name, role }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({
            id: decoded.id,
            username: decoded.username,
            full_name: decoded.full_name || decoded.username,
            role: decoded.role || 'operator'
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

// ============ CUSTOMERS ============
app.get('/api/customers', async (req, res) => {
    const result = await pool.query('SELECT * FROM customers ORDER BY id');
    res.json(result.rows);
});

app.post('/api/customers', async (req, res) => {
    const { name, phone, email, address } = req.body;
    const result = await pool.query(
        'INSERT INTO customers (name, phone, email, address) VALUES ($1,$2,$3,$4) RETURNING *',
        [name, phone, email, address]
    );
    res.json(result.rows[0]);
});

app.delete('/api/customers/:id', async (req, res) => {
    await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

// ============ EQUIPMENT ============
app.get('/api/equipment', async (req, res) => {
    const result = await pool.query('SELECT * FROM equipment ORDER BY id');
    res.json(result.rows);
});

// ============ RENTALS ============
app.get('/api/rentals', async (req, res) => {
    const result = await pool.query(`
        SELECT r.*, c.name as customer_name, e.model as equipment_model
        FROM rentals r
        JOIN customers c ON r.customer_id = c.id
        JOIN equipment e ON r.equipment_id = e.id
        ORDER BY r.id DESC
    `);
    res.json(result.rows);
});

app.post('/api/rentals', async (req, res) => {
    const { rental_number, customer_id, equipment_id, start_date, end_date, notes } = req.body;
    const start = new Date(start_date);
    const end = end_date ? new Date(end_date) : null;
    const total_days = end ? Math.ceil((end - start) / (1000*60*60*24)) : 1;
    const equipRes = await pool.query('SELECT daily_rate FROM equipment WHERE id = $1', [equipment_id]);
    const daily_rate = equipRes.rows[0]?.daily_rate || 0;
    const subtotal = daily_rate * total_days;
    const result = await pool.query(
        `INSERT INTO rentals (rental_number, customer_id, equipment_id, start_date, end_date, total_days, subtotal, notes, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active') RETURNING *`,
        [rental_number, customer_id, equipment_id, start_date, end_date, total_days, subtotal, notes]
    );
    res.json(result.rows[0]);
});

app.get('/api/rentals/:id/pdf', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(`
        SELECT r.*, c.name as customer_name, e.model as equipment_model, e.tons
        FROM rentals r
        JOIN customers c ON r.customer_id = c.id
        JOIN equipment e ON r.equipment_id = e.id
        WHERE r.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).send('Not found');
    const r = result.rows[0];
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Delivery ${r.rental_number}</title><style>body{font-family:Arial;margin:40px;}.header{text-align:center;}.company{font-size:24px;font-weight:bold;color:#0a2b4e;}</style></head><body><div class="header"><div class="company">Pro-Coating Treatments Inc.</div><div>1498 Camino Los Gonzalez Apt 3, San Juan, PR 00926-8802</div><div>Tel (787) 604-4347 / (787) 309-8738</div></div><h2 style="text-align:center;">RENTAL EQUIPMENT DELIVERY</h2><p><strong>Customer:</strong> ${r.customer_name}</p><p><strong>Delivery #:</strong> ${r.rental_number}</p><p><strong>Date:</strong> ${new Date(r.start_date).toLocaleDateString()}</p><p><strong>Equipment:</strong> ${r.equipment_model}</p><p><strong>Total:</strong> $${r.subtotal}</p><div style="margin-top:50px;"><div style="float:left;width:45%;">Customer Signature: _________________</div><div style="float:right;width:45%;">ProCoating Rep: _________________</div></div></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// ============ WORK ORDERS ============
app.get('/api/workorders', async (req, res) => {
    const result = await pool.query(`
        SELECT wo.*, c.name as customer_name, e.model as equipment_model
        FROM work_orders wo
        LEFT JOIN customers c ON wo.customer_id = c.id
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        ORDER BY wo.id DESC
    `);
    res.json(result.rows);
});

app.get('/api/workorders/:id', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(`
        SELECT wo.*, c.name as customer_name, e.model as equipment_model
        FROM work_orders wo
        LEFT JOIN customers c ON wo.customer_id = c.id
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        WHERE wo.id = $1
    `, [id]);
    res.json(result.rows[0] || null);
});

app.post('/api/workorders', async (req, res) => {
    const { wo_number, customer_id, equipment_id, priority, reported_issue, is_warranty } = req.body;
    const result = await pool.query(
        `INSERT INTO work_orders (wo_number, customer_id, equipment_id, priority, reported_issue, is_warranty, status)
         VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
        [wo_number, customer_id, equipment_id, priority || 'normal', reported_issue, is_warranty || false]
    );
    res.json(result.rows[0]);
});

app.put('/api/workorders/:id', async (req, res) => {
    const { id } = req.params;
    const { status, end_date, diagnosis, solution, internal_cost } = req.body;
    const result = await pool.query(
        `UPDATE work_orders SET status=$1, end_date=$2, diagnosis=$3, solution=$4, internal_cost=$5 WHERE id=$6 RETURNING *`,
        [status, end_date, diagnosis, solution, internal_cost, id]
    );
    res.json(result.rows[0]);
});

app.post('/api/workorders/:id/photos', upload.single('photo'), async (req, res) => {
    const { id } = req.params;
    const image_url = `/uploads/${req.file.filename}`;
    const result = await pool.query(
        'INSERT INTO work_order_photos (work_order_id, image_url) VALUES ($1, $2) RETURNING *',
        [id, image_url]
    );
    res.json(result.rows[0]);
});

app.post('/api/workorders/:id/costs', async (req, res) => {
    const { id } = req.params;
    const { description, amount } = req.body;
    const result = await pool.query(
        'INSERT INTO work_order_costs (work_order_id, description, amount) VALUES ($1, $2, $3) RETURNING *',
        [id, description, amount]
    );
    await pool.query('UPDATE work_orders SET internal_cost = internal_cost + $1 WHERE id = $2', [amount, id]);
    res.json(result.rows[0]);
});

app.delete('/api/workorders/photos/:id', async (req, res) => {
    await pool.query('DELETE FROM work_order_photos WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

// ============ INVENTORY ============
app.get('/api/spare-parts', async (req, res) => {
    const result = await pool.query('SELECT * FROM spare_parts ORDER BY name');
    res.json(result.rows);
});

app.post('/api/spare-parts', async (req, res) => {
    const { part_number, name, description, category, location, stock_quantity, min_stock, max_stock, unit_price } = req.body;
    const result = await pool.query(
        `INSERT INTO spare_parts (part_number, name, description, category, location, stock_quantity, min_stock, max_stock, unit_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [part_number, name, description, category, location, stock_quantity || 0, min_stock || 5, max_stock || 100, unit_price || 0]
    );
    res.json(result.rows[0]);
});

app.delete('/api/spare-parts/:id', async (req, res) => {
    await pool.query('DELETE FROM spare_parts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

// ============ SUPPLIERS ============
app.get('/api/suppliers', async (req, res) => {
    const result = await pool.query('SELECT * FROM suppliers WHERE is_active = true ORDER BY name');
    res.json(result.rows);
});

// ============ PURCHASE ORDERS ============
app.get('/api/purchase-orders', async (req, res) => {
    const result = await pool.query(`
        SELECT po.*, s.name as supplier_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        ORDER BY po.id DESC
    `);
    res.json(result.rows);
});

app.post('/api/purchase-orders', async (req, res) => {
    const { po_number, supplier_id, order_date, expected_date, notes, items } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let subtotal = 0;
        for (const item of items) subtotal += item.quantity_ordered * item.unit_price;
        const total = subtotal;
        const poResult = await client.query(
            `INSERT INTO purchase_orders (po_number, supplier_id, order_date, expected_date, subtotal, total, notes, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
            [po_number, supplier_id, order_date, expected_date, subtotal, total, notes]
        );
        const poId = poResult.rows[0].id;
        for (const item of items) {
            await client.query(
                `INSERT INTO purchase_order_items (purchase_order_id, spare_part_id, quantity_ordered, unit_price, total)
                 VALUES ($1,$2,$3,$4,$5)`,
                [poId, item.spare_part_id, item.quantity_ordered, item.unit_price, item.quantity_ordered * item.unit_price]
            );
        }
        await client.query('COMMIT');
        res.json(poResult.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.post('/api/purchase-orders/:id/receive', async (req, res) => {
    const { id } = req.params;
    const { received_date, items } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const item of items) {
            if (item.quantity_received > 0) {
                await client.query(`UPDATE purchase_order_items SET quantity_received = quantity_received + $1 WHERE id = $2`, [item.quantity_received, item.id]);
                await client.query(`UPDATE spare_parts SET stock_quantity = stock_quantity + $1, last_restocked = $2 WHERE id = $3`, [item.quantity_received, received_date, item.spare_part_id]);
            }
        }
        await client.query(`UPDATE purchase_orders SET status = 'received', received_date = $1 WHERE id = $2`, [received_date, id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.put('/api/purchase-orders/:id/cancel', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(`UPDATE purchase_orders SET status = 'cancelled' WHERE id = $1 RETURNING *`, [id]);
    res.json(result.rows[0]);
});

// ============ REPORTS (EXCEL) ============
const ExcelJS = require('exceljs');

app.get('/api/reports/rentals/excel', async (req, res) => {
    const { start_date, end_date } = req.query;
    let query = `SELECT r.rental_number, c.name as customer_name, e.model as equipment_model, r.start_date, r.end_date, r.total_days, r.subtotal, r.status FROM rentals r JOIN customers c ON r.customer_id = c.id JOIN equipment e ON r.equipment_id = e.id WHERE 1=1`;
    const params = [];
    if (start_date) { params.push(start_date); query += ` AND r.start_date >= $${params.length}`; }
    if (end_date) { params.push(end_date); query += ` AND r.start_date <= $${params.length}`; }
    query += ` ORDER BY r.created_at DESC`;
    const result = await pool.query(query, params);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rentals Report');
    worksheet.columns = [
        { header: 'Rental #', key: 'rental_number', width: 15 },
        { header: 'Customer', key: 'customer_name', width: 25 },
        { header: 'Equipment', key: 'equipment_model', width: 25 },
        { header: 'Start Date', key: 'start_date', width: 15 },
        { header: 'End Date', key: 'end_date', width: 15 },
        { header: 'Days', key: 'total_days', width: 10 },
        { header: 'Subtotal', key: 'subtotal', width: 15 },
        { header: 'Status', key: 'status', width: 12 }
    ];
    result.rows.forEach(row => worksheet.addRow(row));
    const total = result.rows.reduce((sum, r) => sum + (parseFloat(r.subtotal) || 0), 0);
    worksheet.addRow({});
    worksheet.addRow({ rental_number: 'TOTAL', subtotal: total });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=rentals_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});

app.get('/api/reports/workorders/excel', async (req, res) => {
    const { start_date, end_date, status } = req.query;
    let query = `SELECT wo.wo_number, c.name as customer_name, e.model as equipment_model, wo.priority, wo.status, wo.start_date, wo.end_date, wo.internal_cost FROM work_orders wo LEFT JOIN customers c ON wo.customer_id = c.id LEFT JOIN equipment e ON wo.equipment_id = e.id WHERE 1=1`;
    const params = [];
    if (start_date) { params.push(start_date); query += ` AND wo.start_date >= $${params.length}`; }
    if (end_date) { params.push(end_date); query += ` AND wo.start_date <= $${params.length}`; }
    if (status) { params.push(status); query += ` AND wo.status = $${params.length}`; }
    query += ` ORDER BY wo.created_at DESC`;
    const result = await pool.query(query, params);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Work Orders Report');
    worksheet.columns = [
        { header: 'WO #', key: 'wo_number', width: 15 },
        { header: 'Customer', key: 'customer_name', width: 25 },
        { header: 'Equipment', key: 'equipment_model', width: 25 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Start Date', key: 'start_date', width: 15 },
        { header: 'End Date', key: 'end_date', width: 15 },
        { header: 'Internal Cost', key: 'internal_cost', width: 15 }
    ];
    result.rows.forEach(row => worksheet.addRow(row));
    const totalCost = result.rows.reduce((sum, r) => sum + (parseFloat(r.internal_cost) || 0), 0);
    worksheet.addRow({});
    worksheet.addRow({ wo_number: 'TOTAL INTERNAL COST', internal_cost: totalCost });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=workorders_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});

app.get('/api/reports/inventory/excel', async (req, res) => {
    const result = await pool.query(`SELECT part_number, name, category, location, stock_quantity, min_stock, max_stock, unit_price, CASE WHEN stock_quantity <= min_stock THEN 'Low Stock' ELSE 'OK' END as stock_status FROM spare_parts ORDER BY name`);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory Report');
    worksheet.columns = [
        { header: 'Part #', key: 'part_number', width: 15 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Stock', key: 'stock_quantity', width: 10 },
        { header: 'Min Stock', key: 'min_stock', width: 10 },
        { header: 'Max Stock', key: 'max_stock', width: 10 },
        { header: 'Unit Price', key: 'unit_price', width: 12 },
        { header: 'Status', key: 'stock_status', width: 12 }
    ];
    result.rows.forEach(row => worksheet.addRow(row));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});

app.get('/api/reports/financial/excel', async (req, res) => {
    const { year, month } = req.query;
    let query = `SELECT DATE_TRUNC('month', r.start_date) as month, COUNT(r.id) as rental_count, COALESCE(SUM(r.subtotal), 0) as total_revenue, COALESCE(SUM(wo.internal_cost), 0) as total_internal_cost FROM rentals r LEFT JOIN work_orders wo ON wo.customer_id = r.customer_id WHERE r.status = 'active' OR r.status = 'completed'`;
    const params = [];
    if (year) { params.push(year); query += ` AND EXTRACT(YEAR FROM r.start_date) = $${params.length}`; }
    if (month) { params.push(month); query += ` AND EXTRACT(MONTH FROM r.start_date) = $${params.length}`; }
    query += ` GROUP BY DATE_TRUNC('month', r.start_date) ORDER BY month DESC`;
    const result = await pool.query(query, params);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Financial Report');
    worksheet.columns = [
        { header: 'Month', key: 'month', width: 15 },
        { header: 'Rental Count', key: 'rental_count', width: 15 },
        { header: 'Total Revenue', key: 'total_revenue', width: 18 },
        { header: 'Total Internal Cost', key: 'total_internal_cost', width: 18 },
        { header: 'Net Profit', key: 'net_profit', width: 18 }
    ];
    result.rows.forEach(row => {
        worksheet.addRow({
            month: row.month ? new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '-',
            rental_count: row.rental_count,
            total_revenue: parseFloat(row.total_revenue) || 0,
            total_internal_cost: parseFloat(row.total_internal_cost) || 0,
            net_profit: (parseFloat(row.total_revenue) || 0) - (parseFloat(row.total_internal_cost) || 0)
        });
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=financial_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});

// ============ CHARTS ============
app.get('/api/charts/rentals-by-month', async (req, res) => {
    const currentYear = new Date().getFullYear();
    const result = await pool.query(`
        SELECT EXTRACT(MONTH FROM start_date) as month, COUNT(*) as rental_count, COALESCE(SUM(subtotal), 0) as total_revenue
        FROM rentals WHERE EXTRACT(YEAR FROM start_date) = $1 AND status != 'cancelled'
        GROUP BY EXTRACT(MONTH FROM start_date) ORDER BY month ASC
    `, [currentYear]);
    const monthlyData = Array(12).fill(0);
    const revenueData = Array(12).fill(0);
    result.rows.forEach(row => {
        const monthIndex = parseInt(row.month) - 1;
        monthlyData[monthIndex] = parseInt(row.rental_count);
        revenueData[monthIndex] = parseFloat(row.total_revenue);
    });
    res.json({ year: currentYear, months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], rentals: monthlyData, revenue: revenueData });
});

app.get('/api/charts/workorders-status', async (req, res) => {
    const result = await pool.query(`SELECT status, COUNT(*) as count FROM work_orders GROUP BY status`);
    const statusMap = { 'pending': 0, 'in_progress': 0, 'completed': 0 };
    result.rows.forEach(row => { if (statusMap.hasOwnProperty(row.status)) statusMap[row.status] = parseInt(row.count); });
    res.json({ labels: ['Pending', 'In Progress', 'Completed'], data: [statusMap.pending, statusMap.in_progress, statusMap.completed] });
});

app.get('/api/charts/low-stock', async (req, res) => {
    const result = await pool.query(`SELECT COUNT(*) as count FROM spare_parts WHERE stock_quantity <= min_stock`);
    const totalResult = await pool.query(`SELECT COUNT(*) as total FROM spare_parts`);
    res.json({ low_stock: parseInt(result.rows[0].count), total_parts: parseInt(totalResult.rows[0].total) });
});

// ============ NOTIFICATIONS ============
app.get('/api/notifications', async (req, res) => {
    const result = await pool.query(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50`);
    res.json(result.rows);
});

app.get('/api/notifications/unread-count', async (req, res) => {
    const result = await pool.query(`SELECT COUNT(*) as count FROM notifications WHERE is_read = false`);
    res.json({ count: parseInt(result.rows[0].count) });
});

app.put('/api/notifications/:id/read', async (req, res) => {
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

app.put('/api/notifications/read-all', async (req, res) => {
    await pool.query('UPDATE notifications SET is_read = true');
    res.json({ success: true });
});

app.post('/api/notifications/check-low-stock', async (req, res) => {
    const lowStock = await pool.query(`SELECT * FROM spare_parts WHERE stock_quantity <= min_stock`);
    for (const part of lowStock.rows) {
        await pool.query(`INSERT INTO notifications (type, title, message, link) VALUES ('low_stock', '⚠️ Low Stock Alert', $1, '/inventory')`, [`Part ${part.part_number} - ${part.name} has only ${part.stock_quantity} units left`]);
    }
    res.json({ message: `Checked ${lowStock.rows.length} low stock items` });
});

// ============ BACKUP ============
app.post('/api/backup/run', (req, res) => {
    exec('/root/backup_procoating.sh', (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, output: stdout });
    });
});

app.get('/api/backup/list', (req, res) => {
    const backups = [];
    const backupDir = '/root/backups';
    if (!fs.existsSync(backupDir)) return res.json([]);
    const files = fs.readdirSync(backupDir);
    files.forEach(file => {
        if (file.endsWith('.tar.gz')) {
            const stats = fs.statSync(`${backupDir}/${file}`);
            const date = new Date(stats.mtime);
            backups.push({
                name: file,
                size: stats.size,
                size_mb: (stats.size / 1024 / 1024).toFixed(2),
                date: stats.mtime,
                date_str: `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`
            });
        }
    });
    backups.sort((a, b) => b.date - a.date);
    res.json(backups);
});

app.get('/api/backup/download/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = `/root/backups/${filename}`;
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found' });
    res.download(filePath, filename);
});

app.delete('/api/backup/delete/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = `/root/backups/${filename}`;
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found' });
    fs.unlinkSync(filePath);
    res.json({ success: true });
});

// ============ AUDIT LOGS ============
app.get('/api/audit-logs', async (req, res) => {
    const { limit = 100, offset = 0, action, entity_type, start_date, end_date } = req.query;
    try {
        let query = `SELECT al.*, u.username as user_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
        const params = [];
        if (action) { params.push(action); query += ` AND al.action = $${params.length}`; }
        if (entity_type) { params.push(entity_type); query += ` AND al.entity_type = $${params.length}`; }
        if (start_date) { params.push(start_date); query += ` AND al.created_at >= $${params.length}`; }
        if (end_date) { params.push(end_date); query += ` AND al.created_at <= $${params.length}`; }
        query += ` ORDER BY al.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/audit-logs/count', async (req, res) => {
    const { action, entity_type, start_date, end_date } = req.query;
    try {
        let query = `SELECT COUNT(*) FROM audit_logs WHERE 1=1`;
        const params = [];
        if (action) { params.push(action); query += ` AND action = $${params.length}`; }
        if (entity_type) { params.push(entity_type); query += ` AND entity_type = $${params.length}`; }
        if (start_date) { params.push(start_date); query += ` AND created_at >= $${params.length}`; }
        if (end_date) { params.push(end_date); query += ` AND created_at <= $${params.length}`; }
        const result = await pool.query(query, params);
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/audit-logs/actions', async (req, res) => {
    const result = await pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action');
    res.json(result.rows.map(r => r.action));
});

app.get('/api/audit-logs/entities', async (req, res) => {
    const result = await pool.query('SELECT DISTINCT entity_type FROM audit_logs WHERE entity_type IS NOT NULL ORDER BY entity_type');
    res.json(result.rows.map(r => r.entity_type));
});

// ============ STATIC FILES ============
app.use('/uploads', express.static('uploads'));
app.use(express.static('/var/www/procoating'));


// === MULTI-CONTACT MANAGEMENT PER CUSTOMER ===
app.get('/api/customers/:id/contacts', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM customer_contacts WHERE customer_id = $1 ORDER BY is_primary DESC, id ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers/:id/contacts', async (req, res) => {
  const customerId = req.params.id;
  const { full_name, phone, email, position, is_primary } = req.body;
  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'El nombre del contacto es obligatorio' });
  }
  try {
    const countRes = await pool.query('SELECT COUNT(*)::int AS total FROM customer_contacts WHERE customer_id = $1', [customerId]);
    const makePrimary = Boolean(is_primary) || countRes.rows[0].total === 0;
    if (makePrimary) {
      await pool.query('UPDATE customer_contacts SET is_primary = FALSE WHERE customer_id = $1', [customerId]);
    }
    const { rows } = await pool.query(
      `INSERT INTO customer_contacts (customer_id, full_name, phone, email, position, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [customerId, full_name.trim(), phone || null, email || null, position || null, makePrimary]
    );
    if (makePrimary) {
      await pool.query(
        'UPDATE customers SET contact_person = $1, phone = COALESCE($2, phone), email = COALESCE($3, email) WHERE id = $4',
        [full_name.trim(), phone || null, email || null, customerId]
      );
    }
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customer-contacts/:contactId', async (req, res) => {
  const { full_name, phone, email, position, is_primary } = req.body;
  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'El nombre del contacto es obligatorio' });
  }
  try {
    const existing = await pool.query('SELECT customer_id FROM customer_contacts WHERE id = $1', [req.params.contactId]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Contacto no encontrado' });
    const customerId = existing.rows[0].customer_id;
    if (is_primary) {
      await pool.query('UPDATE customer_contacts SET is_primary = FALSE WHERE customer_id = $1', [customerId]);
    }
    const { rows } = await pool.query(
      `UPDATE customer_contacts
       SET full_name = $1, phone = $2, email = $3, position = $4, is_primary = COALESCE($5, is_primary)
       WHERE id = $6 RETURNING *`,
      [full_name.trim(), phone || null, email || null, position || null, is_primary, req.params.contactId]
    );
    if (rows[0].is_primary) {
      await pool.query(
        'UPDATE customers SET contact_person = $1, phone = COALESCE($2, phone), email = COALESCE($3, email) WHERE id = $4',
        [full_name.trim(), phone || null, email || null, customerId]
      );
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customer-contacts/:contactId', async (req, res) => {
  try {
    await pool.query('DELETE FROM customer_contacts WHERE id = $1', [req.params.contactId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const registerOperationsRoutes = require('./operations-routes');
registerOperationsRoutes(app, pool, null);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// ============ SWAGGER API DOCS ============
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ProCoating API',
            version: '1.0.0',
            description: 'API documentation for ProCoating Equipment Rental System'
        },
        servers: [
            { url: 'http://192.168.80.10:5000', description: 'Local Server' },
            { url: 'http://10.147.20.1:5000', description: 'ZeroTier Server' }
        ]
    },
    apis: ['/root/procoating-app/backend/server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

console.log('✅ Swagger API Docs available at /api-docs');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Returns API status
 *     responses:
 *       200:
 *         description: API is running
 */

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers
 *     description: Returns list of customers
 *     responses:
 *       200:
 *         description: List of customers
 *   post:
 *     summary: Create customer
 *     description: Adds a new customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Customer created
 */

/**
 * @swagger
 * /api/equipment:
 *   get:
 *     summary: Get all equipment
 *     description: Returns list of equipment
 *     responses:
 *       200:
 *         description: List of equipment
 */

/**
 * @swagger
 * /api/rentals:
 *   get:
 *     summary: Get all rentals
 *     description: Returns list of rentals
 *     responses:
 *       200:
 *         description: List of rentals
 *   post:
 *     summary: Create rental
 *     description: Creates a new equipment rental
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rental_number:
 *                 type: string
 *               customer_id:
 *                 type: integer
 *               equipment_id:
 *                 type: integer
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rental created
 */

/**
 * @swagger
 * /api/workorders:
 *   get:
 *     summary: Get all work orders
 *     description: Returns list of work orders
 *     responses:
 *       200:
 *         description: List of work orders
 *   post:
 *     summary: Create work order
 *     description: Creates a new work order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               wo_number:
 *                 type: string
 *               customer_id:
 *                 type: integer
 *               equipment_id:
 *                 type: integer
 *               priority:
 *                 type: string
 *                 enum: [normal, emergency, scheduled]
 *               reported_issue:
 *                 type: string
 *               is_warranty:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Work order created
 */

/**
 * @swagger
 * /api/spare-parts:
 *   get:
 *     summary: Get all spare parts
 *     description: Returns inventory of spare parts
 *     responses:
 *       200:
 *         description: List of spare parts
 */

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     summary: Get all suppliers
 *     description: Returns list of suppliers
 *     responses:
 *       200:
 *         description: List of suppliers
 */

/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     summary: Get all purchase orders
 *     description: Returns list of purchase orders
 *     responses:
 *       200:
 *         description: List of purchase orders
 */

/**
 * @swagger
 * /api/backup/list:
 *   get:
 *     summary: List backups
 *     description: Returns list of available backups
 *     responses:
 *       200:
 *         description: List of backups
 */

/**
 * @swagger
 * /api/backup/run:
 *   post:
 *     summary: Run manual backup
 *     description: Creates a new backup
 *     responses:
 *       200:
 *         description: Backup completed
 */

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     description: Returns system audit logs
 *     responses:
 *       200:
 *         description: List of audit logs
 */



// ============ INVENTORY MOVEMENTS ============
app.post('/api/inventory-movements', async (req, res) => {
    const { part_id, type, quantity, reason } = req.body;
    const qty = parseInt(quantity, 10);
    if (!part_id || !qty || qty <= 0 || !['in', 'out', 'adjustment'].includes(type)) {
        return res.status(400).json({ error: 'Invalid movement data' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const partRes = await client.query('SELECT stock_quantity FROM spare_parts WHERE id = $1 FOR UPDATE', [part_id]);
        if (partRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Spare part not found' });
        }
        const current = partRes.rows[0].stock_quantity || 0;
        if (type === 'out' && current < qty) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Insufficient stock (current: ${current})` });
        }
        const delta = type === 'out' ? -qty : qty;
        const updated = await client.query(
            `UPDATE spare_parts
             SET stock_quantity = stock_quantity + $1,
                 last_restocked = CASE WHEN $2 = 'in' THEN CURRENT_DATE ELSE last_restocked END
             WHERE id = $3 RETURNING *`,
            [delta, type, part_id]
        );
        await client.query(
            `INSERT INTO inventory_movements (part_id, type, quantity, reason)
             VALUES ($1, $2, $3, $4)`,
            [part_id, type, qty, reason || 'Manual stock adjustment']
        );
        await client.query('COMMIT');
        res.json({ success: true, part: updated.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ============ PURCHASE ORDER DETAIL ============
app.get('/api/purchase-orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const poResult = await pool.query(`
            SELECT po.*, s.name as supplier_name, s.contact_name, s.phone, s.email
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.id = $1
        `, [id]);
        if (poResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        const itemsResult = await pool.query(`
            SELECT poi.*, sp.part_number, sp.name as part_name, sp.unit_price as current_price
            FROM purchase_order_items poi
            JOIN spare_parts sp ON poi.spare_part_id = sp.id
            WHERE poi.purchase_order_id = $1
        `, [id]);
        res.json({ purchase_order: poResult.rows[0], items: itemsResult.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

