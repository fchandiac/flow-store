-- 2026-01-08: Units schema migration and product_variant unit linkage
-- Este script crea y normaliza la tabla units, migra los datos existentes de
-- product_variants.unitOfMeasure a la nueva columna unit_id y establece las
-- llaves foráneas necesarias.

START TRANSACTION;

-- 1. Crear tabla units si no existe
CREATE TABLE IF NOT EXISTS `units` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `symbol` VARCHAR(10) NOT NULL,
  `dimension` ENUM('mass','length','volume','count') NOT NULL,
  `conversionFactor` DECIMAL(18,9) NOT NULL,
  `allowDecimals` TINYINT(1) NOT NULL DEFAULT 1,
  `isBase` TINYINT(1) NOT NULL DEFAULT 0,
  `base_unit_id` VARCHAR(36) NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` DATETIME(6) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Normalizar charset/collation y tipos de columna existentes
ALTER TABLE `units`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `units`
  ADD COLUMN IF NOT EXISTS `base_unit_id` VARCHAR(36) NULL;

ALTER TABLE `units`
  ADD COLUMN IF NOT EXISTS `allowDecimals` TINYINT(1) NOT NULL DEFAULT 1 AFTER `conversionFactor`;

ALTER TABLE `units`
  MODIFY COLUMN `id` VARCHAR(36) NOT NULL,
  MODIFY COLUMN `name` VARCHAR(100) NOT NULL,
  MODIFY COLUMN `symbol` VARCHAR(10) NOT NULL,
  MODIFY COLUMN `dimension` ENUM('mass','length','volume','count') NOT NULL,
  MODIFY COLUMN `conversionFactor` DECIMAL(18,9) NOT NULL,
  MODIFY COLUMN `allowDecimals` TINYINT(1) NOT NULL DEFAULT 1,
  MODIFY COLUMN `isBase` TINYINT(1) NOT NULL DEFAULT 0,
  MODIFY COLUMN `base_unit_id` VARCHAR(36) NULL,
  MODIFY COLUMN `active` TINYINT(1) NOT NULL DEFAULT 1;

-- 3. Índices y llaves para units
DROP INDEX IF EXISTS `units_dimension_base_unique` ON `units`;
CREATE UNIQUE INDEX IF NOT EXISTS `uq_units_symbol` ON `units` (`symbol`);
CREATE INDEX IF NOT EXISTS `idx_units_base_unit_id` ON `units` (`base_unit_id`);
ALTER TABLE `units`
  DROP FOREIGN KEY IF EXISTS `FK_a41662bc5e9140cf79b61cfa243`;
ALTER TABLE `units`
  ADD CONSTRAINT `fk_units_base`
    FOREIGN KEY (`base_unit_id`) REFERENCES `units`(`id`)
    ON DELETE RESTRICT ON UPDATE NO ACTION;

-- 4. Crear unidad base por defecto (UN) si no existe
INSERT INTO `units` (`id`, `name`, `symbol`, `dimension`, `conversionFactor`, `allowDecimals`, `isBase`, `base_unit_id`, `active`, `createdAt`, `updatedAt`)
SELECT UUID(), 'Unidad', 'UN', 'count', 1, 1, 1, NULL, 1, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `units` WHERE `symbol` = 'UN');

-- 5. Normalizar base_unit_id para unidades base existentes
UPDATE `units`
SET `base_unit_id` = NULL, `isBase` = 1
WHERE `isBase` = 1;

-- 6. Preparar tabla product_variants para apuntar a units
ALTER TABLE `product_variants`
  ADD COLUMN IF NOT EXISTS `unit_id` VARCHAR(36) NULL AFTER `baseCost`;

ALTER TABLE `product_variants`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `product_variants`
  MODIFY COLUMN `unit_id` VARCHAR(36) NULL;

UPDATE `product_variants`
SET `unit_id` = (SELECT `id` FROM `units` WHERE `symbol` = 'UN' LIMIT 1)
WHERE `unit_id` IS NULL;

-- 9. Re-crear la llave foránea hacia units
ALTER TABLE `product_variants`
  DROP FOREIGN KEY IF EXISTS `FK_1d908b93ec60193674c798fef65`;
ALTER TABLE `product_variants`
  ADD CONSTRAINT `FK_1d908b93ec60193674c798fef65`
    FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`)
    ON DELETE RESTRICT ON UPDATE NO ACTION;

-- 10. Hacer no nula la columna unit_id
ALTER TABLE `product_variants`
  MODIFY COLUMN `unit_id` VARCHAR(36) NOT NULL;

COMMIT;
