# Media Upload System - Deployment Guide

Complete guide for deploying and configuring the Media File Upload System.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Backend Deployment](#backend-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Configuration](#configuration)
5. [Production Checklist](#production-checklist)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Backend Requirements

- **PHP:** 8.1 or higher
- **Composer:** 2.x
- **Web Server:** Apache/Nginx
- **Database:** MySQL 5.7+ / PostgreSQL 12+ / SQLite 3 (optional)
- **Disk Space:** Depends on upload volume (recommend 50GB+)
- **Memory:** Minimum 512MB, recommended 2GB+
- **Extensions:** php-pdo, php-json, php-mbstring, php-xml

### Frontend Requirements

- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **Modern Web Browser:** Chrome, Firefox, Safari, Edge

### Server Requirements

- **OS:** Linux (Ubuntu 20.04+), Windows Server, macOS
- **SSL Certificate:** Required for production (Let's Encrypt recommended)
- **Firewall:** Ports 80, 443 open for HTTP/HTTPS

---

## Backend Deployment

### Step 1: Clone Repository

```bash
cd /var/www
git clone <repository-url> media-upload-system
cd media-upload-system/backend
```

### Step 2: Install Dependencies

```bash
composer install --no-dev --optimize-autoloader
```

### Step 3: Configure Environment

```bash
cp .env .env.local
nano .env.local
```

Update the following variables:

```env
# Environment
APP_ENV=prod
APP_SECRET=<generate-random-secret-32-chars>

# Upload Configuration
UPLOAD_CHUNK_SIZE=1048576
UPLOAD_MAX_FILE_SIZE=524288000
UPLOAD_MAX_FILES=10
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/x-msvideo,video/mpeg
UPLOAD_STORAGE_PATH=/var/www/media-upload-system/var/uploads
UPLOAD_TEMP_PATH=/var/www/media-upload-system/var/temp_chunks
UPLOAD_CHUNK_TIMEOUT=1800
UPLOAD_FILE_RETENTION_DAYS=30
UPLOAD_MAX_PARALLEL_UPLOADS=3

# Database (optional)
DATABASE_URL="mysql://user:password@localhost:3306/media_upload"

# CORS
CORS_ALLOW_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=error
```

### Step 4: Create Directories

```bash
mkdir -p var/uploads var/temp_chunks var/log
chmod -R 775 var/
chown -R www-data:www-data var/
```

### Step 5: Set Up Database

```bash
# Create database
php bin/console doctrine:database:create

# Run migrations
php bin/console doctrine:migrations:migrate --no-interaction
```

### Step 6: Clear Cache

```bash
php bin/console cache:clear --env=prod
php bin/console cache:warmup --env=prod
```

### Step 7: Configure Web Server

#### Apache Configuration

Create `/etc/apache2/sites-available/media-upload.conf`:

```apache
<VirtualHost *:80>
    ServerName api.yourdomain.com
    DocumentRoot /var/www/media-upload-system/backend/public

    <Directory /var/www/media-upload-system/backend/public>
        AllowOverride All
        Require all granted
        FallbackResource /index.php
    </Directory>

    <Directory /var/www/media-upload-system/backend/public/bundles>
        FallbackResource disabled
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/media-upload-error.log
    CustomLog ${APACHE_LOG_DIR}/media-upload-access.log combined
</VirtualHost>
```

Enable the site:

```bash
a2ensite media-upload
a2enmod rewrite
systemctl reload apache2
```

#### Nginx Configuration

Create `/etc/nginx/sites-available/media-upload`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    root /var/www/media-upload-system/backend/public;

    location / {
        try_files $uri /index.php$is_args$args;
    }

    location ~ ^/index\.php(/|$) {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;
        internal;
    }

    location ~ \.php$ {
        return 404;
    }

    client_max_body_size 500M;
    client_body_timeout 300s;

    error_log /var/log/nginx/media-upload-error.log;
    access_log /var/log/nginx/media-upload-access.log;
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/media-upload /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 8: Set Up SSL (Production)

Using Let's Encrypt with Certbot:

```bash
# Install certbot
apt install certbot python3-certbot-apache  # For Apache
# OR
apt install certbot python3-certbot-nginx   # For Nginx

# Generate certificate
certbot --apache -d api.yourdomain.com  # For Apache
# OR
certbot --nginx -d api.yourdomain.com   # For Nginx

# Auto-renewal
certbot renew --dry-run
```

### Step 9: Set Up Cron Jobs

Edit crontab:

```bash
crontab -e
```

Add the following:

```cron
# Clean up expired chunks every hour
0 * * * * cd /var/www/media-upload-system/backend && php bin/console app:cleanup-chunks >> /var/log/cleanup-chunks.log 2>&1

# Clean up old files daily at 2 AM
0 2 * * * cd /var/www/media-upload-system/backend && php bin/console app:cleanup-files >> /var/log/cleanup-files.log 2>&1

# Clear cache weekly
0 3 * * 0 cd /var/www/media-upload-system/backend && php bin/console cache:clear --env=prod
```

---

## Frontend Deployment

### Step 1: Navigate to Frontend Directory

```bash
cd /var/www/media-upload-system/web-client
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure API Endpoint

Edit `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://api.yourdomain.com',
        changeOrigin: true,
      },
    },
  },
})
```

### Step 4: Build for Production

```bash
npm run build
```

This creates a `dist/` directory with optimized static files.

### Step 5: Deploy Static Files

#### Option 1: Serve with Nginx

Create `/etc/nginx/sites-available/media-upload-web`:

```nginx
server {
    listen 80;
    server_name upload.yourdomain.com;
    root /var/www/media-upload-system/web-client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass https://api.yourdomain.com;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    error_log /var/log/nginx/media-upload-web-error.log;
    access_log /var/log/nginx/media-upload-web-access.log;
}
```

Enable and reload:

```bash
ln -s /etc/nginx/sites-available/media-upload-web /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### Option 2: Serve with Apache

