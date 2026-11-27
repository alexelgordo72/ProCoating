async function autoCreateRentalContract(pool, opts) {
  try {
    const {
      sourceLabel = 'Work Order',
      refNumber = '',
      customerId = null,
      equipmentId = null,
      startDate = null,
      endDate = null,
      monthlyRate = 0,
      notesExtra = ''
    } = opts || {};

    if (!customerId && !equipmentId) return null;

    const colsRes = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'rentals'
    `);
    if (!colsRes.rows.length) return null;
    const cols = Object.fromEntries(colsRes.rows.map(r => [r.column_name, r]));

    if (refNumber && 'notes' in cols) {
      const dupRef = await pool.query(`SELECT id FROM rentals WHERE notes ILIKE $1 LIMIT 1`, [`%${refNumber}%`]);
      if (dupRef.rows.length) return dupRef.rows[0];
    }

    const startObj = startDate ? new Date(startDate) : new Date();
    const validStart = isNaN(startObj.getTime()) ? new Date() : startObj;
    const endObj = endDate ? new Date(endDate) : new Date(validStart.getTime() + 30 * 86400000);
    const validEnd = isNaN(endObj.getTime()) ? new Date(validStart.getTime() + 30 * 86400000) : endObj;

    const startIso = validStart.toISOString().slice(0, 10);
    const endIso = validEnd.toISOString().slice(0, 10);
    const rntNum = `RNT-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000))}`;
    const rateNum = Number(monthlyRate) || 0;

    const data = {};
    if ('rental_number' in cols) data.rental_number = rntNum;
    if ('customer_id' in cols && customerId) data.customer_id = Number(customerId);
    if ('equipment_id' in cols && equipmentId) data.equipment_id = Number(equipmentId);
    if ('start_date' in cols) data.start_date = startIso;
    if ('end_date' in cols) data.end_date = endIso;
    if ('monthly_rate' in cols) data.monthly_rate = rateNum;
    if ('rate' in cols) data.rate = rateNum;
    if ('daily_rate' in cols) data.daily_rate = Number((rateNum / 30).toFixed(2));
    if ('total_amount' in cols) data.total_amount = rateNum;
    if ('amount' in cols) data.amount = rateNum;
    if ('status' in cols) data.status = 'Active';

    const traceNote = `Auto-created from ${sourceLabel} ${refNumber}${notesExtra ? ' | ' + notesExtra : ''}`.trim();
    if ('notes' in cols) data.notes = traceNote;

    for (const [cname, info] of Object.entries(cols)) {
      if (!(cname in data) && info.is_nullable === 'NO' && !info.column_default && cname !== 'id') {
        if (info.data_type.includes('int') || info.data_type.includes('numeric') || info.data_type.includes('double')) data[cname] = 0;
        else if (info.data_type.includes('date') || info.data_type.includes('time')) data[cname] = startIso;
        else data[cname] = 'N/A';
      }
    }

    const keys = Object.keys(data);
    const vals = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const ins = await pool.query(`INSERT INTO rentals (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, vals);
    return ins.rows[0] || null;
  } catch (err) {
    console.warn('Auto-rental creation skipped:', err.message);
    return null;
  }
}

function registerAutoRentalHook(app, poolRef) {
  const getPool = () => (typeof poolRef === 'function' ? poolRef() : poolRef);

  app.use((req, res, next) => {
    const method = (req.method || '').toUpperCase();
    const cleanPath = String(req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '');
    if (method !== 'POST') return next();

    const isWorkOrder = /^\/api\/work[-_]orders$/i.test(cleanPath);
    const isInternalOrder = /^\/api\/internal[-_]orders$/i.test(cleanPath);
    if (!isWorkOrder && !isInternalOrder) return next();

    const origJson = res.json.bind(res);
    res.json = function (payload) {
      if (res.statusCode >= 200 && res.statusCode < 300 && payload && typeof payload === 'object') {
        const rec = payload.order || payload.work_order || payload.workOrder || payload.data || payload;
        const body = req.body || {};
        const refNumber = isInternalOrder
          ? (rec.order_number || (rec.id ? `IO-${rec.id}` : ''))
          : (rec.wo_number || rec.work_order_number || rec.order_number || (rec.id ? `WO-${rec.id}` : ''));

        autoCreateRentalContract(getPool(), {
          sourceLabel: isInternalOrder ? 'Dispatch & Work Order' : 'Work Order',
          refNumber,
          customerId: rec.customer_id || body.customer_id || null,
          equipmentId: rec.equipment_id || body.equipment_id || null,
          startDate: rec.delivery_date || rec.scheduled_date || rec.start_date || body.delivery_date || body.scheduled_date || body.start_date || null,
          endDate: rec.due_date || rec.end_date || body.due_date || body.end_date || null,
          monthlyRate: rec.monthly_rate || rec.rate || body.monthly_rate || body.rate || 0,
          notesExtra: rec.title || rec.description || rec.delivery_address || body.title || body.description || ''
        })
          .then(() => origJson(payload))
          .catch(() => origJson(payload));
        return res;
      }
      return origJson(payload);
    };

    next();
  });
}

module.exports = { autoCreateRentalContract, registerAutoRentalHook };
