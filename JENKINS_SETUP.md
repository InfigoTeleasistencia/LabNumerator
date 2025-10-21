# 🔧 Jenkins CI/CD Setup Guide

This guide will help you configure Jenkins for automated deployment of LabNumerator.

## Prerequisites

Since you already have Jenkins running on your Linux server, we'll integrate this project into it.

## Step-by-Step Configuration

### 1. Install Required Jenkins Plugins

Go to Jenkins → Manage Jenkins → Manage Plugins → Available

Install these plugins if not already installed:
- **Git Plugin** (for Git integration)
- **SSH Agent Plugin** (for SSH deployment)
- **Pipeline Plugin** (for Jenkinsfile support)
- **NodeJS Plugin** (for Node.js builds)

### 2. Configure NodeJS in Jenkins

1. Go to: **Manage Jenkins** → **Global Tool Configuration**
2. Scroll to **NodeJS** section
3. Click **Add NodeJS**
4. Configure:
   - Name: `Node-20`
   - Version: Select Node.js 20.x
   - Global npm packages: `yarn`
5. Save

### 3. Add SSH Credentials

#### For Server Access:

1. Go to: **Jenkins** → **Credentials** → **System** → **Global credentials**
2. Click **Add Credentials**
3. Configure:
   - Kind: `SSH Username with private key`
   - ID: `lab-server-ssh`
   - Description: `Lab Numerator Server SSH Key`
   - Username: Your server username (e.g., `deploy` or `ubuntu`)
   - Private Key: Enter directly or from file
     - Copy your SSH private key (`~/.ssh/id_rsa`)
     - Or generate a new one: `ssh-keygen -t rsa -b 4096 -f ~/.ssh/jenkins_deploy`
4. Save

#### Add public key to server:
```bash
# On your local machine, copy the public key
cat ~/.ssh/id_rsa.pub

# On the server, add it to authorized_keys
ssh your-user@your-server
mkdir -p ~/.ssh
echo "your-public-key-here" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 4. Add Server Configuration Credentials

#### Server Host:
1. **Add Credentials** → Kind: `Secret text`
2. ID: `lab-server-host`
3. Secret: Your server IP or hostname (e.g., `192.168.1.100`)

#### Server User:
1. **Add Credentials** → Kind: `Secret text`
2. ID: `lab-server-user`
3. Secret: Your deployment username (e.g., `deploy`)

### 5. Create Jenkins Pipeline Job

1. **New Item**
2. Enter name: `LabNumerator-Deploy`
3. Select: **Pipeline**
4. Click **OK**

#### General Configuration:
- ✅ Check **GitHub project** (if using GitHub)
  - Project URL: Your repository URL

#### Build Triggers:
Choose one or more:
- ✅ **Poll SCM**: `H/5 * * * *` (check every 5 minutes)
- ✅ **GitHub hook trigger** (if using webhooks)

#### Pipeline Configuration:
1. Definition: **Pipeline script from SCM**
2. SCM: **Git**
3. Repository URL: Your Git repository URL
   - Example: `https://github.com/yourusername/LabNumerator.git`
   - Or: `git@github.com:yourusername/LabNumerator.git` (if using SSH)
4. Credentials: Add your Git credentials if private repo
5. Branch Specifier: `*/main` (or your main branch)
6. Script Path: `Jenkinsfile`

### 6. Configure Environment Variables (Optional)

If you want to override default values:

1. In the Pipeline job → **Configure**
2. Scroll to **Pipeline** section
3. Check **Environment variables** (if available in your Jenkins version)
4. Or edit the Jenkinsfile to hardcode values

### 7. Prepare Your Server

On your Linux server, run these commands:

```bash
# Create deployment user (if not exists)
sudo adduser deploy
sudo usermod -aG sudo deploy

# Switch to deploy user
sudo su - deploy

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Yarn
sudo npm install -g yarn

# Install PM2
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup
# Run the command that PM2 outputs

# Create deployment directory
sudo mkdir -p /var/www/LabNumerator
sudo chown deploy:deploy /var/www/LabNumerator

# Create logs directory
mkdir -p /var/www/LabNumerator/logs
```

### 8. Configure Environment on Server

```bash
# On the server
cd /var/www/LabNumerator

# Create production environment file
nano .env.production.local
```

Add this content:
```env
SOAP_URL=http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01
USE_PRODUCTION_SOAP=true
NODE_ENV=production
PORT=3000
```

### 9. Test the Pipeline

1. Go to your Jenkins job: `LabNumerator-Deploy`
2. Click **Build Now**
3. Watch the **Console Output**

