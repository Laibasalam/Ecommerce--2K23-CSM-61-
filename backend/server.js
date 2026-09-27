const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/techbazar' 
});
const JWT_SECRET = process.env.JWT_SECRET || 'techbazar_super_secret_key';

// --- AUTH MIDDLEWARE (CAT-06) ---
function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Token is required' } });
    }
    try {
        const token = authHeader.split(' ')[1];
        const user = jwt.verify(token, JWT_SECRET);
        if (user.role !== 'admin') {
            return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin role required' } });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } });
    }
}

// --- CATEGORIES ROUTES (CAT-01) ---
app.post('/api/v1/admin/categories', requireAdmin, async (req, res) => {
    const { name, slug, parent_id, is_active } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO CATEGORIES (name, slug, parent_id, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, slug, parent_id || null, is_active !== false]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Duplicate slug' });
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/v1/admin/categories', requireAdmin, async (req, res) => {
    const result = await pool.query('SELECT * FROM CATEGORIES ORDER BY category_id');
    res.json(result.rows);
});

// --- PRODUCTS ROUTES (CAT-02) ---
app.post('/api/v1/admin/products', requireAdmin, async (req, res) => {
    const { name, slug, description, status, category_id, specifications } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO PRODUCTS (name, slug, description, status, category_id, specifications) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, slug, description, status || 'draft', category_id, JSON.stringify(specifications || {})]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Duplicate product slug' });
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/v1/admin/products', requireAdmin, async (req, res) => {
    const result = await pool.query('SELECT * FROM PRODUCTS ORDER BY product_id DESC');
    res.json(result.rows);
});

app.patch('/api/v1/admin/products/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, slug, description, status, category_id } = req.body;
    try {
        const result = await pool.query(
            'UPDATE PRODUCTS SET name=COALESCE($1,name), slug=COALESCE($2,slug), description=COALESCE($3,description), status=COALESCE($4,status), category_id=COALESCE($5,category_id), updated_at=CURRENT_TIMESTAMP WHERE product_id=$6 RETURNING *',
            [name, slug, description, status, category_id, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Duplicate product slug' });
        res.status(400).json({ error: err.message });
    }
});

// --- SKUS & VARIANTS ROUTES (CAT-03, CAT-04) ---
app.post('/api/v1/admin/products/:id/skus', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { variant_options, sku_code, price_minor_units, stock_quantity, is_active } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Find or create variant
        let variantRes = await client.query(
            'SELECT variant_id FROM VARIANTS WHERE product_id=$1 AND option_values=$2',
            [id, JSON.stringify(variant_options || {})]
        );
        
        let variant_id;
        if (variantRes.rows.length === 0) {
            const newVar = await client.query(
                'INSERT INTO VARIANTS (product_id, option_values) VALUES ($1, $2) RETURNING variant_id',
                [id, JSON.stringify(variant_options || {})]
            );
            variant_id = newVar.rows[0].variant_id;
        } else {
            variant_id = variantRes.rows[0].variant_id;
        }

        // Create SKU
        const skuRes = await client.query(
            'INSERT INTO SKUS (variant_id, sku_code, price_minor_units, stock_quantity, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [variant_id, sku_code, price_minor_units, stock_quantity, is_active !== false]
        );
        
        await client.query('COMMIT');
        res.status(201).json(skuRes.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') return res.status(409).json({ error: 'Duplicate SKU code' });
        if (err.code === '23514') return res.status(400).json({ error: 'Price or stock cannot be negative' });
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.patch('/api/v1/admin/skus/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { price_minor_units, stock_quantity, is_active } = req.body;
    try {
        const result = await pool.query(
            'UPDATE SKUS SET price_minor_units=COALESCE($1,price_minor_units), stock_quantity=COALESCE($2,stock_quantity), is_active=COALESCE($3,is_active), updated_at=CURRENT_TIMESTAMP WHERE sku_id=$4 RETURNING *',
            [price_minor_units, stock_quantity, is_active, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'SKU not found' });
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23514') return res.status(400).json({ error: 'Stock or price cannot be negative' });
        res.status(400).json({ error: err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`TechBazar API running on port ${PORT}`));

module.exports = app;
