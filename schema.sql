-- Ed Weatherhead Jewellery — draft MySQL schema
-- Targets MySQL 5.7+ / MariaDB 10.2+ (InnoDB, utf8mb4).
--
-- Conventions:
--   * Every connection should run:  SET time_zone = '+00:00';
--     All DATETIME values are UTC, and all hold-expiry comparisons use the
--     database's own clock (UTC_TIMESTAMP()), never the function's clock.
--   * Money is DECIMAL(10,2) in AUD. Never FLOAT.
--   * Holds live on the products table (one-of-a-kind pieces => at most one
--     holder per product). If you ever sell items with stock > 1, move holds
--     to their own table — that's why there is deliberately no `stock` column.

-- ---------------------------------------------------------------------------
-- orders: one row per checkout attempt / transaction (the "header").
-- Created as 'pending' when a hold is placed. Created BEFORE products so
-- products can reference it.
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference          VARCHAR(20)  NOT NULL,            -- e.g. EWJ-K7Q2MX (generate for card AND PayID)
  method             ENUM('card','payid') NOT NULL,
  status             ENUM('pending','paid','expired','cancelled','refunded') NOT NULL DEFAULT 'pending',
  holder_id          VARCHAR(64)  NULL,                -- cartSessionId from the browser tab; lets a retry find/cancel its own earlier attempt

  customer_name      VARCHAR(255) NULL,                -- NULL until known (card orders: filled from Stripe once paid)
  customer_email     VARCHAR(255) NULL,
  customer_phone     VARCHAR(50)  NULL,

  ship_address1      VARCHAR(255) NULL,
  ship_address2      VARCHAR(255) NULL,
  ship_suburb        VARCHAR(100) NULL,
  ship_state         VARCHAR(50)  NULL,
  ship_postcode      VARCHAR(20)  NULL,
  ship_country       VARCHAR(100) NULL,

  billing_name       VARCHAR(255) NULL,                -- all billing_* NULL = same as shipping
  billing_address1   VARCHAR(255) NULL,
  billing_address2   VARCHAR(255) NULL,
  billing_suburb     VARCHAR(100) NULL,
  billing_state      VARCHAR(50)  NULL,
  billing_postcode   VARCHAR(20)  NULL,
  billing_country    VARCHAR(100) NULL,

  currency           CHAR(3)      NOT NULL DEFAULT 'AUD',
  subtotal           DECIMAL(10,2) NOT NULL,
  shipping_cost      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total              DECIMAL(10,2) NOT NULL,

  stripe_session_id  VARCHAR(255) NULL,                -- card orders only
  tracking_number    VARCHAR(100) NULL,
  notes              TEXT         NULL,

  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at            DATETIME NULL,
  shipped_at         DATETIME NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_reference (reference),
  UNIQUE KEY uq_orders_stripe_session (stripe_session_id),  -- many NULLs allowed (PayID orders)
  KEY idx_orders_status (status),
  KEY idx_orders_holder (holder_id, status),
  KEY idx_orders_email (customer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- products: replaces src/data/products.js
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  refnumber          VARCHAR(10)  NOT NULL,            -- string, keeps leading zeros ("001"). Never reuse or renumber.
  slug               VARCHAR(100) NOT NULL,            -- was `name`: used in /product/:slug URLs and /gallery/{slug}_01.jpg
  title              VARCHAR(255) NOT NULL,
  descr              TEXT         NULL,                -- may contain "\n\n" paragraph breaks
  price              DECIMAL(10,2) NULL,               -- NULL = not available for direct purchase (was "")
  metal              JSON         NULL,                -- e.g. ["silver"]
  stone              JSON         NULL,                -- e.g. ["pearl","garnet"]
  type               VARCHAR(50)  NULL,                -- charm, pendant, necklace, ...
  photo_count        TINYINT UNSIGNED NOT NULL DEFAULT 0,   -- was `pics`

  sold               TINYINT(1) NOT NULL DEFAULT 0,
  archived           TINYINT(1) NOT NULL DEFAULT 0,    -- independent of sold (a piece can be both)
  commission         TINYINT(1) NOT NULL DEFAULT 0,
  featured           TINYINT(1) NOT NULL DEFAULT 0,    -- replaces Home.jsx's activeProducts().slice(13, 16)
  sort_order         INT NOT NULL DEFAULT 0,

  -- Permanent sale record. sold_order_id is NULL for sales made outside the
  -- site (in person, Etsy, etc.) that you mark as sold by hand.
  sold_at            DATETIME NULL,
  sold_order_id      INT UNSIGNED NULL,

  -- Temporary hold (replaces the Netlify Blobs inventory-holds store).
  reserved_by        VARCHAR(64) NULL,                 -- holder_id / cartSessionId
  reserved_until     DATETIME NULL,
  reserved_order_id  INT UNSIGNED NULL,

  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_products_refnumber (refnumber),
  UNIQUE KEY uq_products_slug (slug),
  KEY idx_products_listing (archived, sold, sort_order),
  CONSTRAINT fk_products_sold_order     FOREIGN KEY (sold_order_id)     REFERENCES orders (id) ON DELETE SET NULL,
  CONSTRAINT fk_products_reserved_order FOREIGN KEY (reserved_order_id) REFERENCES orders (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- order_items: one row per piece in an order (the "lines").
-- unit_price and title are SNAPSHOTS of what the customer actually bought.
-- ---------------------------------------------------------------------------
CREATE TABLE order_items (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  title       VARCHAR(255) NOT NULL,
  quantity    SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_order_product (order_id, product_id),
  KEY idx_order_items_product (product_id),
  CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders (id)   ON DELETE RESTRICT,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===========================================================================
-- REFERENCE QUERIES (not executed by this file — for the API layer).
-- Use parameterised queries only; every `?` below comes from untrusted input
-- or from your own code, never string-concatenated.
-- ===========================================================================

-- 1. Public product list (whitelist columns — never SELECT * to the browser,
--    or reserved_by leaks). A product is "available" when:
--    sold = 0 AND (reserved_until IS NULL OR reserved_until < UTC_TIMESTAMP())
--
-- SELECT id, refnumber, slug, title, descr, price, metal, stone, type,
--        photo_count, sold, archived, commission, featured
-- FROM products ORDER BY sort_order, id;

-- 2. Reserve ONE product (run once per cart item inside a single transaction;
--    if ANY statement affects 0 rows, ROLLBACK and report that item as
--    unavailable). Succeeds only if the product is unsold, unarchived, and
--    either unheld, held-but-expired, or already held by this same holder.
--    reserved_until/reserved_order_id always change, so affected rows is 1
--    on success.
--
-- UPDATE products
--    SET reserved_by       = :holder_id,
--        reserved_until    = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE),  -- 3 days for PayID
--        reserved_order_id = :order_id
--  WHERE refnumber = :refnumber
--    AND sold = 0 AND archived = 0
--    AND (reserved_until IS NULL
--         OR reserved_until < UTC_TIMESTAMP()
--         OR reserved_by = :holder_id);

-- 3. On a retry by the same holder, cancel their earlier pending attempt(s)
--    (and, for card orders, expire the old Stripe session using its id).
--
-- UPDATE orders SET status = 'cancelled'
--  WHERE holder_id = :holder_id AND status = 'pending' AND id <> :new_order_id;

-- 4. Payment confirmed (Stripe webhook, or your PayID "confirm" action).
--    Run in one transaction. If the first UPDATE affects 0 rows the event was
--    already processed (Stripe retries webhooks) — stop, do nothing more.
--    If the order was no longer 'pending' (e.g. the hold expired and someone
--    else took the piece) this needs manual handling / a refund.
--
-- UPDATE orders
--    SET status = 'paid', paid_at = UTC_TIMESTAMP()
--  WHERE stripe_session_id = :session_id AND status = 'pending';
--
-- UPDATE products p
--   JOIN order_items oi ON oi.product_id = p.id
--    SET p.sold = 1, p.sold_at = UTC_TIMESTAMP(), p.sold_order_id = oi.order_id,
--        p.reserved_by = NULL, p.reserved_until = NULL, p.reserved_order_id = NULL
--  WHERE oi.order_id = :order_id AND p.sold = 0;

-- 5. Release holds early (e.g. Stripe session creation failed).
--
-- UPDATE products
--    SET reserved_by = NULL, reserved_until = NULL, reserved_order_id = NULL
--  WHERE reserved_order_id = :order_id;
-- UPDATE orders SET status = 'cancelled' WHERE id = :order_id;
