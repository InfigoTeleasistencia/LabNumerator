# 🎯 Action Plan for Deployment with Jenkins 2.87

## Current Situation
- **Jenkins Version:** 2.87 (from 2017)
- **Issue:** Too old for NodeJS plugin (requires 2.138.4+)
- **Security:** Multiple vulnerabilities present
- **Goal:** Deploy LabNumerator application

## ✅ Immediate Actions (Deploy Today)

### Step 1: Switch to Compatible Jenkinsfile
```bash
cd /Users/gcastro/dev/workspaces/lab/LabNumerator

# Backup original
mv Jenkinsfile Jenkinsfile.original

# Use compatible version
mv Jenkinsfile.no-nodejs-plugin Jenkinsfile

# Commit
git add -A
git commit -m "Use Jenkinsfile compatible with Jenkins 2.87"
git push
```

### Step 2: Ensure Server Prerequisites
On your Linux deployment server, verify:
```bash
node --version   # Should be v20.x
yarn --version   # Should be installed
pm2 --version    # Should be installed
```

If missing, install:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g yarn pm2
```

### Step 3: Configure Jenkins Job
1. **In Jenkins:** Create new Pipeline job
2. **Configure:**
   - Pipeline from SCM → Git
   - Repository URL: Your repo
   - Script Path: `Jenkinsfile`

3. **Add Credentials:**
   - `lab-server-ssh` - SSH key for server
   - `lab-server-host` - Server IP (e.g., 192.168.1.100)
   - `lab-server-user` - Username (e.g., deploy)

### Step 4: Deploy!
Click "Build Now" in Jenkins

## ⚠️ Important Actions (This Week)

### Update Jenkins for Security

**Why:** Your Jenkins 2.87 has multiple critical security vulnerabilities:
- System command execution vulnerability
- Cross-site scripting vulnerabilities
- XML External Entity processing vulnerability
- And many more...

**When:** Schedule a maintenance window (2-3 hours)

**How:**

#### 1. Notify Team
```
Maintenance Window: [Date/Time]
Duration: 2-3 hours
Impact: Jenkins will be unavailable
Reason: Security updates
```

#### 2. Backup Everything
```bash
# SSH to Jenkins server
sudo systemctl stop jenkins

# Full backup
sudo tar -czf /backup/jenkins-full-backup-$(date +%F).tar.gz \
  /var/lib/jenkins \
  /etc/default/jenkins

# Restart
sudo systemctl start jenkins
```

#### 3. Update Jenkins
```bash
# Update system
sudo apt update

# Update Jenkins
sudo apt upgrade jenkins

# Restart
sudo systemctl restart jenkins
```

#### 4. Verify
- Open Jenkins UI
- Check version at bottom-right
- Should be 2.277 or newer
- Test existing jobs

#### 5. Update Plugins
- Go to: Manage Jenkins → Manage Plugins
- Click "Updates" tab
- Select all and update
- Restart Jenkins

## 📊 Comparison: Current vs Updated

| Feature | Jenkins 2.87 | Jenkins 2.277+ |
|---------|--------------|----------------|
| Security | ❌ Multiple vulnerabilities | ✅ Patched |
| NodeJS Plugin | ❌ Not compatible | ✅ Compatible |
| Modern Plugins | ❌ Many incompatible | ✅ All compatible |
| Performance | ⚠️ Slower | ✅ Faster |
| Pipeline Features | ⚠️ Limited | ✅ Full features |
| Support | ❌ No longer supported | ✅ Active support |

## 🔄 Migration Path

### Phase 1: Deploy with Current Setup (Today)
- ✅ Use `Jenkinsfile` (no-nodejs-plugin version)
- ✅ Get application running
- ✅ Verify everything works

### Phase 2: Update Jenkins (This Week)
- ⚠️ Schedule maintenance window
- ⚠️ Backup everything
- ⚠️ Update Jenkins to latest LTS (2.277+)
- ⚠️ Update all plugins
- ⚠️ Test all jobs

### Phase 3: Optimize (After Update)
- ✅ Switch to original Jenkinsfile (if desired)
- ✅ Install NodeJS plugin
- ✅ Add more CI/CD features
- ✅ Set up automated tests

## 🆘 Troubleshooting

### If Jenkins Update Fails
1. **Don't panic!** You have a backup
2. Restore from backup:
   ```bash
   sudo systemctl stop jenkins
   sudo rm -rf /var/lib/jenkins
   sudo tar -xzf /backup/jenkins-full-backup-DATE.tar.gz -C /
   sudo systemctl start jenkins
   ```

### If Deployment Fails
1. Check Jenkins console output
2. Verify SSH credentials
3. Check server has Node.js/PM2
4. Test SSH manually:
   ```bash
   ssh -i ~/.ssh/your-key user@server
   ```

### If SOAP Connection Fails
From server, run:
```bash
cd /var/www/LabNumerator
node scripts/test-soap.js --verbose
```

## 📞 Support Contacts

- **Jenkins Issues:** Check Jenkins logs: `/var/log/jenkins/jenkins.log`
- **Deployment Issues:** Check PM2 logs: `pm2 logs lab-numerator`
- **SOAP Issues:** Run test script: `node scripts/test-soap.js`

## ✅ Success Criteria

### Immediate Success (Today)
- [ ] Jenkinsfile switched to compatible version
- [ ] Jenkins job configured
- [ ] Credentials added
- [ ] First successful build
- [ ] Application running on server
- [ ] Can access application via browser

### Long-term Success (This Week)
- [ ] Jenkins updated to 2.277+
- [ ] All security vulnerabilities resolved
- [ ] All plugins updated
- [ ] Documentation updated
- [ ] Team trained on new Jenkins features

---

**Next Step:** Run the commands in "Step 1: Switch to Compatible Jenkinsfile" above!

