ALTER TABLE transaction_lines
    ADD COLUMN unitId CHAR(36) NULL AFTER productVariantId,
    ADD COLUMN quantityInBase DECIMAL(18,6) NULL AFTER quantity,
    ADD COLUMN unitConversionFactor DECIMAL(18,9) NULL AFTER unitOfMeasure;

ALTER TABLE transaction_lines
    ADD CONSTRAINT fk_transaction_lines_unit
        FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE SET NULL;

UPDATE transaction_lines tl
LEFT JOIN product_variants pv ON pv.id = tl.productVariantId
LEFT JOIN units u ON u.id = pv.unit_id
SET
    tl.unitId = COALESCE(tl.unitId, pv.unit_id),
    tl.unitOfMeasure = COALESCE(tl.unitOfMeasure, u.symbol),
    tl.unitConversionFactor = COALESCE(tl.unitConversionFactor, u.conversionFactor),
    tl.quantityInBase = COALESCE(tl.quantityInBase, tl.quantity * COALESCE(u.conversionFactor, 1));
