-- 2026-01-15: Nuevos campos y tipo de transacción para gastos operativos
-- Este script agrega el tipo OPERATING_EXPENSE al catálogo de transacciones y
-- permite vincular cada gasto a una categoría y centro de costos específicos.

START TRANSACTION;

-- Extender el ENUM de transactionType para incluir OPERATING_EXPENSE
ALTER TABLE `transactions`
  MODIFY COLUMN `transactionType` ENUM(
    'SALE',
    'PURCHASE',
    'PURCHASE_ORDER',
    'SALE_RETURN',
    'PURCHASE_RETURN',
    'TRANSFER_OUT',
    'TRANSFER_IN',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'PAYMENT_IN',
    'PAYMENT_OUT',
    'OPERATING_EXPENSE'
  ) NOT NULL;

-- Crear columnas para categoría de gasto y centro de costos si aún no existen
ALTER TABLE `transactions`
  ADD COLUMN IF NOT EXISTS `expenseCategoryId` CHAR(36) NULL AFTER `supplierId`,
  ADD COLUMN IF NOT EXISTS `costCenterId` CHAR(36) NULL AFTER `expenseCategoryId`;

-- Índices de apoyo para filtros frecuentes
CREATE INDEX IF NOT EXISTS `idx_transactions_expense_category` ON `transactions` (`expenseCategoryId`);
CREATE INDEX IF NOT EXISTS `idx_transactions_cost_center` ON `transactions` (`costCenterId`);

-- Relaciones referenciales con eliminación en cascada controlada
ALTER TABLE `transactions`
  DROP FOREIGN KEY IF EXISTS `fk_transactions_expense_category`;

ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_expense_category`
    FOREIGN KEY (`expenseCategoryId`) REFERENCES `expense_categories`(`id`)
    ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `transactions`
  DROP FOREIGN KEY IF EXISTS `fk_transactions_cost_center`;

ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_cost_center`
    FOREIGN KEY (`costCenterId`) REFERENCES `cost_centers`(`id`)
    ON DELETE SET NULL ON UPDATE NO ACTION;

COMMIT;
