-- init.sql
-- Auto-runs when the MySQL container starts for the first time.
-- Recreates the fashion_db schema so you don't need to import from XAMPP manually.

CREATE DATABASE IF NOT EXISTS fashion_db;
USE fashion_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Closet items table
CREATE TABLE IF NOT EXISTS closet_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    category_type VARCHAR(50) NOT NULL,   -- 'pieces' or 'whole'
    piece_type VARCHAR(50),               -- 'hat', 'top', 'bottom', 'accessories', 'footwear'
    vibe_genre VARCHAR(100),              -- 'Casual', 'Y2K', 'Sporty', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Saved outfits push-down stack (uncapped, UI shows latest 6)
-- Each slot FK references a closet_items row; NULL means that slot is empty.
CREATE TABLE IF NOT EXISTS saved_outfits (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT          NOT NULL,
    label          VARCHAR(120) NOT NULL DEFAULT 'New Fit',
    hat_id         INT          DEFAULT NULL,
    top_id         INT          DEFAULT NULL,
    bottom_id      INT          DEFAULT NULL,
    accessories_id INT          DEFAULT NULL,
    footwear_id    INT          DEFAULT NULL,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)        REFERENCES users(id)        ON DELETE CASCADE,
    FOREIGN KEY (hat_id)         REFERENCES closet_items(id) ON DELETE SET NULL,
    FOREIGN KEY (top_id)         REFERENCES closet_items(id) ON DELETE SET NULL,
    FOREIGN KEY (bottom_id)      REFERENCES closet_items(id) ON DELETE SET NULL,
    FOREIGN KEY (accessories_id) REFERENCES closet_items(id) ON DELETE SET NULL,
    FOREIGN KEY (footwear_id)    REFERENCES closet_items(id) ON DELETE SET NULL
);