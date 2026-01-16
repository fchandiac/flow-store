-- Agrega columna para almacenar cuentas bancarias de las empresas
ALTER TABLE `companies`
    ADD COLUMN `bankAccounts` JSON NULL AFTER `settings`;
