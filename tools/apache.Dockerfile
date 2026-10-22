# Apache + mod_php como el hosting (Webuzo): sirve el paquete tal cual, con su .htaccess.
FROM php:8.5-apache
RUN docker-php-ext-install pdo_mysql && a2enmod rewrite headers deflate && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf
