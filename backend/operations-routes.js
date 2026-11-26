const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const PDFDocument = require('pdfkit');

const UPLOAD_DIR = '/var/www/procoating/uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg').toLowerCase() || '.jpg';
    cb(null, `pct_io_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`);
  }
});
const uploadPhoto = multer({ storage, limits: { fileSize: 12 * 1024 * 1024 } });

const DEFAULT_CHECKLIST = [
  'Compressor, Oil Level & Refrigerant Pressure Check',
  'Electrical Voltage, Phase Rotation & Amperage Verification',
  'Condenser & Evaporator Coils Inspection (ADSIL / Cleanliness)',
  'Control Panel, Safety Switches & Alarms Operational Test',
  'Power Cables, Water Hoses, Fittings & Accessories Complete',
  'External Housing, Forklift Pockets & Transport Tie-Downs Ready'
];

async function logEquipmentStatus(client, equipmentId, newStatus, refType, refId, user, notes) {
  if (!equipmentId || !newStatus) return;
  const cur = await client.query('SELECT status FROM equipment WHERE id = $1', [equipmentId]);
  if (!cur.rows.length) return;
  const prev = cur.rows[0].status || 'Available';
  await client.query('UPDATE equipment SET status = $1 WHERE id = $2', [newStatus, equipmentId]);
  await client.query(
    `INSERT INTO equipment_status_history (equipment_id, previous_status, new_status, reference_type, reference_id, changed_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [equipmentId, prev, newStatus, refType || null, refId || null, user || 'System', notes || null]
  );
}

function drawPdfHeader(doc, title, docNumber, dateStr) {
  const logoPath = '/var/www/procoating/assets/logo-procoating.png';
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 45, 36, { width: 165 });
  } else {
    doc.fontSize(16).fillColor('#003B6F').font('Helvetica-Bold').text('PRO-Coating Treatments Inc.', 45, 42);
  }
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#003B6F').text(title, 300, 40, { align: 'right', width: 265 });
  doc.font('Helvetica').fontSize(9.5).fillColor('#334155')
    .text(`Document #: ${docNumber}`, 300, 62, { align: 'right', width: 265 })
    .text(`Date: ${dateStr}`, 300, 76, { align: 'right', width: 265 })
    .text('787-309-8738 | 787-604-4347', 300, 90, { align: 'right', width: 265 })
    .text('sales@procoatingpr.com | procoatingpr.com', 300, 103, { align: 'right', width: 265 });

  doc.moveTo(45, 122).lineTo(565, 122).lineWidth(2).strokeColor('#9EC63B').stroke();
}

const CODE128_WIDTHS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112"
];

