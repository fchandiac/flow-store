SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cash_sessions'
      AND COLUMN_NAME = 'closingDetails'
);

SET @sql_stmt := IF(
    @col_exists = 0,
    'ALTER TABLE cash_sessions ADD COLUMN closingDetails JSON NULL AFTER notes',
    'SELECT 1'
);

PREPARE add_closing_details FROM @sql_stmt;
EXECUTE add_closing_details;
DEALLOCATE PREPARE add_closing_details;
