-- Sprint 2: Catalog Data Foundation
-- Migration: 002_catalog_foundation.sql
-- Database: PostgreSQL

-- ---------- CATEGORIES ----------
CREATE TABLE IF NOT EXISTS CATEGORIES (
    category_id   SERIAL PRIMARY KEY,
    parent_id     INTEGER NULL,
    name          VARCHAR(100)  NOT NULL,
    slug          VARCHAR(120)  NOT NULL,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_categories_slug UNIQUE (slug),
    CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES CATEGORIES (category_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON CATEGORIES (parent_id);

-- Category khud apna ancestor nahi ban sakti (CAT-01)
CREATE OR REPLACE FUNCTION prevent_category_cycle() RETURNS trigger AS $$
DECLARE
    cur   INTEGER;
    depth INTEGER := 0;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;
    IF NEW.parent_id = NEW.category_id THEN
        RAISE EXCEPTION 'category cannot be its own parent';
    END IF;
    cur := NEW.parent_id;
    WHILE cur IS NOT NULL AND depth < 50 LOOP
        SELECT parent_id INTO cur FROM CATEGORIES WHERE category_id = cur;
        IF cur = NEW.category_id THEN
            RAISE EXCEPTION 'category cycle detected';
        END IF;
        depth := depth + 1;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_category_cycle ON CATEGORIES;
CREATE TRIGGER trg_category_cycle
    BEFORE INSERT OR UPDATE ON CATEGORIES
    FOR EACH ROW EXECUTE FUNCTION prevent_category_cycle();

-- ---------- PRODUCTS ----------
CREATE TABLE IF NOT EXISTS PRODUCTS (
    product_id     SERIAL PRIMARY KEY,
    category_id    INTEGER       NOT NULL,
    name           VARCHAR(255)  NOT NULL,
    slug           VARCHAR(255)  NOT NULL,
    description    TEXT,
    status         VARCHAR(20)   NOT NULL DEFAULT 'draft',
    specifications JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_products_slug UNIQUE (slug),
    CONSTRAINT chk_products_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT chk_products_specifications_object CHECK (jsonb_typeof(specifications) = 'object'),
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES CATEGORIES (category_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON PRODUCTS (category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON PRODUCTS (status);

-- ---------- VARIANTS ----------
CREATE TABLE IF NOT EXISTS VARIANTS (
    variant_id    SERIAL PRIMARY KEY,
    product_id    INTEGER      NOT NULL,
    option_values JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_variants_option_values_object CHECK (jsonb_typeof(option_values) = 'object'),
    CONSTRAINT fk_variants_product
        FOREIGN KEY (product_id) REFERENCES PRODUCTS (product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON VARIANTS (product_id);

-- ---------- SKUS ----------
CREATE TABLE IF NOT EXISTS SKUS (
    sku_id            SERIAL PRIMARY KEY,
    variant_id        INTEGER      NOT NULL,
    sku_code          VARCHAR(100) NOT NULL,
    price_minor_units BIGINT       NOT NULL,
    stock_quantity    INTEGER      NOT NULL DEFAULT 0,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_skus_code UNIQUE (sku_code),
    CONSTRAINT chk_skus_price_nonnegative CHECK (price_minor_units >= 0),
    CONSTRAINT chk_skus_stock_nonnegative CHECK (stock_quantity >= 0),
    CONSTRAINT fk_skus_variant
        FOREIGN KEY (variant_id) REFERENCES VARIANTS (variant_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_skus_variant_id ON SKUS (variant_id);
CREATE INDEX IF NOT EXISTS idx_skus_code ON SKUS (sku_code);

-- ---------- ASSETS ----------
CREATE TABLE IF NOT EXISTS ASSETS (
    asset_id    SERIAL PRIMARY KEY,
    product_id  INTEGER      NULL,
    variant_id  INTEGER      NULL,
    storage_key VARCHAR(255) NOT NULL,
    role        VARCHAR(50)  NOT NULL DEFAULT 'gallery',
    alt_text    VARCHAR(255),
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assets_product
        FOREIGN KEY (product_id) REFERENCES PRODUCTS (product_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_assets_variant
        FOREIGN KEY (variant_id) REFERENCES VARIANTS (variant_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_assets_owner CHECK (product_id IS NOT NULL OR variant_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_assets_product_id ON ASSETS (product_id);
CREATE INDEX IF NOT EXISTS idx_assets_variant_id ON ASSETS (variant_id);
