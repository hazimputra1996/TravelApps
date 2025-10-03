# Deploying to AWS EC2 (Docker + Nginx)

This guide shows how to run the full stack (PostgreSQL, backend, frontend, nginx reverse proxy) on a single EC2 instance.

## 1. Choose Instance & OS
- Recommended: t3.small (or t3.micro for very light testing) with 20 GB gp3 disk.
- OS: Amazon Linux 2023 or Ubuntu 22.04 LTS.

## 2. Security Group Ports
Open inbound:
- 22 (SSH) – your IP only
- 80 (HTTP) – 0.0.0.0/0 (public)
- (Optional) 443 (HTTPS) – if adding SSL
Do NOT expose 5432 publicly.

## 3. Install Dependencies
SSH into instance:
```
# Update packages
sudo yum update -y   # (Amazon Linux) or sudo apt update && sudo apt upgrade -y

# Install Docker
sudo yum install -y docker || sudo apt install -y docker.io
sudo systemctl enable docker --now

# (Optional) Install docker compose plugin
sudo curl -L "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group (logout/login afterward)
sudo usermod -aG docker $USER
```
Check:
```
docker compose version || docker-compose version
```

## 4. Clone Repo
```
git clone https://github.com/your-org/travel-expense.git
cd travel-expense
```
(If you copied these files manually, just upload them instead.)

## 5. Environment Variables (Optional Overrides)
Create a `.env` file in project root (same directory as `docker-compose.prod.yml`) if you want to override defaults:
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=strongpasswordhere
POSTGRES_DB=travelexpense
CORS_ORIGIN=https://your-domain.com
NEXT_PUBLIC_API_BASE=https://your-domain.com
```

## 6. Start Stack
```
docker compose -f docker-compose.prod.yml up -d --build
```
This will:
1. Build backend & frontend images
2. Start Postgres
3. Run migrations via backend entrypoint
4. Launch Nginx on port 80

Visit: `http://<EC2_PUBLIC_IP>/`
API base path proxied at `http://<EC2_PUBLIC_IP>/api/`.

## 7. Logs & Monitoring
```
docker compose -f docker-compose.prod.yml logs -f backend
```
Restart if needed:
```
docker compose -f docker-compose.prod.yml restart backend
```

## 8. Updating Code
```
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
Migrations automatically apply.

## 9. Enabling HTTPS (Certbot + Nginx)
Two approaches:
1. Separate reverse proxy (e.g. AWS ALB + target group) -> simplest (let ALB handle HTTPS).
2. Direct certbot inside instance.

Quick inline certbot (Ubuntu-like):
```
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
Ensure DNS A record points to EC2 IP first.

If using Amazon Linux, install via `snapd` or use a sidecar container like `nginxproxy/acme-companion`.

## 10. Backups & Persistence
- Postgres data stored in named volume `pgdata` (on local Docker volume). To snapshot: use EBS snapshot or periodic `pg_dump`.
- Manual dump:
```
docker compose -f docker-compose.prod.yml exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > dump.sql
```

## 11. Scaling Considerations
Single instance = single point of failure.
For higher reliability:
- Move Postgres to AWS RDS
- Serve frontend via CDN / static hosting (S3 + CloudFront) and keep only API + DB on EC2
- Use ECS / Fargate for containers instead of raw EC2

## 12. Zero-Downtime Deploy (Simple)
```
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build --no-deps backend frontend
```
Backend entrypoint runs migrations first; ensure they are backward compatible.

## 13. Troubleshooting
| Problem | Diagnosis | Fix |
|---------|-----------|-----|
| 502 Bad Gateway | Nginx cannot reach container | `docker ps`, ensure backend/ frontend healthy |
| Migrations not applied | Entry script skipped | Check backend logs for prisma errors |
| Rate API blocked | Outbound blocked | Open egress 443 in security group / network ACL |
| OOM kill | Instance too small | Upgrade to t3.medium or reduce chart.js usage |
| SSL renewal fails | Certbot misconfigured | Run `sudo certbot renew --dry-run` and fix errors |

## 14. Rollback Strategy
If new build fails:
```
# list previous images
docker images | grep travel-expense-backend
# re-tag older image
docker tag <old_image_id> travel-expense-backend:rollback
# edit compose file temporary to use :rollback or deploy with image override
```
(Or keep previous commit and `git checkout <old>` then rebuild.)

---
You now have the stack running on EC2. Consider moving secrets to AWS Systems Manager Parameter Store and referencing them through environment variable injection for production-grade setups.
