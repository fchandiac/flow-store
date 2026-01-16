-- 2026-01-17: Remove manager linkage from employees

START TRANSACTION;

SET @drop_fk_sql = (
  SELECT CONCAT('ALTER TABLE `employees` DROP FOREIGN KEY `', CONSTRAINT_NAME, '`')
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'employees'
    AND COLUMN_NAME = 'reportsToId'
    AND CONSTRAINT_NAME <> 'PRIMARY'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @drop_fk_sql = IF(@drop_fk_sql IS NULL, 'SELECT 1', @drop_fk_sql);
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @drop_index_sql = (
  SELECT CONCAT('ALTER TABLE `employees` DROP INDEX `', INDEX_NAME, '`')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'employees'
    AND COLUMN_NAME = 'reportsToId'
    AND INDEX_NAME <> 'PRIMARY'
  LIMIT 1
);

SET @drop_index_sql = IF(@drop_index_sql IS NULL, 'SELECT 1', @drop_index_sql);
PREPARE stmt FROM @drop_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'employees'
    AND COLUMN_NAME = 'reportsToId'
);

SET @drop_column_sql = IF(@column_exists > 0, 'ALTER TABLE `employees` DROP COLUMN `reportsToId`', 'SELECT 1');
PREPARE stmt FROM @drop_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

COMMIT;
