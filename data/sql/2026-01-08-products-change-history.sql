SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'changeHistory'
);

SET @sql_stmt := IF(
    @col_exists = 0,
    'ALTER TABLE products ADD COLUMN changeHistory JSON NULL AFTER metadata',
    'SELECT 1'
);

PREPARE add_change_history FROM @sql_stmt;
EXECUTE add_change_history;
DEALLOCATE PREPARE add_change_history;
