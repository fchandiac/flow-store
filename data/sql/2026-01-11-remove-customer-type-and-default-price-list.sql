-- Remove legacy customer type and default price list references
-- Drop customerType column if it still exists
SET @has_customer_type_column := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customers'
      AND COLUMN_NAME = 'customerType'
);

SET @drop_customer_type_stmt := IF(
    @has_customer_type_column = 1,
    'ALTER TABLE customers DROP COLUMN customerType',
    'SELECT 1'
);

PREPARE drop_customer_type FROM @drop_customer_type_stmt;
EXECUTE drop_customer_type;
DEALLOCATE PREPARE drop_customer_type;

-- Drop foreign key for defaultPriceListId when present
SET @default_price_fk_name := (
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customers'
      AND COLUMN_NAME = 'defaultPriceListId'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
);

SET @drop_default_price_fk_stmt := IF(
    @default_price_fk_name IS NOT NULL,
    CONCAT('ALTER TABLE customers DROP FOREIGN KEY `', @default_price_fk_name, '`'),
    'SELECT 1'
);

PREPARE drop_default_price_fk FROM @drop_default_price_fk_stmt;
EXECUTE drop_default_price_fk;
DEALLOCATE PREPARE drop_default_price_fk;

-- Drop defaultPriceListId column if it still exists
SET @has_default_price_column := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customers'
      AND COLUMN_NAME = 'defaultPriceListId'
);

SET @drop_default_price_column_stmt := IF(
    @has_default_price_column = 1,
    'ALTER TABLE customers DROP COLUMN defaultPriceListId',
    'SELECT 1'
);

PREPARE drop_default_price_column FROM @drop_default_price_column_stmt;
EXECUTE drop_default_price_column;
DEALLOCATE PREPARE drop_default_price_column;
