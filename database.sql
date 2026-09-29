CREATE DATABASE IF NOT EXISTS inventory_desk
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE inventory_desk;

CREATE TABLE IF NOT EXISTS inventory_records (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL,
  location VARCHAR(150) NOT NULL,
  owner VARCHAR(120) NOT NULL,
  value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  status ENUM('Active', 'Maintenance', 'Archived') NOT NULL DEFAULT 'Active',
  notes TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO inventory_records (name, category, location, owner, value, status, notes)
SELECT 'MacBook Pro 14-inch', 'Technology', 'Studio 2B', 'Maya Chen', 2199.00, 'Active', 'Primary design workstation.'
WHERE NOT EXISTS (SELECT 1 FROM inventory_records WHERE name = 'MacBook Pro 14-inch');

INSERT INTO inventory_records (name, category, location, owner, value, status, notes)
SELECT 'Herman Miller Aeron', 'Furniture', 'Studio 2B', 'Jon Bell', 1280.00, 'Active', 'Size B, graphite finish.'
WHERE NOT EXISTS (SELECT 1 FROM inventory_records WHERE name = 'Herman Miller Aeron');

INSERT INTO inventory_records (name, category, location, owner, value, status, notes)
SELECT 'Sony A7 IV Camera', 'Technology', 'Media Lab', 'Nora Singh', 2498.00, 'Maintenance', 'Sensor cleaning scheduled.'
WHERE NOT EXISTS (SELECT 1 FROM inventory_records WHERE name = 'Sony A7 IV Camera');

INSERT INTO inventory_records (name, category, location, owner, value, status, notes)
SELECT 'Cargo e-bike', 'Vehicles', 'Loading bay', 'Facilities', 3400.00, 'Active', 'Shared delivery vehicle.'
WHERE NOT EXISTS (SELECT 1 FROM inventory_records WHERE name = 'Cargo e-bike');

INSERT INTO inventory_records (name, category, location, owner, value, status, notes)
SELECT 'Meeting table, oak', 'Furniture', 'Room 104', 'Operations', 890.00, 'Archived', 'Held for refurbishment.'
WHERE NOT EXISTS (SELECT 1 FROM inventory_records WHERE name = 'Meeting table, oak');