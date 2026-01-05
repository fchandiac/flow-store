-- Eliminar la restricción de clave foránea actual
ALTER TABLE `transactions` DROP FOREIGN KEY `FK_6fd237d4c79918e1175cc151e15`;

-- Modificar branchId para aceptar NULL (por si no se aplicó antes)
ALTER TABLE `transactions` MODIFY COLUMN `branchId` CHAR(36) NULL;

-- Volver a crear la restricción de clave foránea permitiendo NULL
ALTER TABLE `transactions` ADD CONSTRAINT `FK_6fd237d4c79918e1175cc151e15`
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE RESTRICT;
