-- Migration to add 'name' column to 'accounting_periods' table
ALTER TABLE `accounting_periods` ADD COLUMN `name` VARCHAR(50) NULL AFTER `endDate`;

-- Initialize 'name' for existing records based on 'startDate'
-- Format: MONTH-YY (e.g., OCTUBRE-25)
UPDATE `accounting_periods` SET `name` = CONCAT(
    CASE MONTH(startDate)
        WHEN 1 THEN 'ENERO'
        WHEN 2 THEN 'FEBRERO'
        WHEN 3 THEN 'MARZO'
        WHEN 4 THEN 'ABRIL'
        WHEN 5 THEN 'MAYO'
        WHEN 6 THEN 'JUNIO'
        WHEN 7 THEN 'JULIO'
        WHEN 8 THEN 'AGOSTO'
        WHEN 9 THEN 'SEPTIEMBRE'
        WHEN 10 THEN 'OCTUBRE'
        WHEN 11 THEN 'NOVIEMBRE'
        WHEN 12 THEN 'DICIEMBRE'
    END,
    '-',
    DATE_FORMAT(startDate, '%y')
);
