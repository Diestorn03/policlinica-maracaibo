# Entorno de pruebas locales de la versión PHP: la misma línea de PHP que el hosting + el controlador de MariaDB.
FROM php:8.5-cli
RUN docker-php-ext-install pdo_mysql
