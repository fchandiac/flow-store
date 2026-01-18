-- 2026-01-17: Add allowDecimals flag to units table
START TRANSACTION;

ALTER TABLE `units`
  ADD COLUMN IF NOT EXISTS `allowDecimals` TINYINT(1) NOT NULL DEFAULT 1 AFTER `conversionFactor`;

UPDATE `units`
SET `allowDecimals` = 1
WHERE `allowDecimals` IS NULL;

COMMIT;
