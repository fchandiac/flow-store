CREATE TABLE IF NOT EXISTS `accounting_period_snapshots` (
    `id` char(36) NOT NULL,
    `periodId` char(36) NOT NULL,
    `accountId` char(36) NOT NULL,
    `closingBalance` decimal(18,2) NOT NULL DEFAULT 0,
    `debitSum` decimal(18,2) NOT NULL DEFAULT 0,
    `creditSum` decimal(18,2) NOT NULL DEFAULT 0,
    `metadata` json NULL,
    `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `IDX_accounting_period_snapshots_period_account` (`periodId`, `accountId`),
    KEY `IDX_accounting_period_snapshots_periodId` (`periodId`),
    CONSTRAINT `FK_accounting_period_snapshots_period` FOREIGN KEY (`periodId`) REFERENCES `accounting_periods` (`id`) ON DELETE CASCADE,
    CONSTRAINT `FK_accounting_period_snapshots_account` FOREIGN KEY (`accountId`) REFERENCES `accounting_accounts` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
