-- 2026-01-20-customer-payment-day-migration.sql
-- Elimina la columna defaultPaymentTermDays y agrega paymentDayOfMonth a customers

ALTER TABLE customers
  DROP COLUMN IF EXISTS "defaultPaymentTermDays";

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS "paymentDayOfMonth" integer NOT NULL DEFAULT 5 CHECK ("paymentDayOfMonth" IN (5,10,15,20,25,30));
