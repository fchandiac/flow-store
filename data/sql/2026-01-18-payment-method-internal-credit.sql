SET @tx_enum := (
    SELECT COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'transactions'
      AND COLUMN_NAME = 'paymentMethod'
    LIMIT 1
);

SET @tx_stmt := IF(
  @tx_enum IS NULL OR LOCATE('INTERNAL_CREDIT', @tx_enum) > 0,
  'SELECT 1',
  'ALTER TABLE transactions
    MODIFY COLUMN paymentMethod ENUM(''CASH'',''CREDIT_CARD'',''DEBIT_CARD'',''TRANSFER'',''CHECK'',''CREDIT'',''INTERNAL_CREDIT'',''MIXED'')
    NULL'
);

PREPARE alter_transactions_payment_method FROM @tx_stmt;
EXECUTE alter_transactions_payment_method;
DEALLOCATE PREPARE alter_transactions_payment_method;

SET @rules_enum := (
    SELECT COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'accounting_rules'
      AND COLUMN_NAME = 'paymentMethod'
    LIMIT 1
);

SET @rules_stmt := IF(
  @rules_enum IS NULL OR LOCATE('INTERNAL_CREDIT', @rules_enum) > 0,
  'SELECT 1',
  'ALTER TABLE accounting_rules
    MODIFY COLUMN paymentMethod ENUM(''CASH'',''CREDIT_CARD'',''DEBIT_CARD'',''TRANSFER'',''CHECK'',''CREDIT'',''INTERNAL_CREDIT'',''MIXED'')
    NULL'
);

PREPARE alter_accounting_rules_payment_method FROM @rules_stmt;
EXECUTE alter_accounting_rules_payment_method;
DEALLOCATE PREPARE alter_accounting_rules_payment_method;
