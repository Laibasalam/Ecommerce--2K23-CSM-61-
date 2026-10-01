const { test } = require('node:test');
const assert = require('node:assert');

// --- Mock functions to test business rules without needing a real database ---

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

// --- TESTS ---

test('CAT-06: Admin authorization allows admin role', () => {
    assert.strictEqual(checkAdminRole('admin'), true);
});

test('CAT-06: Admin authorization rejects normal user', () => {
    assert.throws(
        () => checkAdminRole('user'),
        { message: 'FORBIDDEN: Admin role required' }
    );
});

test('CAT-05: Data integrity rejects negative stock', () => {
    assert.throws(
        () => validateStock(-5),
        { message: 'VALIDATION_ERROR: Stock cannot be negative' }
    );
});

test('CAT-05: Data integrity allows zero or positive stock', () => {
    assert.strictEqual(validateStock(0), true);
    assert.strictEqual(validateStock(10), true);
});

test('CAT-03: Duplicate SKU code is rejected', () => {
    const dbSkus = ['AERO14-SLV-256', 'SOUNDCORE-BLK'];
    assert.throws(
        () => checkUniqueSku(dbSkus, 'AERO14-SLV-256'),
        { message: 'DUPLICATE_SKU: SKU code already exists' }
    );
});

test('CAT-03: New unique SKU code is accepted', () => {
    const dbSkus = ['AERO14-SLV-256'];
    assert.strictEqual(checkUniqueSku(dbSkus, 'AERO14-BLK-512'), true);
});
