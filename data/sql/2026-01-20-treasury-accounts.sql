CREATE TABLE IF NOT EXISTS `treasury_accounts` (
  `id` CHAR(36) NOT NULL,
  `companyId` CHAR(36) NOT NULL,
  `branchId` CHAR(36) NULL,
  `type` ENUM('BANK','CASH','VIRTUAL') NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `bankName` VARCHAR(100) NULL,
  `accountNumber` VARCHAR(50) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `metadata` JSON NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_treasury_accounts_company` (`companyId`),
  KEY `idx_treasury_accounts_branch` (`branchId`),
  CONSTRAINT `fk_treasury_accounts_company` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_treasury_accounts_branch` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;