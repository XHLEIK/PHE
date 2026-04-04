# Azure VM Deployment Setup Guide

This guide explains how to set up automated deployments to your Azure VM.

## Overview

The deployment system works as follows:
1. You push code to the `main` branch on GitHub
2. GitHub Actions triggers the `deploy.yml` workflow
3. The workflow SSHs into your Azure VM
4. The `deploy.sh` script runs on the server
5. Code is pulled, built, and PM2 restarts the services

## Prerequisites

- Azure VM running Ubuntu with:
  - Node.js 18+ installed
  - Python 3.10+ installed
  - PM2 installed globally (`npm install -g pm2`)
  - Git configured with access to the repository

## Step 1: Set Up GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AZURE_VM_HOST` | Your VM's public IP address or hostname | `20.123.45.67` |
| `AZURE_VM_USERNAME` | SSH username | `azureuser` |
| `AZURE_VM_SSH_KEY` | Private SSH key (entire contents) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `AZURE_VM_SSH_PORT` | SSH port (optional, defaults to 22) | `22` |

### How to get/create the SSH key:

**Option A: Use existing Azure key**
If you already SSH into your VM, you have a private key. Find it:
```bash
cat ~/.ssh/id_rsa
# or
cat ~/.ssh/azure_vm_key
```

**Option B: Create a new key pair**
```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/azure_deploy_key

# Copy the public key to your VM
ssh-copy-id -i ~/.ssh/azure_deploy_key.pub azureuser@YOUR_VM_IP

# The private key to add to GitHub secrets:
cat ~/.ssh/azure_deploy_key
```

## Step 2: Prepare the Azure VM

SSH into your VM and run these commands:

```bash
# 1. Navigate to the project directory
cd ~/PHE

# 2. Create logs directory
mkdir -p logs

# 3. Make deploy script executable
chmod +x deploy.sh

# 4. Install PM2 if not already installed
npm install -g pm2

# 5. Set up PM2 to start on boot
pm2 startup
# Follow the instructions it prints

# 6. First-time setup: Start the app with PM2
pm2 start ecosystem.config.cjs
pm2 save

# 7. Verify everything is running
pm2 list
```

## Step 3: Test the Deployment

1. Make a small change to any file
2. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "test: trigger deployment"
   git push origin main
   ```
3. Go to GitHub → Actions → Watch the "Deploy to Azure VM" workflow
4. SSH into your VM and check:
   ```bash
   pm2 list
   tail -f ~/PHE/logs/deploy.log
   ```

## How It Works

### PM2 Process Management

The `ecosystem.config.cjs` file defines two processes:
- `phe-nextjs`: The Next.js production server (port 3000)
- `phe-agent`: The LiveKit Python agent (health check on port 8081)

### Zero-Downtime Deployment

The `deploy.sh` script:
1. **Backs up** the current `.next` build folder
2. **Pulls** latest code from GitHub
3. **Installs dependencies** only if `package-lock.json` or `requirements.txt` changed
4. **Builds** the Next.js app
5. **Reloads** PM2 processes (not restart - this ensures zero downtime)
6. **Rolls back** automatically if the build fails

### Rollback

If a deployment fails:
- The previous build is restored from backup
- Git is reset to the previous commit
- PM2 continues running the old version

To manually rollback:
```bash
cd ~/PHE
git log --oneline -5  # Find the commit to rollback to
git reset --hard <commit-hash>
npm run build
pm2 reload ecosystem.config.cjs
```

## Monitoring

### View PM2 Logs
```bash
# All logs
pm2 logs

# Specific app
pm2 logs phe-nextjs
pm2 logs phe-agent

# Last 100 lines
pm2 logs --lines 100
```

### View Deployment Logs
```bash
cat ~/PHE/logs/deploy.log
ls ~/PHE/logs/deploy-*.log
```

### PM2 Monitoring Dashboard
```bash
pm2 monit
```

### Check Process Status
```bash
pm2 list
pm2 show phe-nextjs
pm2 show phe-agent
```

## Troubleshooting

### Deployment fails with "Permission denied"
- Ensure the SSH key is correct in GitHub secrets
- Verify the username matches your VM user
- Check if the key has proper permissions on the VM

### Build fails
- Check Node.js version: `node -v` (should be 18+)
- Check disk space: `df -h`
- View build logs: `pm2 logs phe-nextjs`

### Agent not connecting to LiveKit
- Verify environment variables are set correctly
- Check agent logs: `pm2 logs phe-agent`
- Ensure `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` are correct

### Port already in use
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill PM2 and restart
pm2 delete all
pm2 start ecosystem.config.cjs
```

## Adding Nginx Later

When ready to add Nginx for reverse proxy and HTTPS:

1. Install Nginx: `sudo apt install nginx`
2. Create config at `/etc/nginx/sites-available/phe`
3. The Next.js app runs on `localhost:3000`
4. Proxy requests from Nginx to Next.js
5. Use Certbot for HTTPS: `sudo certbot --nginx`

Example Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Security Notes

- The SSH key in GitHub secrets should be dedicated to deployments
- Consider using a deploy-specific user with limited permissions
- The VM should have firewall rules limiting SSH access
- Never commit secrets to the repository
