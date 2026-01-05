-- MIGRACIÓN: Hacer branchId nullable en transactions
ALTER TABLE `transactions`
MODIFY COLUMN `branchId` CHAR(36) NULL;
