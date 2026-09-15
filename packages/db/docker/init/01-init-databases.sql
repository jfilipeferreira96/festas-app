-- Executado automaticamente pelo mysql:8.0 na PRIMEIRA inicialização do volume.
-- Cria a BD usada pelos testes (Vitest) e garante que o user da app tem
-- privilégios sobre a BD de dev (criada via MYSQL_DATABASE) e a de testes.
-- O próprio user root já tem acesso total, pelo que estes GRANTs são para
-- permitir usar `festas` no DATABASE_URL / DATABASE_URL_TEST.

CREATE DATABASE IF NOT EXISTS `festas_dev_test`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `festas_dev`.* TO 'festas'@'%';
GRANT ALL PRIVILEGES ON `festas_dev_test`.* TO 'festas'@'%';
FLUSH PRIVILEGES;
