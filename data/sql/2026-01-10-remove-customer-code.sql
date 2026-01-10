-- Drop optional customer code column now that identifiers rely on person data
SET @has_column := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customers'
      AND COLUMN_NAME = 'code'
);

SET @drop_stmt := IF(
    @has_column = 1,
    'ALTER TABLE customers DROP COLUMN code',
    'SELECT 1'
);

PREPARE drop_customer_code FROM @drop_stmt;
EXECUTE drop_customer_code;
DEALLOCATE PREPARE drop_customer_code;
