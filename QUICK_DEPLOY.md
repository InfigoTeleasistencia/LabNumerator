# ⚡ Quick Deploy Checklist

Use this checklist for rapid deployment to your Linux server.

## 🎯 Prerequisites Checklist

On your **Linux server**, ensure you have:

- [ ] Node.js 20.x installed: `node --version`
- [ ] Yarn installed: `yarn --version`
- [ ] PM2 installed: `pm2 --version`
- [ ] Git installed: `git --version`
- [ ] Network access to SOAP service (ae89:8086)

## 📋 Quick Installation (5 minutes)

### 1. Install Required Software

```bash
# All in one command:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
sudo apt-get install -y nodejs git && \
sudo npm install -g yarn pm2
```

### 2. Clone and Setup

```bash
# Clone repository
cd /var/www/
git clone <your-repo-url> LabNumerator
cd LabNumerator

# Install dependencies
yarn install

# Create environment file
cat > .env.production.local << 'EOF'
SOAP_URL=http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01
USE_PRODUCTION_SOAP=true
NODE_ENV=production
PORT=3000
EOF
```

### 3. Test SOAP Connectivity

```bash
# Quick test
node scripts/test-soap.js

# If the above fails, check network:
ping ae89
telnet ae89 8086
```

### 4. Build and Start

```bash
# Build
yarn build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

### 5. Verify

```bash
# Check status
pm2 status

# View logs
pm2 logs lab-numerator --lines 50

# Test HTTP
curl http://localhost:3000
```

## 🔧 Configuration Quick Reference

### Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `SOAP_URL` | `http://ae89:8086/gxsalud/servlet/...` | Yes |
| `USE_PRODUCTION_SOAP` | `true` | Yes |
| `NODE_ENV` | `production` | Yes |
| `PORT` | `3000` | No (default: 3000) |

### Important Paths

| Purpose | Path |
|---------|------|
| Application | `/var/www/LabNumerator` |
| Environment | `/var/www/LabNumerator/.env.production.local` |
| Logs | `/var/www/LabNumerator/logs/` |
| PM2 Logs | `~/.pm2/logs/` |

### Common PM2 Commands

```bash
pm2 list                    # Show all processes
pm2 logs lab-numerator      # View logs
pm2 restart lab-numerator   # Restart app
pm2 stop lab-numerator      # Stop app
pm2 delete lab-numerator    # Remove from PM2
pm2 monit                   # Monitor resources
pm2 info lab-numerator      # Detailed info
```

## 🐛 Troubleshooting (30 seconds)

### App won't start?
```bash
pm2 logs lab-numerator --err
cat .env.production.local
```

### SOAP connection fails?
```bash
node scripts/test-soap.js --verbose
curl http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01?WSDL
```

### Port already in use?
```bash
sudo netstat -tlnp | grep 3000
# Kill process: sudo kill -9 <PID>
```

## 🔄 Quick Update

```bash
cd /var/www/LabNumerator
git pull origin main
yarn install
yarn build
pm2 restart lab-numerator
```

## 🚀 Jenkins Quick Setup

If you have Jenkins already:

1. **Create Pipeline Job**
   - New Item → Pipeline
   - Pipeline from SCM → Git
   - Script Path: `Jenkinsfile`

2. **Add Credentials**
   - SSH key: `lab-server-ssh`
   - Server IP: `lab-server-host`
   - Username: `lab-server-user`

3. **Build Now!**

See `JENKINS_SETUP.md` for detailed instructions.

## 📊 Testing SOAP Service

### From Server Command Line

```bash
# Basic connectivity test
curl -v http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01?WSDL

# Full SOAP request test
node scripts/test-soap.js 110007938 --verbose

# Check if ae89 resolves
ping ae89

# If not, add to /etc/hosts:
echo "192.168.X.X ae89" | sudo tee -a /etc/hosts
```

### From Application

Once running, test validation:
1. Open: `http://your-server:3000/scan`
2. Scan a barcode or enter manually
3. Check console logs: `pm2 logs lab-numerator`

## 🔒 Security Quick Checks

- [ ] Firewall configured (only needed ports open)
- [ ] `.env.production.local` NOT committed to Git
- [ ] Application running as non-root user
- [ ] PM2 startup script enabled
- [ ] Nginx reverse proxy (optional but recommended)

## 📈 Performance Monitoring

```bash
# Real-time monitoring
pm2 monit

# Resource usage
pm2 list

# Detailed metrics
pm2 info lab-numerator
```

## 🆘 Quick Help

| Issue | Solution |
|-------|----------|
| Can't connect to SOAP | Check network, firewall, `/etc/hosts` |
| App crashes on start | Check logs: `pm2 logs lab-numerator --err` |
| Port 3000 in use | Change PORT in `.env.production.local` |
| High memory usage | Restart: `pm2 restart lab-numerator` |
| Need to rollback | `git checkout <previous-commit>` then rebuild |

## 📞 Support Commands

Share these with support if you need help:

```bash
# System info
node --version
pm2 --version
cat /etc/os-release

# Application status
pm2 info lab-numerator
pm2 logs lab-numerator --lines 100 --err

# SOAP test results
node scripts/test-soap.js --verbose 2>&1

# Network test
curl -v http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01?WSDL
```

---

**Full documentation:** See `DEPLOYMENT.md` and `JENKINS_SETUP.md`

