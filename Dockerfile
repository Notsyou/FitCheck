FROM php:8.2-apache

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Install mysqli extension for PHP
RUN docker-php-ext-install mysqli

# Copy custom PHP config to raise upload limits
COPY uploads.ini /usr/local/etc/php/conf.d/uploads.ini

# Copy all project files into the Apache web root
COPY . /var/www/html/

# Create the stored_images directory and give Apache write permission
RUN mkdir -p /var/www/html/stored_images \
    && chown -R www-data:www-data /var/www/html/stored_images \
    && chmod -R 775 /var/www/html/stored_images
    
EXPOSE 80