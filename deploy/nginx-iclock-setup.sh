#!/bin/bash
# Run this script on the VPS to add /iclock proxy to Nginx
# Usage: sudo bash nginx-iclock-setup.sh

set -e

BACKUP="/etc/nginx/sites-available/default.bak.$(date +%Y%m%d%H%M%S)"
CONFIG="/etc/nginx/sites-available/default"

echo "Backing up current config to $BACKUP"
cp "$CONFIG" "$BACKUP"

echo "Writing new Nginx config..."
cat > "$CONFIG" << 'NGINX_EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;
    server_name _;

    # ZKTeco ADMS - proxy /iclock to Node.js backend
    location /iclock {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Default: serve static files, then 404
    location / {
        try_files $uri $uri/ =404;
    }
}
NGINX_EOF

echo "Testing Nginx config..."
nginx -t

echo "Reloading Nginx..."
systemctl reload nginx

echo "Testing /iclock endpoint..."
curl -s "http://127.0.0.1/iclock/cdata?SN=TEST" | head -1

echo ""
echo "Done! If you see 'GET OPTION FROM: TEST...' above, it works."
echo "Configure ZKTeco device: Server=31.97.180.94, Port=80, HTTPS=OFF"
