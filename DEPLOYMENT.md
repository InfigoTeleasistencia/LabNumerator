# 🚀 Deployment Guide - LabNumerator

## Prerequisites

### Server Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **Node.js**: v18.x or v20.x
- **Memory**: Minimum 2GB RAM
- **Disk**: 2GB free space
- **Network**: Access to SOAP service at `ae89:8086`

### Software to Install on Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Yarn
npm install -g yarn

# Install PM2 (process manager)
npm install -g pm2

# Install Git
sudo apt install -y git
```

## Deployment Methods

### Method 1: Manual Deployment (Quick Start)

#### 1. Clone and Build

```bash
# Navigate to your deployment directory
cd /var/www/

# Clone repository
git clone <your-repo-url> LabNumerator
cd LabNumerator

# Install dependencies
yarn install --production=false

# Create production environment file
cp .env.example .env.production.local
nano .env.production.local
```

#### 2. Configure Environment

Edit `.env.production.local`:

```env
# SOAP Service Configuration
SOAP_URL=http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01
USE_PRODUCTION_SOAP=true

# Application Configuration
NODE_ENV=production
PORT=3000

# Optional: If using custom hostname
# NEXT_PUBLIC_APP_URL=http://your-server-ip:3000
```

#### 3. Test SOAP Connectivity

Before deploying, test the SOAP connection:

```bash
# Test script will be created in scripts/test-soap.js
node scripts/test-soap.js
```

#### 4. Build Application

```bash
# Build Next.js application
yarn build

# Verify build succeeded
ls -la .next/
```

#### 5. Start with PM2

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Copy and run the command that PM2 outputs
```

#### 6. Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs lab-numerator

# Monitor in real-time
pm2 monit
```

#### 7. Configure Nginx (Optional but Recommended)

Install Nginx:
```bash
sudo apt install -y nginx
```

Create configuration file:
```bash
sudo nano /etc/nginx/sites-available/lab-numerator
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-server-ip-or-domain;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_read_timeout 86400;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/lab-numerator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Method 2: Jenkins CI/CD (Automated)

See `Jenkinsfile` in the project root for automated deployment pipeline.

#### Jenkins Setup Steps:

1. **Create New Pipeline Job**
   - Open Jenkins
   - New Item → Pipeline
   - Name: `LabNumerator-Deploy`

2. **Configure Pipeline**
   - Pipeline Definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: `<your-repo-url>`
   - Branches to build: `*/main`
   - Script Path: `Jenkinsfile`

3. **Add Credentials**
   - Jenkins → Credentials → Add
   - Type: SSH Username with private key
   - ID: `lab-server-ssh`
   - Add your server's SSH key

4. **Configure Environment Variables**
   - In Jenkins job → Configure → Environment Variables
   - Add: `DEPLOY_SERVER`, `DEPLOY_PATH`, `SOAP_URL`

5. **Run Pipeline**
   - Build Now
   - Monitor console output

## Post-Deployment

### Testing the Application

1. **Access the Web Interface**
   ```
   http://your-server-ip:3000
   ```

2. **Test Pages**
   - `/` - Main page
   - `/scan` - Barcode scanning
   - `/display` - Queue display
   - `/lab` - Lab control panel

3. **Test SOAP Integration**
   Use the test script:
   ```bash
   node scripts/test-soap.js 110007938
   ```

### Monitoring

```bash
# View logs in real-time
pm2 logs lab-numerator --lines 100

# Check memory usage
pm2 monit

# View process details
pm2 info lab-numerator

# Restart if needed
pm2 restart lab-numerator
```

### Troubleshooting

#### Application won't start
```bash
# Check logs
pm2 logs lab-numerator --err

# Verify environment
cat /var/www/LabNumerator/.env.production.local

# Check port availability
sudo netstat -tlnp | grep 3000
```

#### SOAP connection issues
```bash
# Test SOAP endpoint from server
curl -v http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01?WSDL

# Use the detailed test script
node scripts/test-soap.js --verbose

# Check network connectivity
ping ae89
telnet ae89 8086
```

#### Performance issues
```bash
# Monitor resources
pm2 monit

# Increase Node.js memory limit (in ecosystem.config.js)
node_args: "--max-old-space-size=4096"

# Restart application
pm2 restart lab-numerator
```

## Updates and Maintenance

### Updating the Application

```bash
# Navigate to app directory
cd /var/www/LabNumerator

# Pull latest changes
git pull origin main

# Install dependencies
yarn install

# Rebuild
yarn build

# Restart with PM2
pm2 restart lab-numerator
```

### Automated Updates with Jenkins

Simply push to your repository and Jenkins will automatically:
1. Pull latest code
2. Run tests
3. Build application
4. Deploy to server
5. Restart services

## Backup Strategy

### Database (if applicable)
Currently using in-memory store. For persistence, consider adding Redis:

```bash
# Install Redis
sudo apt install -y redis-server

# Modify application to use Redis
# Update src/lib/queueStore.ts
```

### Configuration Backup
```bash
# Backup environment file
cp .env.production.local .env.production.local.backup

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 ~/dump.pm2.backup
```

## Security Considerations

1. **Firewall Configuration**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

2. **Environment Variables**
   - Never commit `.env.production.local` to git
   - Keep SOAP credentials secure
   - Use SSH keys for Jenkins deployment

3. **Network Security**
   - Ensure SOAP endpoint is only accessible from internal network
   - Use VPN if accessing externally
   - Consider IP whitelisting

## Performance Optimization

1. **Enable PM2 Cluster Mode**
   Edit `ecosystem.config.js`:
   ```javascript
   instances: 2, // or 'max' for all CPU cores
   exec_mode: 'cluster'
   ```

2. **Add Redis for Caching** (optional)
   ```bash
   npm install ioredis
   ```

3. **Enable Nginx Caching**
   Add to nginx config:
   ```nginx
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;
   proxy_cache my_cache;
   ```

## Support

- **Application Logs**: `pm2 logs lab-numerator`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `journalctl -u pm2-*`

For SOAP service issues, contact GXSalud support team.

