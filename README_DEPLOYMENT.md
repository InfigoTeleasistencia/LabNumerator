# 🚀 Deployment Package Ready!

## 📦 What's Included

I've created a complete deployment package for your LabNumerator application:

### 📄 Documentation Files

1. **DEPLOYMENT.md** - Complete deployment guide with all methods
2. **JENKINS_SETUP.md** - Detailed Jenkins CI/CD configuration
3. **QUICK_DEPLOY.md** - Fast deployment checklist (5 minutes)

### ⚙️ Configuration Files

1. **ecosystem.config.js** - PM2 process manager configuration
2. **Jenkinsfile** - Jenkins pipeline for automated deployment
3. **env.production.example** - Production environment template

### 🔧 Helper Scripts

1. **scripts/test-soap.js** - Comprehensive SOAP service testing tool
2. **scripts/test-connectivity.sh** - Network connectivity checker
3. **scripts/deploy.sh** - Automated deployment script

## 🎯 Choose Your Deployment Method

### Option 1: Quick Manual Deploy (Recommended for First Time)
**Time: ~5 minutes**

```bash
# On your Linux server:
cd /var/www/
git clone <your-repo> LabNumerator
cd LabNumerator
yarn install
cp env.production.example .env.production.local
# Edit .env.production.local with your settings
yarn build
pm2 start ecosystem.config.js --env production
```

See: **QUICK_DEPLOY.md** for full checklist

### Option 2: Automated Script Deploy
**Time: ~3 minutes**

```bash
# On your Linux server:
git clone <your-repo> LabNumerator
cd LabNumerator
./scripts/deploy.sh production
```

The script handles everything automatically!

### Option 3: Jenkins CI/CD (Best for Teams)
**Time: ~15 minutes setup, then automatic**

1. Follow **JENKINS_SETUP.md** to configure Jenkins
2. Push code to repository
3. Jenkins automatically builds and deploys
4. Zero manual intervention needed

## 🧪 Testing SOAP Connectivity

Before deploying, test the SOAP service from your server:

### Quick Network Test
```bash
./scripts/test-connectivity.sh
```

This checks:
- ✅ DNS resolution for `ae89`
- ✅ Network connectivity
- ✅ Port 8086 accessibility
- ✅ HTTP connection
- ✅ WSDL retrieval

### Full SOAP Test
```bash
node scripts/test-soap.js
```

This tests:
- ✅ SOAP endpoint connectivity
- ✅ Request/response parsing
- ✅ Real barcode validation
- ✅ Response time

### With Specific Barcode
```bash
node scripts/test-soap.js 110007938 --verbose
```

## 📋 Pre-Deployment Checklist

On your Linux server, ensure:

- [ ] Node.js 20.x installed: `node --version`
- [ ] Yarn installed: `yarn --version`  
- [ ] PM2 installed: `pm2 --version`
- [ ] Git installed: `git --version`
- [ ] Network access to `ae89:8086`
- [ ] Port 3000 available (or configure different port)

**Quick install everything:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g yarn pm2
```

## 🔧 Configuration Required

You need to create `.env.production.local` on your server with:

```env
SOAP_URL=http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01
USE_PRODUCTION_SOAP=true
NODE_ENV=production
PORT=3000
```

**Template provided:** `env.production.example`

## 🎓 Jenkins Setup Summary

If you want automated CI/CD:

1. **Install Jenkins Plugins:**
   - Git Plugin
   - SSH Agent Plugin
   - Pipeline Plugin
   - NodeJS Plugin

2. **Add Credentials:**
   - SSH key for server access (ID: `lab-server-ssh`)
   - Server IP (ID: `lab-server-host`)
   - Server username (ID: `lab-server-user`)

3. **Create Pipeline Job:**
   - New Item → Pipeline
   - SCM: Git
   - Script Path: `Jenkinsfile`

4. **Build & Deploy:**
   - Push to main branch → Auto deploy
   - Or click "Build Now"

**Full guide:** See `JENKINS_SETUP.md`

## 🐛 Troubleshooting

### Can't connect to SOAP service?

```bash
# Test connectivity
./scripts/test-connectivity.sh

# If ae89 doesn't resolve, add to /etc/hosts:
echo "192.168.X.X ae89" | sudo tee -a /etc/hosts
```

### Application won't start?

```bash
# Check logs
pm2 logs lab-numerator --err

# Verify environment
cat .env.production.local

# Check port
sudo netstat -tlnp | grep 3000
```

### Jenkins build fails?

Check:
- SSH credentials configured correctly
- Server is accessible from Jenkins
- Node.js and PM2 installed on server
- Deployment directory exists and writable

## 📊 Post-Deployment

### Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs lab-numerator

# Test HTTP
curl http://localhost:3000

# Monitor resources
pm2 monit
```

### Access Application

- Main page: `http://your-server-ip:3000`
- Scan page: `http://your-server-ip:3000/scan`
- Display: `http://your-server-ip:3000/display`
- Lab control: `http://your-server-ip:3000/lab`

## 📚 Documentation Reference

| File | Purpose |
|------|---------|
| `QUICK_DEPLOY.md` | Fast deployment checklist |
| `DEPLOYMENT.md` | Complete deployment guide |
| `JENKINS_SETUP.md` | Jenkins CI/CD setup |
| `SOAP_CONFIG.md` | SOAP service documentation |
| `ARCHITECTURE.md` | Application architecture |

## 🔐 Security Notes

- ✅ `.env.production.local` is git-ignored
- ✅ Use non-root user for deployment
- ✅ Configure firewall (allow only ports 22, 80, 443)
- ✅ SOAP service should be on internal network
- ✅ Use SSH keys, not passwords

## 🆘 Need Help?

### Quick Commands for Support

```bash
# System info
node --version && yarn --version && pm2 --version

# App status
pm2 info lab-numerator

# Recent logs
pm2 logs lab-numerator --lines 100

# SOAP test
node scripts/test-soap.js --verbose
```

### Common Issues

| Problem | Solution |
|---------|----------|
| SOAP connection fails | Run `./scripts/test-connectivity.sh` |
| Port 3000 in use | Change `PORT` in `.env.production.local` |
| App crashes | Check `pm2 logs lab-numerator --err` |
| Jenkins SSH fails | Verify SSH key in Jenkins credentials |

## 🎉 You're Ready to Deploy!

**Recommended first-time deployment:**

1. ✅ Read `QUICK_DEPLOY.md` (5 min read)
2. ✅ Test SOAP connectivity: `./scripts/test-connectivity.sh`
3. ✅ Manual deploy: `./scripts/deploy.sh`
4. ✅ Verify: `pm2 status`
5. ✅ Test app: `curl http://localhost:3000`

**Then optionally:**
- Setup Jenkins CI/CD (see `JENKINS_SETUP.md`)
- Configure Nginx reverse proxy
- Setup monitoring and alerts

---

**Questions?** All details are in the documentation files above!

