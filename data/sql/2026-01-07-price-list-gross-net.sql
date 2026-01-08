-- Agrega columnas para precios netos/brutos e impuestos por item
ALTER TABLE price_list_items
    ADD COLUMN netPrice DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER productVariantId,
    ADD COLUMN grossPrice DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER netPrice,
    ADD COLUMN taxIds JSON NULL AFTER grossPrice;

-- Copia el valor histórico de "price" a las nuevas columnas
UPDATE price_list_items
SET
    netPrice = price,
    grossPrice = price
WHERE price IS NOT NULL;

-- Elimina la columna antigua centrada solo en un valor
ALTER TABLE price_list_items
    DROP COLUMN price;