The pipeline will:
1. ✅ Checkout code from Git
2. ✅ Install dependencies
3. ✅ Run linter and type check
4. ✅ Build the Next.js app
5. ✅ Test SOAP connectivity
6. ✅ Deploy to server via SSH
7. ✅ Restart application with PM2
8. ✅ Run health check

### 10. Verify Deployment

After successful build:

```bash
# SSH to your server
ssh deploy@your-server

# Check PM2 status
pm2 list

# View logs
pm2 logs lab-numerator

# Test the application
curl http://localhost:3000
```

## Jenkinsfile Customization

The `Jenkinsfile` is already configured, but you may want to customize:

### Change Deployment Path

Edit line in `Jenkinsfile`:
```groovy
DEPLOY_PATH = '/var/www/LabNumerator'  // Change this
```

### Change Branch for Deployment

Currently only `main` branch deploys. To change:

```groovy
when {
    branch 'production'  // Change from 'main' to 'production'
}
```

### Add Slack/Email Notifications

Add to `post` section in Jenkinsfile:

```groovy
post {
    success {
        emailext (
            subject: "✅ Deployment Success: ${env.JOB_NAME}",
            body: "Build #${env.BUILD_NUMBER} deployed successfully",
            to: "team@example.com"
        )
    }
    failure {
        emailext (
            subject: "❌ Deployment Failed: ${env.JOB_NAME}",
            body: "Build #${env.BUILD_NUMBER} failed. Check console output.",
            to: "team@example.com"
        )
    }
}
```

## GitHub Webhook (Optional)

For automatic builds on push:

### 1. In GitHub:
1. Go to your repository
2. Settings → Webhooks → Add webhook
3. Payload URL: `http://your-jenkins-server/github-webhook/`
4. Content type: `application/json`
5. Events: **Just the push event**
6. Save

### 2. In Jenkins Job:
1. Configure → Build Triggers
2. ✅ Check **GitHub hook trigger for GITScm polling**

## Troubleshooting

### SSH Connection Issues

```bash
# Test SSH connection manually
ssh -i ~/.ssh/id_rsa deploy@your-server

# Check SSH agent in Jenkins
# Add this to Jenkinsfile for debugging:
sh 'ssh -T deploy@your-server'
```

### Permission Denied

```bash
# On server, ensure correct ownership
sudo chown -R deploy:deploy /var/www/LabNumerator

# Check directory permissions
ls -la /var/www/
```

### Build Fails at Deploy Stage

Check Jenkins Console Output for specific error. Common issues:
- SSH key not added to server
- Wrong server hostname/IP
- Firewall blocking connection
- Node.js/PM2 not installed on server

### Application Won't Start

```bash
# On server, check PM2 logs
pm2 logs lab-numerator --err

# Check if port is in use
sudo netstat -tlnp | grep 3000

# Check environment file
cat /var/www/LabNumerator/.env.production.local
```

## Advanced: Blue-Green Deployment

For zero-downtime deployments, modify the Jenkinsfile to:
1. Deploy to a new directory
2. Test the new version
3. Switch PM2 to new version
4. Keep old version as backup

Example:
```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_PATH="/var/www/LabNumerator_${TIMESTAMP}"
```

## Maintenance

### Update Jenkins Job

To update the pipeline:
1. Commit changes to `Jenkinsfile` in your repository
2. Jenkins will automatically use the new version on next build

### View Build History

- Click on job → **Build History**
- Each build shows: Status, Duration, Changes
- Click build number → **Console Output** for logs

### Rollback

If deployment fails:

```bash
# On server
pm2 stop lab-numerator

# Restore from backup
cd /var/www
mv LabNumerator LabNumerator_failed
mv LabNumerator_backup_TIMESTAMP LabNumerator

# Restart
pm2 start lab-numerator
```

## Security Best Practices

1. **Use separate deployment user** (not root)
2. **Restrict SSH key** - only for deployment, not full sudo
3. **Use secrets management** - Jenkins credentials store
4. **Audit logs** - Enable Jenkins audit logging
5. **Network security** - Keep Jenkins in internal network
6. **HTTPS** - Use HTTPS for Jenkins web interface

## Next Steps

After successful setup:
1. ✅ Test a deployment by pushing to main branch
2. ✅ Verify application is running on server
3. ✅ Test SOAP connectivity from server
4. ✅ Configure monitoring (PM2, logs)
5. ✅ Setup backup strategy
6. ✅ Document team workflows

---

**Questions or issues?** Check the DEPLOYMENT.md for more details.

