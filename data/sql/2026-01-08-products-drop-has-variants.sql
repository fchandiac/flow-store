-- Remove hasVariants column now that every product uses the multi-variant flow
ALTER TABLE products DROP COLUMN IF EXISTS `hasVariants`;
ALTER TABLE products DROP COLUMN IF EXISTS `has_variants`;
