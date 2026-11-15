CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shops (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_name VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    shop_id INT UNIQUE NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upi_id VARCHAR(100) DEFAULT '',
    upi_pin VARCHAR(50) DEFAULT '',
    phone VARCHAR(20) DEFAULT '',
    shop_name VARCHAR(100) DEFAULT '',
    shop_address TEXT,
    gstin VARCHAR(50) DEFAULT '',
    theme VARCHAR(20) DEFAULT 'dark',
    language VARCHAR(20) DEFAULT 'hi',
    low_stock_alert BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'unit',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    idempotency_key VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    low_stock_limit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_logs (
    id SERIAL PRIMARY KEY,
    shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_change DECIMAL(10,2) NOT NULL,
    reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS global_market_prices (
    id SERIAL PRIMARY KEY,
    item_key VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'unit',
    source VARCHAR(50) DEFAULT 'benchmark',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_shop_name ON customers(shop_id, name);
CREATE INDEX IF NOT EXISTS idx_products_shop_name ON products(shop_id, name);
CREATE INDEX IF NOT EXISTS idx_tx_cust_date ON transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_shop_date ON transactions(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_shop_cat ON suppliers(shop_id, category);
CREATE INDEX IF NOT EXISTS idx_global_item_key ON global_market_prices(item_key);

INSERT INTO global_market_prices (item_key, display_name, price, unit, source) VALUES
('atta', 'Aashirvaad Atta 1kg', 42.00, 'kg', 'benchmark'),
('wheat', 'Sharbati Wheat 1kg', 38.00, 'kg', 'benchmark'),
('chawal', 'Basmati Rice 1kg', 65.00, 'kg', 'benchmark'),
('rice', 'Kolam Rice 1kg', 48.00, 'kg', 'benchmark'),
('doodh', 'Amul Taaza Milk 500ml', 27.00, 'packet', 'benchmark'),
('milk', 'Amul Gold Milk 500ml', 33.00, 'packet', 'benchmark'),
('paneer', 'Amul Fresh Paneer 200g', 92.00, 'packet', 'benchmark'),
('dahi', 'Mother Dairy Curd 400g', 35.00, 'packet', 'benchmark'),
('cheeni', 'Refined Sugar 1kg', 44.00, 'kg', 'benchmark'),
('sugar', 'Madhur Pure Sugar 1kg', 46.00, 'kg', 'benchmark'),
('chai', 'Tata Tea Premium 250g', 120.00, 'packet', 'benchmark'),
('tea', 'Red Label Tea 250g', 130.00, 'packet', 'benchmark'),
('tel', 'Fortune Mustard Oil 1L', 145.00, 'litre', 'benchmark'),
('oil', 'Fortune Refined Sunflower Oil 1L', 135.00, 'litre', 'benchmark'),
('ghee', 'Amul Pure Ghee 1L', 580.00, 'litre', 'benchmark'),
('namak', 'Tata Salt 1kg', 28.00, 'kg', 'benchmark'),
('salt', 'Tata Salt 1kg', 28.00, 'kg', 'benchmark'),
('dal', 'Tata Sampann Toor Dal 1kg', 165.00, 'kg', 'benchmark'),
('maggi', 'Nestle Maggi 2-Minute 70g', 14.00, 'packet', 'benchmark'),
('biscuit', 'Parle-G 100g', 10.00, 'packet', 'benchmark'),
('bread', 'Britannia White Bread 400g', 45.00, 'packet', 'benchmark'),
('butter', 'Amul Butter 100g', 56.00, 'packet', 'benchmark'),
('pyaz', 'Onion 1kg', 35.00, 'kg', 'benchmark'),
('aloo', 'Potato 1kg', 25.00, 'kg', 'benchmark'),
('tamatar', 'Tomato 1kg', 40.00, 'kg', 'benchmark'),
('adrak', 'Ginger 250g', 30.00, 'packet', 'benchmark'),
('haldi', 'Catch Turmeric Powder 100g', 34.00, 'packet', 'benchmark'),
('mirchi', 'Everest Red Chilli Powder 100g', 48.00, 'packet', 'benchmark'),
('dhaniya', 'Catch Coriander Powder 100g', 36.00, 'packet', 'benchmark'),
('garam_masala', 'MDH Garam Masala 100g', 95.00, 'packet', 'benchmark')
ON CONFLICT (item_key) DO NOTHING;
