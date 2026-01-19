ALTER TABLE `accounting_periods`
    ADD UNIQUE KEY `UQ_accounting_period_company_month` (`companyId`, `startDate`, `endDate`);

CREATE INDEX `IDX_accounting_periods_company_start` ON `accounting_periods` (`companyId`, `startDate`);
