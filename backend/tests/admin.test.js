const { test } = require('node:test');
const assert = require('node:assert');

// --- Mock business-rule functions (mirror backend/server.js rules) ---

function checkAdminRole(role) {
    if (role !== 'admin') throw new Error('FORBIDDEN: Admin role required');
    return true;
}

function validateStock(stockQuantity) {
    if (stockQuantity < 0) throw new Error('VALIDATION_ERROR: Stock cannot be negative');
    return true;
}

function checkUniqueSku(existingSkus, newSku) {
    if (existingSkus.includes(newSku)) throw new Error('DUPLICATE_SKU: SKU code already exists');
    return true;
}

function checkUniqueSlug(existingSlugs, newSlug) {
    if (existingSlugs.includes(newSlug)) throw new Error('DUPLICATE_SLUG: Slug already exists');
    return true;
}

function validateProductRequiredFields(product) {
    const missing = [];
    if (!product.name) missing.push('name');
    if (!product.slug) missing.push('slug');
    if (!product.category_id) missing.push('category_id');
    if (missing.length) throw new Error('VALIDATION_ERROR: missing ' + missing.join(', '));
    return true;
}

function validateSkuRequiredFields(sku) {
    const missing = [];
    if (!sku.sku_code) missing.push('sku_code');
    if (sku.price_minor_units === undefined || sku.price_minor_units === null) missing.push('price_minor_units');
    if (sku.stock_quantity === undefined || sku.stock_quantity === null) missing.push('stock_quantity');
    if (missing.length) throw new Error('VALIDATION_ERROR: missing ' + missing.join(', '));
    return true;
}

function checkCategoryCycle(ancestorChain, categoryId) {
    if (ancestorChain.includes(categoryId)) throw new Error('CATEGORY_CYCLE: category cannot be its own ancestor');
    return true;
}

function findVariant(variants, options) {
    return variants.find(v => JSON.stringify(v.option_values) === JSON.stringify(options)) || null;
}

// --- TESTS ---

test('CAT-06: admin role is allowed', () => {
    assert.strictEqual(checkAdminRole('admin'), true);
});

test('CAT-06: non-admin is rejected', () => {
    assert.throws(() => checkAdminRole('user'), { message: 'FORBIDDEN: Admin role required' });
});

test('CAT-02: product creation accepts required fields', () => {
    assert.strictEqual(validateProductRequiredFields({ name: 'AeroBook 14', slug: 'aerobook-14', category_id: 2 }), true);
});

test('CAT-02: product creation rejects missing slug', () => {
    assert.throws(() => validateProductRequiredFields({ name: 'AeroBook 14', category_id: 2 }), /missing slug/);
});

test('CAT-02: duplicate slug is rejected', () => {
    assert.throws(() => checkUniqueSlug(['aerobook-14'], 'aerobook-14'), { message: 'DUPLICATE_SLUG: Slug already exists' });
});

test('CAT-03: SKU creation accepts required fields', () => {
    assert.strictEqual(validateSkuRequiredFields({ sku_code: 'AERO14-SLV-256', price_minor_units: 8999900, stock_quantity: 12 }), true);
});

test('CAT-03: SKU creation rejects missing sku_code', () => {
    assert.throws(() => validateSkuRequiredFields({ price_minor_units: 100, stock_quantity: 1 }), /missing sku_code/);
});

test('CAT-03: duplicate SKU code is rejected', () => {
    assert.throws(() => checkUniqueSku(['AERO14-SLV-256'], 'AERO14-SLV-256'), { message: 'DUPLICATE_SKU: SKU code already exists' });
});

test('CAT-05: negative stock is rejected', () => {
    assert.throws(() => validateStock(-5), { message: 'VALIDATION_ERROR: Stock cannot be negative' });
});

test('CAT-05: zero stock is allowed (out-of-stock representation)', () => {
    assert.strictEqual(validateStock(0), true);
});

test('CAT-01: category cycle is prevented', () => {
    assert.throws(() => checkCategoryCycle([1, 2], 1), { message: 'CATEGORY_CYCLE: category cannot be its own ancestor' });
});

test('CAT-01: valid category chain is accepted', () => {
    assert.strictEqual(checkCategoryCycle([1], 3), true);
});

test('CAT-04: existing variant combination is found', () => {
    const variants = [{ option_values: { color: 'Silver', storage: '256GB' } }];
    assert.ok(findVariant(variants, { color: 'Silver', storage: '256GB' }));
});

test('CAT-04: missing combination is absent, not a fake zero-stock SKU', () => {
    const variants = [{ option_values: { color: 'Silver', storage: '256GB' } }];
    assert.strictEqual(findVariant(variants, { color: 'Black', storage: '1TB' }), null);
});