function drawCode128Barcode(doc, text, x, y, maxWidth, height) {
  const clean = String(text || 'PCT-ITEM').replace(/[^\x20-\x7E]/g, '-').slice(0, 24);
  const codes = [104];
  let checksum = 104;
  for (let i = 0; i < clean.length; i++) {
    const val = clean.charCodeAt(i) - 32;
    codes.push(val);
    checksum += val * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(106);

  const widths = codes.map(c => CODE128_WIDTHS[c]).join('');
  let totalModules = 0;
  for (let i = 0; i < widths.length; i++) totalModules += Number(widths[i]);

  const moduleW = Math.min(1.65, maxWidth / (totalModules + 12));
  const barcodeW = totalModules * moduleW;
  let curX = x + (maxWidth - barcodeW) / 2;

  doc.save();
  doc.fillColor('#000000');
  for (let i = 0; i < widths.length; i++) {
    const w = Number(widths[i]) * moduleW;
    if (i % 2 === 0) {
      doc.rect(curX, y, w, height).fill();
    }
    curX += w;
  }
  doc.restore();
}

module.exports = function registerOperationsRoutes(app, pool, authMw) {
  const guard = typeof authMw === 'function' ? authMw : (_req, _res, next) => next();
  app.use('/uploads', express.static(UPLOAD_DIR));

  // ==================== LOOKUPS ====================
  app.get('/api/operations/lookups', guard, async (_req, res) => {
    try {
      const [customers, contacts, equipment, parts, employees, vehicles, quotations, quoteItems] = await Promise.all([
        pool.query('SELECT * FROM customers ORDER BY id ASC').catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM customer_contacts ORDER BY is_primary DESC, id ASC').catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM equipment ORDER BY id ASC').catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM spare_parts ORDER BY id ASC').catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM employees ORDER BY id ASC').catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM vehicles ORDER BY id ASC').catch(() => ({ rows: [] })),
        pool.query(`
          SELECT q.*, c.name AS customer_name, c.address AS customer_address, cc.full_name AS contact_name
          FROM quotations q
          LEFT JOIN customers c ON c.id = q.customer_id
          LEFT JOIN customer_contacts cc ON cc.id = q.contact_id
          ORDER BY q.id DESC
        `).catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM quotation_items ORDER BY id ASC').catch(() => ({ rows: [] }))
      ]);
      res.json({
        customers: customers.rows,
        contacts: contacts.rows,
        equipment: equipment.rows,
        spare_parts: parts.rows,
        employees: employees.rows,
        vehicles: vehicles.rows,
        quotations: quotations.rows,
        quotation_items: quoteItems.rows
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // ==================== 5. WAREHOUSE BOX BARCODE LABELS (PDF) ====================
  app.get('/api/inventory/labels/pdf', guard, async (req, res) => {
    try {
      const { ids, scope } = req.query;
      let query = 'SELECT * FROM spare_parts';
      const params = [];

      if (ids) {
        const idList = String(ids).split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        if (!idList.length) return res.status(400).json({ error: 'Invalid item IDs' });
        query += ' WHERE id = ANY($1::int[]) ORDER BY part_number ASC, id ASC';
        params.push(idList);
      } else if (scope === 'pending') {
        query += " WHERE notes ILIKE '%PENDING%' OR COALESCE(stock_quantity, 0) = 0 ORDER BY part_number ASC, id ASC";
      } else if (scope === 'new') {
        query += " WHERE part_number LIKE 'PCT-WH-%' ORDER BY part_number ASC, id ASC";
      } else {
        query += ' ORDER BY part_number ASC, id ASC';
      }

      const { rows } = await pool.query(query, params);
      if (!rows.length) return res.status(404).send('No inventory items matched the selected label filter.');

      const fileTag = ids ? `Item_${rows[0].part_number || rows[0].id}` : (scope || 'Catalog');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PROCoating_Box_Labels_${fileTag}.pdf"`);

      const doc = new PDFDocument({ margin: 28, size: 'LETTER' });
      doc.pipe(res);

      // 2 columns x 5 rows = 10 warehouse box labels per Letter page (Avery 5163 / 8163 compatible)
      const cols = 2;
      const rowsPerPage = 5;
      const startX = 32;
      const startY = 32;
      const labelW = 266;
      const labelH = 140;
      const gapX = 16;
      const gapY = 8;

      rows.forEach((item, idx) => {
        if (idx > 0 && idx % (cols * rowsPerPage) === 0) doc.addPage();
        const pos = idx % (cols * rowsPerPage);
        const col = pos % cols;
        const row = Math.floor(pos / cols);
        const x = startX + col * (labelW + gapX);
        const y = startY + row * (labelH + gapY);

        const sku = item.part_number || `PCT-${String(item.id).padStart(4, '0')}`;
        const title = item.name || item.description || 'Warehouse Item';
        const cat = item.category || 'General Inventory';
        const loc = item.location || 'Main Warehouse';
        const qty = Number(item.stock_quantity ?? 0);
        const isPending = String(item.notes || '').includes('PENDING');

        // Outer label border & corporate header bar
        doc.roundedRect(x, y, labelW, labelH, 6).lineWidth(1).strokeColor('#94A3B8').stroke();
        doc.rect(x, y, labelW, 20).fill('#003B6F');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.8)
          .text('PRO-COATING TREATMENTS INC.', x + 8, y + 6, { width: 170 });
        doc.fillColor('#D9F99D').font('Helvetica-Bold').fontSize(7.5)
          .text(loc.toUpperCase(), x + 175, y + 6, { width: 83, align: 'right' });

        // Item Title & Category
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9.5)
          .text(title, x + 8, y + 25, { width: labelW - 16, height: 24, ellipsis: true });
        doc.fillColor('#475569').font('Helvetica').fontSize(7.5)
          .text(`Category: ${cat}`, x + 8, y + 50, { width: 175, ellipsis: true });

        // Stock Quantity Badge
        doc.roundedRect(x + labelW - 76, y + 48, 68, 18, 4).fill(isPending ? '#FEF3C7' : '#DCFCE7');
        doc.fillColor(isPending ? '#92400E' : '#166534').font('Helvetica-Bold').fontSize(7.5)
          .text(isPending ? 'QTY: [ ____ ]' : `QTY: ${qty} UNITS`, x + labelW - 74, y + 53, { width: 64, align: 'center' });

        // Vector Code 128B Barcode
        drawCode128Barcode(doc, sku, x + 14, y + 71, labelW - 28, 38);

        // Human-readable SKU & Box Count Footer
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9)
          .text(sku, x + 8, y + 112, { width: labelW - 16, align: 'center' });
        doc.fillColor('#64748B').font('Helvetica').fontSize(6.8)
          .text('Box #: ____ / ____   |   Verified By: __________   |   Date: ___/___/26', x + 8, y + 126, { width: labelW - 16, align: 'center' });
      });

      doc.end();
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  // ==================== 1. QUOTATIONS ====================
  app.get('/api/quotations', guard, async (_req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT q.*, c.name AS customer_name, cc.full_name AS contact_name, cc.email AS contact_email, cc.phone AS contact_phone
        FROM quotations q
        LEFT JOIN customers c ON c.id = q.customer_id
        LEFT JOIN customer_contacts cc ON cc.id = q.contact_id
        ORDER BY q.id DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/quotations/:id', guard, async (req, res) => {
    try {
      const qRes = await pool.query(`
        SELECT q.*, c.name AS customer_name, c.address AS customer_address, c.phone AS customer_phone, c.email AS customer_email,
               cc.full_name AS contact_name, cc.email AS contact_email, cc.phone AS contact_phone, cc.position AS contact_position
        FROM quotations q
        LEFT JOIN customers c ON c.id = q.customer_id
        LEFT JOIN customer_contacts cc ON cc.id = q.contact_id
        WHERE q.id = $1
      `, [req.params.id]);
      if (!qRes.rows.length) return res.status(404).json({ error: 'Quotation not found' });
      const itemsRes = await pool.query('SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY id ASC', [req.params.id]);
      res.json({ ...qRes.rows[0], items: itemsRes.rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/quotations', guard, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { customer_id, contact_id, service_type, issue_date, valid_until, tax_rate, payment_terms, notes, items } = req.body;
      if (!quotation_id) throw new Error('A linked Quotation is required to create an Internal Dispatch Order');
      const qCheck = await client.query('SELECT quote_number, customer_id, contact_id, total_amount FROM quotations WHERE id = $1', [quotation_id]);
      if (!qCheck.rows.length) throw new Error('Selected Quotation not found');
      const linkedQuote = qCheck.rows[0];
      const resolvedCustomerId = customer_id || linkedQuote.customer_id;
      const cleanItems = Array.isArray(items) ? items.filter(i => i.description && i.description.trim()) : [];
      if (!cleanItems.length) throw new Error('At least one line item is required');

      let subtotal = 0;
      cleanItems.forEach(it => {
        it.quantity = Number(it.quantity) || 1;
        it.unit_price = Number(it.unit_price) || 0;
        it.line_total = +(it.quantity * it.unit_price).toFixed(2);
        subtotal += it.line_total;
      });
      const tRate = Number(tax_rate) || 0;
      const taxAmount = +(subtotal * (tRate / 100)).toFixed(2);
      const totalAmount = +(subtotal + taxAmount).toFixed(2);
      const quoteNumber = `QT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      const user = (req.user && (req.user.full_name || req.user.username)) || 'Office';

      const qIns = await client.query(
        `INSERT INTO quotations (quote_number, customer_id, contact_id, service_type, issue_date, valid_until, status, subtotal, tax_rate, tax_amount, total_amount, payment_terms, notes, created_by)
         VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6,'Draft',$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [quoteNumber, customer_id, contact_id || null, service_type || 'Equipment Rental', issue_date || null, valid_until || null, subtotal, tRate, taxAmount, totalAmount, payment_terms || 'Net 30 Days', notes || null, user]
      );
      const qId = qIns.rows[0].id;

      for (const it of cleanItems) {
        await client.query(
          `INSERT INTO quotation_items (quotation_id, item_type, equipment_id, spare_part_id, description, quantity, unit_price, line_total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [qId, it.item_type || 'Equipment Rental', it.equipment_id || null, it.spare_part_id || null, it.description.trim(), it.quantity, it.unit_price, it.line_total]
        );
      }
      await client.query('COMMIT');
      res.status(201).json(qIns.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.patch('/api/quotations/:id/status', guard, async (req, res) => {
    try {
      const { status } = req.body;
      const { rows } = await pool.query('UPDATE quotations SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Quotation not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Quotation PDF Download
  app.get('/api/quotations/:id/pdf', guard, async (req, res) => {
    try {
      const qRes = await pool.query(`
        SELECT q.*, c.name AS customer_name, c.address AS customer_address, c.phone AS customer_phone, c.email AS customer_email,
               cc.full_name AS contact_name, cc.email AS contact_email, cc.phone AS contact_phone, cc.position AS contact_position
        FROM quotations q
        LEFT JOIN customers c ON c.id = q.customer_id
        LEFT JOIN customer_contacts cc ON cc.id = q.contact_id
        WHERE q.id = $1
      `, [req.params.id]);
      if (!qRes.rows.length) return res.status(404).send('Quotation not found');
      const q = qRes.rows[0];
      const items = (await pool.query('SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY id ASC', [q.id])).rows;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${q.quote_number}.pdf"`);

      const doc = new PDFDocument({ margin: 45, size: 'LETTER' });
      doc.pipe(res);

      drawPdfHeader(doc, 'COMMERCIAL QUOTATION', q.quote_number, String(q.issue_date).slice(0, 10));

      // Customer & Proposal Info Box
      doc.roundedRect(45, 134, 260, 92, 6).fillAndStroke('#F8FAFC', '#CBD5E1');
      doc.fillColor('#003B6F').font('Helvetica-Bold').fontSize(9.5).text('PREPARED FOR:', 55, 142);
      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text(q.customer_name || '', 55, 156, { width: 240 });
      doc.font('Helvetica').fontSize(8.8).fillColor('#334155')
        .text(`Attn: ${q.contact_name || 'Purchasing / Facilities'}${q.contact_position ? ` (${q.contact_position})` : ''}`, 55, 172, { width: 240 })
        .text(`Phone: ${q.contact_phone || q.customer_phone || 'N/A'}`, 55, 185, { width: 240 })
        .text(`Email: ${q.contact_email || q.customer_email || 'N/A'}`, 55, 198, { width: 240 })
        .text(`Address: ${(q.customer_address || 'Puerto Rico').slice(0, 55)}`, 55, 211, { width: 240 });

      doc.roundedRect(315, 134, 250, 92, 6).fillAndStroke('#F8FAFC', '#CBD5E1');
      doc.fillColor('#003B6F').font('Helvetica-Bold').fontSize(9.5).text('PROPOSAL SUMMARY:', 325, 142);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text(`Service Category: ${q.service_type}`, 325, 158)
        .text(`Valid Until: ${q.valid_until ? String(q.valid_until).slice(0, 10) : '30 Days from Issue'}`, 325, 173)
        .text(`Payment Terms: ${q.payment_terms || 'Net 30 Days'}`, 325, 188)
        .text(`Status: ${q.status}`, 325, 203);

      // Items Table Header
      let y = 242;
      doc.rect(45, y, 520, 22).fill('#003B6F');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
        .text('Type', 52, y + 6, { width: 95 })
        .text('Description / Scope', 150, y + 6, { width: 225 })
        .text('Qty / Days', 380, y + 6, { width: 55, align: 'right' })
        .text('Unit Rate', 440, y + 6, { width: 58, align: 'right' })
        .text('Total', 502, y + 6, { width: 58, align: 'right' });
      y += 24;

      items.forEach((it, idx) => {
        if (y > 660) { doc.addPage(); y = 50; }
        if (idx % 2 === 1) doc.rect(45, y - 2, 520, 22).fill('#F8FAFC');
        doc.fillColor('#1E293B').font('Helvetica').fontSize(8.8)
          .text(it.item_type || '', 52, y + 3, { width: 95 })
          .text(it.description || '', 150, y + 3, { width: 225 })
          .text(Number(it.quantity).toFixed(2), 380, y + 3, { width: 55, align: 'right' })
          .text(`$${Number(it.unit_price).toFixed(2)}`, 440, y + 3, { width: 58, align: 'right' })
          .text(`$${Number(it.line_total).toFixed(2)}`, 502, y + 3, { width: 58, align: 'right' });
        y += 22;
      });

      y += 10;
      doc.moveTo(360, y).lineTo(565, y).lineWidth(1).strokeColor('#CBD5E1').stroke();
      y += 8;
      doc.font('Helvetica').fontSize(9.5).fillColor('#334155')
        .text('Subtotal:', 370, y, { width: 110, align: 'right' })
        .text(`$${Number(q.subtotal).toFixed(2)}`, 485, y, { width: 75, align: 'right' });
      y += 16;
      doc.text(`Tax (${Number(q.tax_rate).toFixed(2)}%):`, 370, y, { width: 110, align: 'right' })
        .text(`$${Number(q.tax_amount).toFixed(2)}`, 485, y, { width: 75, align: 'right' });
      y += 18;
      doc.rect(365, y - 3, 200, 22).fill('#003B6F');
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#FFFFFF')
        .text('TOTAL:', 375, y + 2, { width: 105, align: 'right' })
        .text(`$${Number(q.total_amount).toFixed(2)}`, 485, y + 2, { width: 75, align: 'right' });

      y += 38;
      if (q.notes) {
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#003B6F').text('Scope & Technical Notes:', 45, y);
        y += 14;
        doc.font('Helvetica').fontSize(8.8).fillColor('#334155').text(q.notes, 45, y, { width: 520 });
        y += 45;
      }

      const sigY = Math.max(y + 25, 650);
      doc.moveTo(45, sigY).lineTo(250, sigY).lineWidth(1).strokeColor('#64748B').stroke();
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text('Authorized Signature — PRO-Coating Treatments Inc.', 45, sigY + 5);

      doc.moveTo(320, sigY).lineTo(565, sigY).lineWidth(1).strokeColor('#64748B').stroke();
      doc.text('Client Acceptance Signature & Date', 320, sigY + 5);

      doc.end();
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  // ==================== 2. INTERNAL DISPATCH & RENTAL ORDERS ====================
  app.get('/api/internal-orders', guard, async (_req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT io.*,
               q.quote_number,
               c.name AS customer_name,
               cc.full_name AS contact_name,
               e.name AS equipment_name, e.model AS equipment_model, e.serial_number AS equipment_serial, e.status AS equipment_status,
               ed.full_name AS delivered_by_name,
               ei.full_name AS installed_by_name,
               v.plate_number AS vehicle_plate,
               COALESCE((SELECT SUM(internal_total_cost) FROM internal_order_expenses ex WHERE ex.order_id = io.id), 0) AS total_internal_cost,
               COALESCE((SELECT SUM(billable_total_price) FROM internal_order_expenses ex WHERE ex.order_id = io.id AND ex.is_billable = TRUE), 0) AS total_billable_extras
        FROM internal_orders io
        LEFT JOIN quotations q ON q.id = io.quotation_id
        LEFT JOIN customers c ON c.id = io.customer_id
        LEFT JOIN customer_contacts cc ON cc.id = io.contact_id
        LEFT JOIN equipment e ON e.id = io.equipment_id
        LEFT JOIN employees ed ON ed.id = io.delivered_by_id
        LEFT JOIN employees ei ON ei.id = io.installed_by_id
        LEFT JOIN vehicles v ON v.id = io.vehicle_id
        ORDER BY io.id DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/internal-orders/:id', guard, async (req, res) => {
    try {
      const oRes = await pool.query(`
        SELECT io.*,
               q.quote_number,
               c.name AS customer_name, c.address AS customer_address, c.phone AS customer_phone,
               cc.full_name AS contact_name, cc.phone AS contact_phone, cc.email AS contact_email,
               e.name AS equipment_name, e.model AS equipment_model, e.serial_number AS equipment_serial, e.capacity AS equipment_capacity, e.status AS equipment_status,
               ed.full_name AS delivered_by_name,
               ei.full_name AS installed_by_name,
               v.plate_number AS vehicle_plate, v.make AS vehicle_make, v.model AS vehicle_model
        FROM internal_orders io
        LEFT JOIN quotations q ON q.id = io.quotation_id
        LEFT JOIN customers c ON c.id = io.customer_id
        LEFT JOIN customer_contacts cc ON cc.id = io.contact_id
        LEFT JOIN equipment e ON e.id = io.equipment_id
        LEFT JOIN employees ed ON ed.id = io.delivered_by_id
        LEFT JOIN employees ei ON ei.id = io.installed_by_id
        LEFT JOIN vehicles v ON v.id = io.vehicle_id
        WHERE io.id = $1
      `, [req.params.id]);
      if (!oRes.rows.length) return res.status(404).json({ error: 'Internal order not found' });

      const [items, checklist, photos, expenses] = await Promise.all([
        pool.query('SELECT * FROM internal_order_items WHERE order_id = $1 ORDER BY id ASC', [req.params.id]),
        pool.query('SELECT * FROM internal_order_checklists WHERE order_id = $1 ORDER BY item_order ASC, id ASC', [req.params.id]),
        pool.query('SELECT * FROM internal_order_photos WHERE order_id = $1 ORDER BY id DESC', [req.params.id]),
        pool.query(`
          SELECT ex.*, sp.part_number, emp.full_name AS technician_name
          FROM internal_order_expenses ex
          LEFT JOIN spare_parts sp ON sp.id = ex.spare_part_id
          LEFT JOIN employees emp ON emp.id = ex.employee_id
          WHERE ex.order_id = $1 ORDER BY ex.expense_date DESC, ex.id DESC
        `, [req.params.id])
      ]);

      res.json({
        ...oRes.rows[0],
        items: items.rows,
        checklist: checklist.rows,
        photos: photos.rows,
        expenses: expenses.rows
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Internal Dispatch Order & Signed Handover PDF
  app.get('/api/internal-orders/:id/pdf', guard, async (req, res) => {
    try {
      const oRes = await pool.query(`
        SELECT io.*, q.quote_number,
               c.name AS customer_name, c.address AS customer_address, c.phone AS customer_phone,
               cc.full_name AS contact_name, cc.phone AS contact_phone, cc.email AS contact_email,
               e.name AS equipment_name, e.model AS equipment_model, e.serial_number AS equipment_serial, e.capacity AS equipment_capacity,
               ed.full_name AS delivered_by_name,
               ei.full_name AS installed_by_name,
               v.plate_number AS vehicle_plate, v.make AS vehicle_make, v.model AS vehicle_model
        FROM internal_orders io
        LEFT JOIN quotations q ON q.id = io.quotation_id
        LEFT JOIN customers c ON c.id = io.customer_id
        LEFT JOIN customer_contacts cc ON cc.id = io.contact_id
        LEFT JOIN equipment e ON e.id = io.equipment_id
        LEFT JOIN employees ed ON ed.id = io.delivered_by_id
        LEFT JOIN employees ei ON ei.id = io.installed_by_id
        LEFT JOIN vehicles v ON v.id = io.vehicle_id
        WHERE io.id = $1
      `, [req.params.id]);
      if (!oRes.rows.length) return res.status(404).send('Internal order not found');
      const o = oRes.rows[0];

      const [itemsRes, chkRes, photosRes] = await Promise.all([
        pool.query('SELECT * FROM internal_order_items WHERE order_id = $1 ORDER BY id ASC', [o.id]),
        pool.query('SELECT * FROM internal_order_checklists WHERE order_id = $1 ORDER BY item_order ASC, id ASC', [o.id]),
        pool.query('SELECT COUNT(*)::int AS total FROM internal_order_photos WHERE order_id = $1', [o.id])
      ]);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${o.order_number}_Handover.pdf"`);

      const doc = new PDFDocument({ margin: 45, size: 'LETTER' });
      doc.pipe(res);

      drawPdfHeader(doc, 'DISPATCH & HANDOVER ORDER', o.order_number, String(o.scheduled_delivery || o.created_at).slice(0, 10));

      // Customer & Logistics Box
      doc.roundedRect(45, 134, 255, 96, 6).fillAndStroke('#F8FAFC', '#CBD5E1');
      doc.fillColor('#003B6F').font('Helvetica-Bold').fontSize(9).text('CUSTOMER & SITE DETAILS:', 55, 142);
      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9.8).text(o.customer_name || '', 55, 155, { width: 235 });
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155')
        .text(`Linked Quote: ${o.quote_number || 'N/A'}`, 55, 170)
        .text(`On-Site Contact: ${o.contact_name || 'N/A'} (${o.contact_phone || o.customer_phone || 'N/A'})`, 55, 183, { width: 235 })
        .text(`Site Address: ${(o.site_address || o.customer_address || 'Puerto Rico').slice(0, 62)}`, 55, 196, { width: 235 })
        .text(`Current Status: ${o.status}`, 55, 212);

      doc.roundedRect(310, 134, 255, 96, 6).fillAndStroke('#F8FAFC', '#CBD5E1');
      doc.fillColor('#003B6F').font('Helvetica-Bold').fontSize(9).text('EQUIPMENT & FIELD CREW:', 320, 142);
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155')
        .text(`Equipment: ${o.equipment_name || 'N/A'} ${o.equipment_model || ''}`, 320, 156, { width: 235 })
        .text(`Serial # (S/N): ${o.equipment_serial || 'N/A'}`, 320, 170)
        .text(`Delivery Driver: ${o.delivered_by_name || 'Unassigned'}`, 320, 183)
        .text(`Installing Operator: ${o.installed_by_name || 'Unassigned'}`, 320, 196)
        .text(`Vehicle: ${o.vehicle_plate ? o.vehicle_plate + ' (' + (o.vehicle_make || '') + ')' : 'N/A'} | Photos: ${photosRes.rows[0].total}`, 320, 210);

      // Dispatched Supplies & Accessories
      let y = 244;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#003B6F').text('1. Dispatched Supplies, Cables, Hoses & Accessories', 45, y);
      y += 15;
      doc.rect(45, y, 520, 20).fill('#003B6F');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5)
        .text('Category', 52, y + 6, { width: 130 })
        .text('Item Description', 186, y + 6, { width: 255 })
        .text('Qty', 445, y + 6, { width: 50, align: 'right' })
        .text('Unit', 502, y + 6, { width: 55 });
      y += 22;

      const dItems = itemsRes.rows.length ? itemsRes.rows : [{ category: 'Equipment', description: 'Main unit dispatch package', quantity: 1, unit: 'Set' }];
      dItems.forEach((it, idx) => {
        if (y > 670) { doc.addPage(); y = 50; }
        if (idx % 2 === 1) doc.rect(45, y - 2, 520, 20).fill('#F8FAFC');
        doc.fillColor('#1E293B').font('Helvetica').fontSize(8.3)
          .text(it.category || '', 52, y + 3, { width: 130 })
          .text(it.description || '', 186, y + 3, { width: 255 })
          .text(String(Number(it.quantity)), 445, y + 3, { width: 50, align: 'right' })
          .text(it.unit || 'Unit', 502, y + 3, { width: 55 });
        y += 20;
      });

      // Pre-Departure & On-Site Verification Checklist
      y += 12;
      if (y > 560) { doc.addPage(); y = 50; }
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#003B6F').text('2. Pre-Departure & Customer On-Site Verification Checklist', 45, y);
      y += 15;
      doc.rect(45, y, 520, 20).fill('#003B6F');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5)
        .text('Inspection Point', 52, y + 6, { width: 280 })
        .text('Pre-Departure', 338, y + 6, { width: 70, align: 'center' })
        .text('Customer OK', 412, y + 6, { width: 70, align: 'center' })
        .text('Remarks', 486, y + 6, { width: 75 });
      y += 22;

      chkRes.rows.forEach((ch, idx) => {
        if (y > 680) { doc.addPage(); y = 50; }
        if (idx % 2 === 1) doc.rect(45, y - 2, 520, 20).fill('#F8FAFC');
        doc.fillColor('#1E293B').font('Helvetica').fontSize(8.1)
          .text(ch.check_label || '', 52, y + 3, { width: 280 })
          .text(ch.pre_departure_ok ? 'PASSED' : 'PENDING', 338, y + 3, { width: 70, align: 'center' })
          .text(ch.customer_verified_ok ? 'VERIFIED' : 'PENDING', 412, y + 3, { width: 70, align: 'center' })
          .text(ch.remarks || '—', 486, y + 3, { width: 75 });
        y += 20;
      });

      // Customer Handover & Embedded Digital Signature
      y += 18;
      if (y > 610) { doc.addPage(); y = 50; }
      doc.roundedRect(45, y, 520, 105, 6).fillAndStroke('#F8FAFC', '#CBD5E1');
      doc.fillColor('#003B6F').font('Helvetica-Bold').fontSize(9.5).text('3. Customer Acceptance & Handover Sign-Off', 55, y + 8);
      doc.font('Helvetica').fontSize(8.3).fillColor('#334155')
        .text('I confirm that the equipment and accessories listed above were inspected and received in satisfactory operating condition.', 55, y + 23, { width: 300 })
        .text(`Received By: ${o.customer_signed_name || 'Pending On-Site Signature'}`, 55, y + 52)
        .text(`Signed Timestamp: ${o.signed_at ? new Date(o.signed_at).toLocaleString() : 'Not yet signed'}`, 55, y + 67)
        .text(`Delivered By: ${o.delivered_by_name || 'PRO-Coating Crew'}`, 55, y + 82);

      if (o.customer_signature_data && o.customer_signature_data.startsWith('data:image/')) {
        try {
          const b64 = o.customer_signature_data.replace(/^data:image\/\w+;base64,/, '');
          const sigBuf = Buffer.from(b64, 'base64');
          doc.rect(370, y + 14, 182, 78).fillAndStroke('#FFFFFF', '#94A3B8');
          doc.image(sigBuf, 376, y + 18, { fit: [170, 68], align: 'center', valign: 'center' });
        } catch (_e) {}
      } else {
        doc.rect(370, y + 14, 182, 78).stroke('#94A3B8');
        doc.fontSize(8).fillColor('#94A3B8').text('Customer Signature Box', 370, y + 48, { width: 182, align: 'center' });
      }

      doc.end();
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  app.post('/api/internal-orders', guard, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const {
        quotation_id, customer_id, contact_id, equipment_id, vehicle_id,
        delivered_by_id, installed_by_id, scheduled_delivery, expected_return,
        monthly_rate, site_address, logistics_notes, items
      } = req.body;
      if (!customer_id) throw new Error('Customer is required');

      const orderNumber = `IO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      const user = (req.user && (req.user.full_name || req.user.username)) || 'Operations';

      const ins = await client.query(
        `INSERT INTO internal_orders
         (order_number, quotation_id, customer_id, contact_id, equipment_id, vehicle_id, delivered_by_id, installed_by_id,
          status, scheduled_delivery, expected_return, monthly_rate, site_address, logistics_notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Staged / Prepared',$9,$10,$11,$12,$13,$14) RETURNING *`,
        [
          orderNumber, quotation_id || null, customer_id, contact_id || null, equipment_id || null,
          vehicle_id || null, delivered_by_id || null, installed_by_id || null,
          scheduled_delivery || null, expected_return || null, Number(monthly_rate) || 0,
          site_address || null, logistics_notes || null, user
        ]
      );
      const orderId = ins.rows[0].id;

      // Insert logistics items / accessories needed for dispatch
      const cleanItems = Array.isArray(items) ? items.filter(i => i.description && i.description.trim()) : [];
      for (const it of cleanItems) {
        await client.query(
          `INSERT INTO internal_order_items (order_id, category, description, quantity, unit, packed)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [orderId, it.category || 'Accessory / Supply', it.description.trim(), Number(it.quantity) || 1, it.unit || 'Unit', it.packed !== false]
        );
      }

      // Create standard Pre-Departure & On-Site Verification Checklist
      for (let idx = 0; idx < DEFAULT_CHECKLIST.length; idx++) {
        await client.query(
          `INSERT INTO internal_order_checklists (order_id, item_order, check_label, pre_departure_ok, customer_verified_ok)
           VALUES ($1, $2, $3, FALSE, FALSE)`,
          [orderId, idx + 1, DEFAULT_CHECKLIST[idx]]
        );
      }

      // If created from a quotation, mark quotation Approved
      if (quotation_id) {
        await client.query(`UPDATE quotations SET status = 'Approved' WHERE id = $1`, [quotation_id]);
      }

      // Update Equipment Status -> Staged / Prepared
      if (equipment_id) {
        await logEquipmentStatus(client, equipment_id, 'Staged / Prepared', 'internal_order', orderId, user, `Assigned to ${orderNumber} (Quotation ${linkedQuote.quote_number})`);
      }

      await client.query('COMMIT');
      res.status(201).json(ins.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  // Update Order & Equipment Lifecycle Status (Staged / Prepared -> Delivered -> Rented -> Returned / Available)
  app.patch('/api/internal-orders/:id/status', guard, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { status, notes } = req.body;
      const user = (req.user && (req.user.full_name || req.user.username)) || 'Operations';

      const cur = await client.query('SELECT * FROM internal_orders WHERE id = $1', [req.params.id]);
      if (!cur.rows.length) throw new Error('Order not found');
      const order = cur.rows[0];

      const isDelivery = status === 'Delivered' && !order.actual_delivery_at;
      const upd = await client.query(
        `UPDATE internal_orders SET status = $1, actual_delivery_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE actual_delivery_at END WHERE id = $3 RETURNING *`,
        [status, isDelivery, req.params.id]
      );

      if (order.equipment_id) {
        let eqStatus = status;
        if (status === 'Returned / Completed') eqStatus = 'Available';
        await logEquipmentStatus(client, order.equipment_id, eqStatus, 'internal_order', order.id, user, notes || `Order ${order.order_number} transitioned to ${status}`);
      }

      await client.query('COMMIT');
      res.json(upd.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  // Update Pre-Departure & Customer On-Site Checklist
  app.put('/api/internal-orders/:id/checklist', guard, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { checklist } = req.body;
      if (Array.isArray(checklist)) {
        for (const item of checklist) {
          await client.query(
            `UPDATE internal_order_checklists SET pre_departure_ok = $1, customer_verified_ok = $2, remarks = $3 WHERE id = $4 AND order_id = $5`,
            [Boolean(item.pre_departure_ok), Boolean(item.customer_verified_ok), item.remarks || null, item.id, req.params.id]
          );
        }
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  // Upload Pre-Departure / On-Site Photo
  app.post('/api/internal-orders/:id/photos', guard, uploadPhoto.single('photo'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No photo file provided' });
      const user = (req.user && (req.user.full_name || req.user.username)) || 'Technician';
      const fileUrl = `/uploads/${req.file.filename}`;
      const { rows } = await pool.query(
        `INSERT INTO internal_order_photos (order_id, stage, caption, file_path, uploaded_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.id, req.body.stage || 'Pre-Departure', req.body.caption || null, fileUrl, user]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Save Customer Digital Signature & Confirm Delivery/Handover
  app.post('/api/internal-orders/:id/signature', guard, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { signed_name, signature_data, target_status } = req.body;
      if (!signed_name || !signed_name.trim()) throw new Error('Customer representative name is required');
      if (!signature_data || !signature_data.startsWith('data:image/')) throw new Error('Valid digital signature is required');

      const nextStatus = target_status || 'Rented';
      const user = (req.user && (req.user.full_name || req.user.username)) || 'Field Operator';

      const upd = await client.query(
        `UPDATE internal_orders
         SET customer_signed_name = $1, customer_signature_data = $2, signed_at = CURRENT_TIMESTAMP,
             actual_delivery_at = COALESCE(actual_delivery_at, CURRENT_TIMESTAMP), status = $3
         WHERE id = $4 RETURNING *`,
        [signed_name.trim(), signature_data, nextStatus, req.params.id]
      );
      if (!upd.rows.length) throw new Error('Order not found');
      const order = upd.rows[0];

      // Mark all checklist items as customer-verified upon sign-off if not already checked
      await client.query('UPDATE internal_order_checklists SET customer_verified_ok = TRUE WHERE order_id = $1', [order.id]);

      if (order.equipment_id) {
        await logEquipmentStatus(client, order.equipment_id, nextStatus, 'internal_order', order.id, user, `Signed by ${signed_name.trim()} on site`);
      }

      await client.query('COMMIT');
      res.json(order);
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  // ==================== 3. ORDER EXPENSES, SPARE PARTS & MAINTENANCE ====================
  app.post('/api/internal-orders/:id/expenses', guard, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orderRes = await client.query('SELECT * FROM internal_orders WHERE id = $1', [req.params.id]);
      if (!orderRes.rows.length) throw new Error('Order not found');
      const order = orderRes.rows[0];

      const {
        expense_date, category, maintenance_type, spare_part_id, employee_id,
        description, quantity, internal_unit_cost, is_billable, billable_unit_price, notes
      } = req.body;

      const qty = Number(quantity) || 1;
      let unitCost = Number(internal_unit_cost) || 0;
      let desc = (description || '').trim();

      // If linked to warehouse Spare Part, fetch cost if zero and deduct stock automatically
      if (spare_part_id) {
        const spRes = await client.query('SELECT * FROM spare_parts WHERE id = $1 FOR UPDATE', [spare_part_id]);
        if (spRes.rows.length) {
          const sp = spRes.rows[0];
          if (!unitCost) unitCost = Number(sp.unit_price) || 0;
          if (!desc) desc = `${sp.part_number ? sp.part_number + ' - ' : ''}${sp.description}`;

          const newQty = Math.max(0, Number(sp.stock_quantity || 0) - qty);
          await client.query('UPDATE spare_parts SET stock_quantity = $1 WHERE id = $2', [newQty, sp.id]);
          await client.query(
            `INSERT INTO inventory_movements (spare_part_id, movement_type, quantity, notes)
             VALUES ($1, 'OUT', $2, $3)`,
            [sp.id, qty, `Used in ${order.order_number} (${maintenance_type || 'Maintenance'})`]
          ).catch(() => {});
        }
      }

      if (!desc) throw new Error('Description is required');
      const internalTotal = +(qty * unitCost).toFixed(2);
      const billableFlag = Boolean(is_billable);
      const billableUnit = billableFlag ? (Number(billable_unit_price) || unitCost) : 0;
      const billableTotal = billableFlag ? +(qty * billableUnit).toFixed(2) : 0;

      const ins = await client.query(
        `INSERT INTO internal_order_expenses
         (order_id, equipment_id, expense_date, category, maintenance_type, spare_part_id, employee_id,
          description, quantity, internal_unit_cost, internal_total_cost, is_billable, billable_unit_price, billable_total_price, notes)
         VALUES ($1,$2,COALESCE($3, CURRENT_DATE),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [
          order.id, order.equipment_id || null, expense_date || null, category || 'Spare Part',
          maintenance_type || 'Corrective Maintenance', spare_part_id || null, employee_id || null,
          desc, qty, unitCost, internalTotal, billableFlag, billableUnit, billableTotal, notes || null
        ]
      );

      await client.query('COMMIT');
      res.status(201).json(ins.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  // Equipment Full Status Traceability Endpoint
  app.get('/api/equipment/:id/history', guard, async (req, res) => {
    try {
      const [eq, hist] = await Promise.all([
        pool.query('SELECT id, name, model, serial_number, status FROM equipment WHERE id = $1', [req.params.id]),
        pool.query('SELECT * FROM equipment_status_history WHERE equipment_id = $1 ORDER BY created_at DESC, id DESC', [req.params.id])
      ]);
      if (!eq.rows.length) return res.status(404).json({ error: 'Equipment not found' });
      res.json({ equipment: eq.rows[0], history: hist.rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== 4. MONTHLY SERVICE SETTLEMENT / LIQUIDATION ====================
  async function computeMonthlySettlement(monthStr) {
    const targetMonth = /^\d{4}-\d{2}$/.test(monthStr || '') ? monthStr : new Date().toISOString().slice(0, 7);
    const monthStart = `${targetMonth}-01`;

    const ordersRes = await pool.query(`
      SELECT io.id, io.order_number, io.status, io.monthly_rate, io.scheduled_delivery, io.actual_delivery_at, io.expected_return,
             c.name AS customer_name,
             e.name AS equipment_name, e.model AS equipment_model, e.serial_number AS equipment_serial,
             ed.full_name AS delivered_by_name, ei.full_name AS installed_by_name
      FROM internal_orders io
      LEFT JOIN customers c ON c.id = io.customer_id
      LEFT JOIN equipment e ON e.id = io.equipment_id
      LEFT JOIN employees ed ON ed.id = io.delivered_by_id
      LEFT JOIN employees ei ON ei.id = io.installed_by_id
      WHERE DATE_TRUNC('month', COALESCE(io.actual_delivery_at, io.scheduled_delivery, io.created_at)) <= DATE_TRUNC('month', $1::date)
        AND (io.expected_return IS NULL OR DATE_TRUNC('month', io.expected_return) >= DATE_TRUNC('month', $1::date))
      ORDER BY io.id DESC
    `, [monthStart]);

    const expRes = await pool.query(`
      SELECT ex.*, io.order_number, c.name AS customer_name, e.serial_number AS equipment_serial, emp.full_name AS technician_name
      FROM internal_order_expenses ex
      JOIN internal_orders io ON io.id = ex.order_id
      LEFT JOIN customers c ON c.id = io.customer_id
      LEFT JOIN equipment e ON e.id = ex.equipment_id
      LEFT JOIN employees emp ON emp.id = ex.employee_id
      WHERE TO_CHAR(ex.expense_date, 'YYYY-MM') = $1
      ORDER BY ex.expense_date DESC, ex.id DESC
    `, [targetMonth]);

    const expByOrder = {};
    expRes.rows.forEach(ex => {
      if (!expByOrder[ex.order_id]) expByOrder[ex.order_id] = [];
      expByOrder[ex.order_id].push(ex);
    });

    const contracts = ordersRes.rows.map(o => {
      const list = expByOrder[o.id] || [];
      const rentalRev = Number(o.monthly_rate) || 0;
      const billableExtras = list.reduce((s, x) => s + (x.is_billable ? Number(x.billable_total_price) : 0), 0);
      const nonBillablePartsCost = list.reduce((s, x) => s + (!x.is_billable && (x.category === 'Spare Part' || x.category === 'Consumable / Supply') ? Number(x.internal_total_cost) : 0), 0);
      const transportAndLaborCost = list.reduce((s, x) => s + (x.category === 'Transport / Freight' || x.category === 'Labor / Technician' ? Number(x.internal_total_cost) : 0), 0);
      const totalInternalCost = list.reduce((s, x) => s + Number(x.internal_total_cost), 0);
      const grossBilled = +(rentalRev + billableExtras).toFixed(2);
      const netMargin = +(grossBilled - totalInternalCost).toFixed(2);

      return {
        ...o,
        rental_revenue: rentalRev,
        billable_extras: +billableExtras.toFixed(2),
        gross_billed: grossBilled,
        non_billable_parts_cost: +nonBillablePartsCost.toFixed(2),
        transport_labor_cost: +transportAndLaborCost.toFixed(2),
        total_internal_cost: +totalInternalCost.toFixed(2),
        net_margin: netMargin,
        expenses_count: list.length
      };
    });

    const summary = contracts.reduce((acc, c) => {
      acc.total_rental_revenue += c.rental_revenue;
      acc.total_billable_extras += c.billable_extras;
      acc.total_gross_billed += c.gross_billed;
      acc.total_non_billable_parts += c.non_billable_parts_cost;
      acc.total_transport_labor += c.transport_labor_cost;
      acc.total_internal_cost += c.total_internal_cost;
      acc.total_net_margin += c.net_margin;
      return acc;
    }, {
      month: targetMonth,
      total_rental_revenue: 0,
      total_billable_extras: 0,
      total_gross_billed: 0,
      total_non_billable_parts: 0,
      total_transport_labor: 0,
      total_internal_cost: 0,
      total_net_margin: 0
    });

    return { summary, contracts, expenses: expRes.rows };
  }

  app.get('/api/monthly-settlement', guard, async (req, res) => {
    try {
      const data = await computeMonthlySettlement(req.query.month);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/monthly-settlement/pdf', guard, async (req, res) => {
    try {
      const { summary, contracts, expenses } = await computeMonthlySettlement(req.query.month);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Monthly_Settlement_${summary.month}.pdf"`);

      const doc = new PDFDocument({ margin: 45, size: 'LETTER' });
      doc.pipe(res);
      drawPdfHeader(doc, 'MONTHLY SERVICE SETTLEMENT', `LIQ-${summary.month}`, new Date().toISOString().slice(0, 10));

      // KPI Summary Strip
      doc.roundedRect(45, 134, 520, 56, 6).fillAndStroke('#F8FAFC', '#CBD5E1');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#003B6F')
        .text('GROSS BILLED', 58, 144)
        .text('NON-BILLABLE PARTS', 190, 144)
        .text('TRANSPORT & LABOR', 330, 144)
        .text('NET OPERATING MARGIN', 455, 144);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
        .text(`$${summary.total_gross_billed.toFixed(2)}`, 58, 160)
        .fillColor('#DC2626').text(`$${summary.total_non_billable_parts.toFixed(2)}`, 190, 160)
        .fillColor('#D97706').text(`$${summary.total_transport_labor.toFixed(2)}`, 330, 160)
        .fillColor('#15803D').text(`$${summary.total_net_margin.toFixed(2)}`, 455, 160);

      let y = 205;
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#003B6F').text('1. Contract & Equipment Settlement Breakdown', 45, y);
      y += 16;
      doc.rect(45, y, 520, 20).fill('#003B6F');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.2)
        .text('Order #', 50, y + 6, { width: 70 })
        .text('Customer / Equipment', 122, y + 6, { width: 175 })
        .text('Billed', 300, y + 6, { width: 62, align: 'right' })
        .text('Maint. Parts', 365, y + 6, { width: 65, align: 'right' })
        .text('Transp/Labor', 432, y + 6, { width: 65, align: 'right' })
        .text('Net Margin', 500, y + 6, { width: 60, align: 'right' });
      y += 22;

      contracts.forEach((c, idx) => {
        if (y > 680) { doc.addPage(); y = 50; }
        if (idx % 2 === 1) doc.rect(45, y - 2, 520, 22).fill('#F8FAFC');
        doc.fillColor('#1E293B').font('Helvetica').fontSize(8)
          .text(c.order_number, 50, y + 3, { width: 70 })
          .text(`${(c.customer_name || '').slice(0, 24)} (${c.equipment_serial || 'N/A'})`, 122, y + 3, { width: 175 })
          .text(`$${c.gross_billed.toFixed(2)}`, 300, y + 3, { width: 62, align: 'right' })
          .text(`$${c.non_billable_parts_cost.toFixed(2)}`, 365, y + 3, { width: 65, align: 'right' })
          .text(`$${c.transport_labor_cost.toFixed(2)}`, 432, y + 3, { width: 65, align: 'right' })
          .text(`$${c.net_margin.toFixed(2)}`, 500, y + 3, { width: 60, align: 'right' });
        y += 22;
      });

      y += 14;
      if (y > 620) { doc.addPage(); y = 50; }
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#003B6F').text('2. Itemized Parts, Supplies & Maintenance Log', 45, y);
      y += 16;
      doc.rect(45, y, 520, 20).fill('#003B6F');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.2)
        .text('Date', 50, y + 6, { width: 58 })
        .text('Order / Type', 110, y + 6, { width: 110 })
        .text('Part / Resource Description', 222, y + 6, { width: 170 })
        .text('Billing', 395, y + 6, { width: 85 })
        .text('Internal Cost', 485, y + 6, { width: 75, align: 'right' });
      y += 22;

      expenses.forEach((ex, idx) => {
        if (y > 700) { doc.addPage(); y = 50; }
        if (idx % 2 === 1) doc.rect(45, y - 2, 520, 20).fill('#F8FAFC');
        doc.fillColor('#1E293B').font('Helvetica').fontSize(7.8)
          .text(String(ex.expense_date).slice(0, 10), 50, y + 3, { width: 58 })
          .text(`${ex.order_number} (${ex.maintenance_type})`, 110, y + 3, { width: 110 })
          .text(`${ex.description} (x${Number(ex.quantity)})`, 222, y + 3, { width: 170 })
          .text(ex.is_billable ? 'Billable' : 'Non-Billable (Internal)', 395, y + 3, { width: 85 })
          .text(`$${Number(ex.internal_total_cost).toFixed(2)}`, 485, y + 3, { width: 75, align: 'right' });
        y += 20;
      });

      doc.end();
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
};
