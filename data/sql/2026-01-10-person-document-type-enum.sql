-- Normalise existing documentType values to match new ENUM constraints
UPDATE persons
SET documentType = UPPER(documentType)
WHERE documentType IS NOT NULL;

-- Reset unexpected values before applying enum
UPDATE persons
SET documentType = NULL
WHERE documentType NOT IN ('RUN', 'RUT', 'PASSPORT');

-- Apply defaults for existing records based on person type
UPDATE persons
SET documentType = 'RUT'
WHERE type = 'COMPANY'
  AND documentType IS NULL
  AND documentNumber IS NOT NULL;

UPDATE persons
SET documentType = 'RUN'
WHERE type = 'NATURAL'
  AND documentType IS NULL
  AND documentNumber IS NOT NULL;

-- Ensure column uses ENUM for controlled values
SET @is_enum := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'persons'
      AND COLUMN_NAME = 'documentType'
      AND DATA_TYPE = 'enum'
);

SET @alter_stmt := IF(
    @is_enum = 0,
    'ALTER TABLE persons MODIFY COLUMN documentType ENUM(\'RUN\',\'RUT\',\'PASSPORT\') NULL AFTER businessName',
    'SELECT 1'
);

PREPARE alter_document_type FROM @alter_stmt;
EXECUTE alter_document_type;
DEALLOCATE PREPARE alter_document_type;
