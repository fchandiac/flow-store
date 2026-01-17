-- Ensure each point of sale references a default price list
SET @has_default_price_column := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'points_of_sale'
      AND COLUMN_NAME = 'defaultPriceListId'
);

SET @add_default_price_column_stmt := IF(
    @has_default_price_column = 0,
    'ALTER TABLE points_of_sale ADD COLUMN defaultPriceListId varchar(36) NULL AFTER branchId',
    'SELECT 1'
);

PREPARE add_default_price_column FROM @add_default_price_column_stmt;
EXECUTE add_default_price_column;
DEALLOCATE PREPARE add_default_price_column;

-- Backfill existing records using the highest priority default list when available
SET @default_price_list_id := (
    SELECT id
    FROM price_lists
    ORDER BY isDefault DESC, priority ASC, createdAt ASC
    LIMIT 1
);

SET @create_price_list_stmt := IF(
    @default_price_list_id IS NULL,
    'INSERT INTO price_lists (id, name, priceListType, currency, validFrom, validUntil, priority, isDefault, isActive, description, createdAt, updatedAt) VALUES (UUID(), ''Precio POS Predeterminado'', ''RETAIL'', ''CLP'', NULL, NULL, 0, 1, 1, ''Generada automáticamente por migración'', NOW(6), NOW(6))',
    'SELECT 1'
);

PREPARE create_default_price_list FROM @create_price_list_stmt;
EXECUTE create_default_price_list;
DEALLOCATE PREPARE create_default_price_list;

SET @default_price_list_id := (
    SELECT id
    FROM price_lists
    ORDER BY isDefault DESC, priority ASC, createdAt ASC
    LIMIT 1
);

UPDATE points_of_sale
SET defaultPriceListId = @default_price_list_id
WHERE defaultPriceListId IS NULL OR defaultPriceListId = '';

-- Enforce NOT NULL requirement for the default price list reference
PREPARE modify_default_price_column FROM 'ALTER TABLE points_of_sale MODIFY COLUMN defaultPriceListId varchar(36) NOT NULL AFTER branchId';
EXECUTE modify_default_price_column;
DEALLOCATE PREPARE modify_default_price_column;

UPDATE points_of_sale
SET defaultPriceListId = @default_price_list_id
WHERE defaultPriceListId = '';

-- Refresh foreign key constraint to guarantee referential integrity
SET @existing_default_price_fk := (
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'points_of_sale'
      AND COLUMN_NAME = 'defaultPriceListId'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
);

SET @drop_existing_fk_stmt := IF(
    @existing_default_price_fk IS NOT NULL,
    CONCAT('ALTER TABLE points_of_sale DROP FOREIGN KEY `', @existing_default_price_fk, '`'),
    'SELECT 1'
);

PREPARE drop_default_price_fk FROM @drop_existing_fk_stmt;
EXECUTE drop_default_price_fk;
DEALLOCATE PREPARE drop_default_price_fk;

ALTER TABLE points_of_sale
    ADD CONSTRAINT fk_points_of_sale_default_price_list
    FOREIGN KEY (defaultPriceListId) REFERENCES price_lists(id)
    ON DELETE RESTRICT
    ON UPDATE NO ACTION;