Create `/etc/apache2/sites-available/media-upload-web.conf`:

```apache
<VirtualHost *:80>
    ServerName upload.yourdomain.com
    DocumentRoot /var/www/media-upload-system/web-client/dist

    <Directory /var/www/media-upload-system/web-client/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # React Router support
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Proxy API requests
    ProxyPass /api https://api.yourdomain.com/api
    ProxyPassReverse /api https://api.yourdomain.com/api

    ErrorLog ${APACHE_LOG_DIR}/media-upload-web-error.log
    CustomLog ${APACHE_LOG_DIR}/media-upload-web-access.log combined
</VirtualHost>
```

Enable and reload:

```bash
a2ensite media-upload-web
a2enmod rewrite proxy proxy_http
systemctl reload apache2
```

#### Option 3: Deploy to CDN

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Step 6: Set Up SSL for Frontend

```bash
certbot --nginx -d upload.yourdomain.com  # For Nginx
# OR
certbot --apache -d upload.yourdomain.com # For Apache
```

---

## Configuration

### PHP Configuration

Edit `php.ini`:

```ini
# Increase upload limits
upload_max_filesize = 500M
post_max_size = 500M
memory_limit = 512M
max_execution_time = 300

# Increase input variables
max_input_vars = 5000

# Enable required extensions
extension=pdo_mysql
extension=mbstring
extension=xml
extension=json
```

Restart PHP-FPM:

```bash
systemctl restart php8.1-fpm
```

### Database Optimization

For MySQL, edit `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
```

Restart MySQL:

```bash
systemctl restart mysql
```

### File System Permissions

```bash
# Backend
chown -R www-data:www-data /var/www/media-upload-system/backend
chmod -R 755 /var/www/media-upload-system/backend
chmod -R 775 /var/www/media-upload-system/backend/var

# Upload storage
chown -R www-data:www-data /var/www/media-upload-system/var/uploads
chmod -R 775 /var/www/media-upload-system/var/uploads
```

---

## Production Checklist

### Security

- [ ] Set `APP_ENV=prod` in `.env.local`
- [ ] Generate strong `APP_SECRET`
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure CORS properly
- [ ] Disable debug mode
- [ ] Set proper file permissions
- [ ] Enable firewall (UFW, iptables)
- [ ] Implement rate limiting (optional)
- [ ] Add virus scanning (optional)
- [ ] Enable security headers

### Performance

- [ ] Enable OPcache
- [ ] Enable HTTP/2
- [ ] Enable Gzip compression
- [ ] Set up CDN for static assets
- [ ] Configure browser caching
- [ ] Optimize database queries
- [ ] Enable query caching
- [ ] Set up Redis/Memcached (optional)

### Monitoring

- [ ] Set up error logging
- [ ] Configure log rotation
- [ ] Set up uptime monitoring
- [ ] Enable server monitoring (CPU, RAM, Disk)
- [ ] Set up backup system
- [ ] Configure alerting
- [ ] Monitor upload success rates

### Backup

- [ ] Daily database backups
- [ ] Weekly file storage backups
- [ ] Off-site backup storage
- [ ] Test backup restoration

---

## Monitoring & Maintenance

### Log Files

