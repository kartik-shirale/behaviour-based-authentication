# Fraud Detection API - Production Deployment

This directory contains everything needed to deploy the Fraud Detection Encoder API in production environments.

## Quick Start

### Option 1: Docker Deployment (Recommended)

```bash
# 1. Make deployment script executable
chmod +x deploy.sh

# 2. Deploy the application
./deploy.sh deploy

# 3. Check status
./deploy.sh status
```

### Option 2: Docker Compose Only

```bash
# 1. Copy production config
cp config.production.yaml config.yaml

# 2. Edit configuration as needed
nano config.yaml

# 3. Start services
docker-compose up -d

# 4. Check health
curl http://localhost:5002/health
```

### Option 3: Systemd Service (Linux)

```bash
# 1. Create user and directories
sudo useradd -r -s /bin/false fraud-api
sudo mkdir -p /opt/fraud-detection-api
sudo chown fraud-api:fraud-api /opt/fraud-detection-api

# 2. Copy application files
sudo cp -r . /opt/fraud-detection-api/
sudo chown -R fraud-api:fraud-api /opt/fraud-detection-api

# 3. Create virtual environment
sudo -u fraud-api python3 -m venv /opt/fraud-detection-api/venv
sudo -u fraud-api /opt/fraud-detection-api/venv/bin/pip install -r /opt/fraud-detection-api/requirements.txt

# 4. Install systemd service
sudo cp fraud-detection-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable fraud-detection-api
sudo systemctl start fraud-detection-api

# 5. Check status
sudo systemctl status fraud-detection-api
```

## Files Overview

| File | Purpose |
|------|----------|
| `API_USAGE_GUIDE.md` | Comprehensive API documentation and usage examples |
| `Dockerfile` | Docker container configuration |
| `docker-compose.yml` | Multi-service deployment with nginx and monitoring |
| `nginx.conf` | Production nginx configuration with SSL and rate limiting |
| `deploy.sh` | Automated deployment script |
| `config.production.yaml` | Production configuration template |
| `fraud-detection-api.service` | Systemd service configuration |
| `DEPLOYMENT_README.md` | This file - quick deployment guide |

## Configuration

### Environment Variables

For Docker deployments, you can override configuration using environment variables:

```bash
# Example docker run with environment variables
docker run -d \
  -p 5002:5002 \
  -e SERVER_PORT=5002 \
  -e LOGGING_LEVEL=INFO \
  -e API_KEY=your-secret-api-key \
  fraud-detection-api:latest
```

### SSL Certificates

For production deployments with nginx:

1. **Self-signed (development/testing):**
   ```bash
   ./deploy.sh deploy  # Automatically generates self-signed certs
   ```

2. **Let's Encrypt (recommended):**
   ```bash
   # Install certbot
   sudo apt-get install certbot
   
   # Get certificate
   sudo certbot certonly --standalone -d your-domain.com
   
   # Copy certificates
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
   ```

3. **Commercial certificate:**
   - Place your certificate as `ssl/cert.pem`
   - Place your private key as `ssl/key.pem`

## Monitoring

### Basic Monitoring

```bash
# Deploy with monitoring stack (Prometheus + Grafana)
./deploy.sh monitor

# Access monitoring
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
```

### Health Checks

```bash
# Application health
curl http://localhost:5002/health

# Detailed status
curl http://localhost:5002/status

# Docker container health
docker-compose ps
```

### Logs

```bash
# Application logs
./deploy.sh logs

# Or directly with docker-compose
docker-compose logs -f fraud-detection-api

# System logs (systemd)
sudo journalctl -u fraud-detection-api -f
```

## Scaling

### Horizontal Scaling

```bash
# Scale API containers
docker-compose up -d --scale fraud-detection-api=3

# Update nginx upstream configuration accordingly
```

### Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test health endpoint
ab -n 1000 -c 10 http://localhost:5002/health

# Test API endpoint (with proper data)
ab -n 100 -c 5 -p test_data.json -T application/json http://localhost:5002/encode/motion
```

## Security Checklist

- [ ] SSL/TLS certificates configured
- [ ] API key authentication enabled
- [ ] Rate limiting configured
- [ ] Firewall rules in place
- [ ] Non-root user for application
- [ ] Security headers configured in nginx
- [ ] Log monitoring set up
- [ ] Regular security updates scheduled

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   sudo netstat -tlnp | grep :5002
   sudo kill -9 <PID>
   ```

2. **Permission denied:**
   ```bash
   sudo chown -R fraud-api:fraud-api /opt/fraud-detection-api
   sudo chmod +x deploy.sh
   ```

3. **Model loading errors:**
   ```bash
   # Check model files exist
   ls -la models/
   
   # Check permissions
   sudo chown -R fraud-api:fraud-api models/
   ```

4. **Memory issues:**
   ```bash
   # Check memory usage
   docker stats
   
   # Increase container memory limit in docker-compose.yml
   ```

### Getting Help

1. Check application logs first
2. Verify configuration files
3. Test with curl commands from API_USAGE_GUIDE.md
4. Check system resources (CPU, memory, disk)
5. Verify network connectivity

## Maintenance

### Updates

```bash
# Stop services
./deploy.sh stop

# Pull latest code
git pull origin main

# Rebuild and deploy
./deploy.sh deploy
```

### Backup

```bash
# Backup configuration and models
tar -czf fraud-api-backup-$(date +%Y%m%d).tar.gz \
  config.yaml models/ ssl/ logs/
```

### Log Rotation

Logs are automatically rotated when using the provided configuration. For manual log management:

```bash
# Clean old logs (keep last 7 days)
find logs/ -name "*.log" -mtime +7 -delete
```

---

**Note:** Always test deployments in a staging environment before production. Ensure you have proper backups and monitoring in place.