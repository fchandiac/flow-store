-- Add 'OTHER' option to persons.documentType enum if missing
SET @column_type := (
    SELECT COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'persons'
      AND COLUMN_NAME = 'documentType'
);

SET @needs_update := IF(
    @column_type LIKE '%\'OTHER\'%',
    0,
    1
);

SET @alter_enum_stmt := IF(
    @needs_update = 1,
    'ALTER TABLE persons MODIFY COLUMN documentType ENUM(\'RUN\',\'RUT\',\'PASSPORT\',\'OTHER\') NULL AFTER businessName',
    'SELECT 1'
);

PREPARE alter_person_document_type FROM @alter_enum_stmt;
EXECUTE alter_person_document_type;
DEALLOCATE PREPARE alter_person_document_type;