**Backend Logs:**
```bash
tail -f /var/www/media-upload-system/backend/var/log/prod.log
```

**Web Server Logs:**
```bash
tail -f /var/log/nginx/media-upload-error.log
tail -f /var/log/apache2/media-upload-error.log
```

**Cleanup Logs:**
```bash
tail -f /var/log/cleanup-chunks.log
tail -f /var/log/cleanup-files.log
```

### Health Checks

```bash
# API health
curl https://api.yourdomain.com/api/upload/health

# Check disk space
df -h /var/www/media-upload-system/var/uploads

# Check database size
mysql -u root -p -e "SELECT table_schema, SUM(data_length + index_length) / 1024 / 1024 AS 'Size (MB)' FROM information_schema.tables WHERE table_schema = 'media_upload';"
```

### Performance Monitoring

```bash
# Check PHP-FPM status
systemctl status php8.1-fpm

# Monitor active uploads
watch -n 5 'ps aux | grep php | wc -l'

# Check storage usage
du -sh /var/www/media-upload-system/var/uploads/*
```

### Database Maintenance

```bash
# Optimize tables
php bin/console doctrine:database:optimize

# Check for orphaned uploads
SELECT COUNT(*) FROM uploads WHERE status = 'uploading' AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR);
```

---

## Troubleshooting

### Common Issues

**1. Upload Fails with 413 Error**

**Cause:** File size exceeds server limits

**Solution:**
```nginx
# Nginx
client_max_body_size 500M;
```
```apache
# Apache .htaccess
LimitRequestBody 524288000
```

**2. Chunk Upload Timeout**

**Cause:** Slow network or large chunks

**Solution:**
```nginx
# Nginx
client_body_timeout 300s;
fastcgi_read_timeout 300s;
```

**3. Permission Denied Errors**

**Cause:** Incorrect file permissions

**Solution:**
```bash
chown -R www-data:www-data var/
chmod -R 775 var/
```

**4. CORS Errors**

**Cause:** Frontend origin not allowed

**Solution:**
Update `CORS_ALLOW_ORIGIN` in `.env.local`:
```env
CORS_ALLOW_ORIGIN=https://upload.yourdomain.com
```

**5. Out of Memory Errors**

**Cause:** PHP memory limit too low

**Solution:**
```ini
# php.ini
memory_limit = 512M
```

**6. Database Connection Errors**

**Cause:** Incorrect credentials or server down

**Solution:**
```bash
# Test connection
mysql -h localhost -u username -p database_name

# Restart MySQL
systemctl restart mysql
```

### Debug Mode

Enable debug mode temporarily:

```env
APP_ENV=dev
APP_DEBUG=1
```

Then check logs:
```bash
tail -f var/log/dev.log
```

**Remember to disable debug mode in production!**

---

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer:** Use Nginx or HAProxy
2. **Shared Storage:** NFS, S3, or similar
3. **Session Management:** Redis or database
4. **Database Replication:** Master-slave setup

### Vertical Scaling

1. **Increase RAM:** For better caching
2. **More CPU Cores:** For parallel processing
3. **SSD Storage:** Faster I/O operations
4. **Database Optimization:** Indexes, query optimization

### Cloud Deployment

**AWS:**
- EC2 for backend
- S3 for file storage
- RDS for database
- CloudFront for CDN

**Google Cloud:**
- Compute Engine for backend
- Cloud Storage for files
- Cloud SQL for database
- Cloud CDN

**Azure:**
- App Service for backend
- Blob Storage for files
- Azure Database for MySQL
- Azure CDN

---

## Backup & Recovery

### Automated Backups

Create backup script `/usr/local/bin/backup-media-upload.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/backups/media-upload"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
mysqldump -u root -p media_upload > "$BACKUP_DIR/db_$DATE.sql"

# Backup uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /var/www/media-upload-system/var/uploads

# Keep only last 7 days
find "$BACKUP_DIR" -type f -mtime +7 -delete
```

Add to crontab:
```cron
0 1 * * * /usr/local/bin/backup-media-upload.sh
```

### Recovery Process

```bash
# Restore database
mysql -u root -p media_upload < /backups/media-upload/db_YYYYMMDD.sql

# Restore uploads
tar -xzf /backups/media-upload/uploads_YYYYMMDD.tar.gz -C /
```

---

## Support & Resources

- **Documentation:** `/docs` directory
- **API Reference:** [`/docs/API_DOCUMENTATION.md`](./API_DOCUMENTATION.md)
- **Issue Tracker:** GitHub Issues
- **Community:** Discord/Slack channel

---

## License

MIT License
