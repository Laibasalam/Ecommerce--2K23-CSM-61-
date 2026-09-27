-- Categories (2 levels: Electronics -> Laptops/Audio/Mobile Accessories)
INSERT INTO CATEGORIES (category_id, name, slug, parent_id, is_active) VALUES
(1, 'Electronics', 'electronics', NULL, TRUE),
(2, 'Laptops', 'laptops', 1, TRUE),
(3, 'Audio', 'audio', 1, TRUE),
(4, 'Mobile Accessories', 'mobile-accessories', 1, TRUE);

-- Products (3 products)
INSERT INTO PRODUCTS (product_id, category_id, name, slug, description, status, specifications) VALUES
(1, 2, 'AeroBook 14', 'aerobook-14', 'Lightweight laptop for students.', 'published', '{"ram": "16GB", "display": "14 inch"}'),
(2, 3, 'SoundCore Mini', 'soundcore-mini', 'Portable Bluetooth speaker.', 'published', '{"battery": "10 hours"}'),
(3, 4, 'PowerCase 5000', 'powercase-5000', 'Power bank 5000mAh.', 'published', '{"capacity": "5000mAh"}');

-- Variants (AeroBook 14 has 4 variants, others have 1)
INSERT INTO VARIANTS (variant_id, product_id, option_values) VALUES
(1, 1, '{"color": "Silver", "storage": "256GB"}'),
(2, 1, '{"color": "Silver", "storage": "512GB"}'),
(3, 1, '{"color": "Black", "storage": "256GB"}'),
(4, 1, '{"color": "Black", "storage": "512GB"}'),
(5, 2, '{"color": "Black"}'),
(6, 3, '{"type": "Power Bank"}');

-- SKUs (6 valid SKUs)
-- Note: "AeroBook 14 Black / 1TB" combination is INTENTIONALLY MISSING. 
-- Hum uska fake zero-stock SKU nahi bana rahe, wo simply exist nahi karti (PDF rule CAT-04).
INSERT INTO SKUS (sku_id, variant_id, sku_code, price_minor_units, stock_quantity, is_active) VALUES
(1, 1, 'AERO14-SLV-256', 8999900, 12, TRUE),
(2, 2, 'AERO14-SLV-512', 9499900, 10, TRUE),
(3, 3, 'AERO14-BLK-256', 8999900, 15, TRUE),
(4, 4, 'AERO14-BLK-512', 9499900, 9, TRUE),
(5, 5, 'SOUNDCORE-BLK', 499900, 25, TRUE),
(6, 6, 'POWERCASE-5000', 259900, 20, TRUE);

-- Reset sequences so future inserts don't conflict
SELECT setval('categories_category_id_seq', 100);
SELECT setval('products_product_id_seq', 100);
SELECT setval('variants_variant_id_seq', 100);
SELECT setval('skus_sku_id_seq', 100);
