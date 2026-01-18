CREATE TABLE IF NOT EXISTS `shareholders` (
  `id` CHAR(36) NOT NULL,
  `companyId` CHAR(36) NOT NULL,
  `personId` CHAR(36) NOT NULL,
  `role` VARCHAR(120) NULL,
  `ownershipPercentage` DECIMAL(5,2) NULL,
  `notes` TEXT NULL,
  `metadata` JSON NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_shareholder_company_person` (`companyId`, `personId`),
  KEY `idx_shareholders_person` (`personId`),
  KEY `idx_shareholders_company_active` (`companyId`, `isActive`),
  CONSTRAINT `fk_shareholders_company` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shareholders_person` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @shareholder_col := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'transactions'
      AND COLUMN_NAME = 'shareholderId'
);

SET @sql_add_shareholder_col := IF(
    @shareholder_col = 0,
    'ALTER TABLE transactions ADD COLUMN shareholderId CHAR(36) NULL AFTER supplierId',
    'SELECT 1'
);

PREPARE stmt_add_shareholder_col FROM @sql_add_shareholder_col;
EXECUTE stmt_add_shareholder_col;
DEALLOCATE PREPARE stmt_add_shareholder_col;

SET @shareholder_idx := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'transactions'
      AND INDEX_NAME = 'idx_transactions_shareholder'
);

SET @sql_add_shareholder_idx := IF(
    @shareholder_idx = 0,
    'CREATE INDEX idx_transactions_shareholder ON transactions (shareholderId)',
    'SELECT 1'
);

PREPARE stmt_add_shareholder_idx FROM @sql_add_shareholder_idx;
EXECUTE stmt_add_shareholder_idx;
DEALLOCATE PREPARE stmt_add_shareholder_idx;

SET @shareholder_fk := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_transactions_shareholder'
);

SET @sql_add_shareholder_fk := IF(
    @shareholder_fk = 0,
    'ALTER TABLE transactions ADD CONSTRAINT fk_transactions_shareholder FOREIGN KEY (shareholderId) REFERENCES shareholders(id) ON DELETE SET NULL',
    'SELECT 1'
);

PREPARE stmt_add_shareholder_fk FROM @sql_add_shareholder_fk;
EXECUTE stmt_add_shareholder_fk;
DEALLOCATE PREPARE stmt_add_shareholder_fk;
