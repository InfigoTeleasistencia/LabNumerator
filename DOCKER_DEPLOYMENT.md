# 🐳 Docker Deployment Guide

This guide covers deploying LabNumerator using Docker containers.

## ✅ Advantages of Docker Deployment

- ✅ **No Node.js installation needed** on the server
- ✅ **Isolated environment** - No conflicts with other apps
- ✅ **Easy rollback** - Keep previous versions
- ✅ **Consistent** - Same environment everywhere
- ✅ **Simple updates** - Just rebuild and restart

## 📋 Prerequisites on Server

Only Docker and Docker Compose are needed:

```bash
# Check if Docker is installed
docker --version

# Check if docker-compose is installed
docker-compose --version
```

### Install Docker (if needed)

**On Ubuntu/Debian:**
```bash
# Update packages
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker jenkins

# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes
exit
```

**On CentOS/RHEL:**
```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker jenkins

# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 🚀 Deployment Methods

### Method 1: Manual Docker Deployment

```bash
# 1. Clone repository
cd /opt
sudo git clone <your-repo-url> lab-numerator
cd lab-numerator

# 2. Create environment file
cp .env.docker .env
nano .env
# Edit SOAP_URL if needed

# 3. Build and start
docker-compose build
docker-compose up -d

# 4. Check status
docker-compose ps
docker-compose logs -f
```

### Method 2: Jenkins CI/CD (Automated)

Use `Jenkinsfile.docker` instead of the regular Jenkinsfile:

1. **In your Jenkins pipeline job:**
   - Script Path: `Jenkinsfile.docker`

2. **Credentials needed:**
   - `lab-server-ssh` - SSH key
   - `lab-server-host` - Server IP
   - `lab-server-user` - Username

3. **Click "Build Now"**

The pipeline will:
- ✅ Transfer files to server
- ✅ Build Docker image on server
- ✅ Test SOAP connectivity
- ✅ Deploy with docker-compose
- ✅ Run health checks
- ✅ Clean up old images

## 📊 Docker Commands Reference

### Basic Operations

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f
docker-compose logs -f --tail=100

# Restart container
docker-compose restart

# Stop container
docker-compose stop

# Start container
docker-compose start

# Stop and remove
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Maintenance

```bash
# Enter container shell
docker-compose exec lab-numerator sh

# Check container resource usage
docker stats lab-numerator

# View container details
docker inspect lab-numerator

# Clean up old images
docker image prune -f

# View images
docker images | grep lab-numerator
```

## 🔄 Updating the Application

### Manual Update

```bash
cd /opt/lab-numerator

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

### Rollback to Previous Version

```bash
# List available images
docker images lab-numerator

# Update docker-compose.yml to use specific tag
# image: lab-numerator:123  (where 123 is build number)

# Restart with old image
docker-compose up -d
```

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs

# Check if port is in use
sudo netstat -tlnp | grep 3000

# Check container health
docker inspect lab-numerator | grep -A 10 Health
```

### SOAP Connection Issues

```bash
# Test from within container
docker-compose exec lab-numerator sh
wget -O- http://ae89:8086 --timeout=5

# Check if ae89 resolves
docker-compose exec lab-numerator getent hosts ae89
```

### Out of Disk Space

```bash
# Clean up unused images
docker system prune -a

# Remove old volumes
docker volume prune

# Check disk usage
docker system df
```

## 📈 Performance Optimization

### Resource Limits

Edit `docker-compose.yml`:

```yaml
services:
  lab-numerator:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

### Enable BuildKit

```bash
# Better Docker build performance
export DOCKER_BUILDKIT=1
docker-compose build
```

## 🔐 Security

### Best Practices

1. **Run as non-root** (already configured in Dockerfile)
2. **Limit resources** (add resource limits)
3. **Regular updates** (rebuild images regularly)
4. **Scan images** for vulnerabilities:

```bash
# Install Trivy
docker run aquasec/trivy image lab-numerator:latest
```

## 🌐 Nginx Reverse Proxy (Optional)

If you want to use a domain name and HTTPS:

```nginx
server {
    listen 80;
    server_name lab.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 📊 Monitoring

### View Resource Usage

```bash
# Real-time stats
docker stats lab-numerator

# Historical logs
docker-compose logs --since 1h
```

### Health Check

```bash
# Check application health
curl http://localhost:3000

# Check container health status
docker inspect lab-numerator | grep -A 5 Health
```

## 🆘 Support

### Collect Debug Information

```bash
# System info
docker version
docker-compose version
uname -a

# Container info
docker-compose ps
docker-compose logs --tail=200

# Resource usage
docker stats --no-stream
df -h
```

---

**For more help, see:**
- `DEPLOYMENT.md` - General deployment guide
- `JENKINS_SETUP.md` - Jenkins configuration
- `QUICK_DEPLOY.md` - Quick start guide

