-- Elimina las tablas antiguas para permitir que TypeORM cree las nuevas con nombres en plural.
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS `person`;