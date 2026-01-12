SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'product_variants'
      AND COLUMN_NAME = 'weight_unit'
);

SET @sql_stmt := IF(
    @col_exists = 0,
    'ALTER TABLE product_variants ADD COLUMN weight_unit VARCHAR(16) NOT NULL DEFAULT ''kg'' AFTER weight',
    'SELECT 1'
);

PREPARE add_weight_unit FROM @sql_stmt;
EXECUTE add_weight_unit;
DEALLOCATE PREPARE add_weight_unit;

UPDATE product_variants
SET weight_unit = 'kg'
WHERE weight_unit IS NULL;
