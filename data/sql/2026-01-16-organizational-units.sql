-- 2026-01-16: Organizational units for employees and operations

START TRANSACTION;

CREATE TABLE IF NOT EXISTS `organizational_units` (
  `id` CHAR(36) NOT NULL,
  `companyId` CHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `unitType` ENUM('HEADQUARTERS','STORE','BACKOFFICE','OPERATIONS','SALES','OTHER') NOT NULL DEFAULT 'OTHER',
  `parentId` CHAR(36) NULL,
  `branchId` CHAR(36) NULL,
  `costCenterId` CHAR(36) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `metadata` JSON NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_organizational_units_company_code` (`companyId`, `code`),
  KEY `idx_organizational_units_company` (`companyId`),
  KEY `idx_organizational_units_parent` (`parentId`),
  KEY `idx_organizational_units_branch` (`branchId`),
  KEY `idx_organizational_units_cost_center` (`costCenterId`),
  CONSTRAINT `fk_organizational_units_company` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_organizational_units_parent` FOREIGN KEY (`parentId`) REFERENCES `organizational_units`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_organizational_units_branch` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_organizational_units_costcenter` FOREIGN KEY (`costCenterId`) REFERENCES `cost_centers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @has_org_unit_column = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'employees'
    AND COLUMN_NAME = 'organizationalUnitId'
);

SET @add_org_unit_column_sql = IF(
  @has_org_unit_column = 0,
  'ALTER TABLE `employees` ADD COLUMN `organizationalUnitId` CHAR(36) NULL AFTER `costCenterId`',
  'SELECT 1'
);
PREPARE stmt FROM @add_org_unit_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_org_unit_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'employees'
    AND COLUMN_NAME = 'organizationalUnitId'
    AND INDEX_NAME = 'idx_employees_org_unit'
);

SET @add_org_unit_index_sql = IF(
  @has_org_unit_index = 0,
  'ALTER TABLE `employees` ADD INDEX `idx_employees_org_unit` (`organizationalUnitId`)',
  'SELECT 1'
);
PREPARE stmt FROM @add_org_unit_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existing_org_unit_fk = (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'employees'
    AND COLUMN_NAME = 'organizationalUnitId'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @drop_org_unit_fk_sql = IF(
  @existing_org_unit_fk IS NOT NULL AND @existing_org_unit_fk <> 'fk_employees_org_unit',
  CONCAT('ALTER TABLE `employees` DROP FOREIGN KEY `', @existing_org_unit_fk, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @drop_org_unit_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @create_org_unit_fk_sql = IF(
  @existing_org_unit_fk IS NULL OR @existing_org_unit_fk <> 'fk_employees_org_unit',
  'ALTER TABLE `employees` ADD CONSTRAINT `fk_employees_org_unit` FOREIGN KEY (`organizationalUnitId`) REFERENCES `organizational_units`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
  'SELECT 1'
);
PREPARE stmt FROM @create_org_unit_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

COMMIT;
