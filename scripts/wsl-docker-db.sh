#!/usr/bin/env bash
# DeployForge - PostgreSQL Management Script for WSL / Linux

ACTION="${1:-up}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "\033[1;36m==========================================================\033[0m"
echo -e "\033[1;37m DeployForge - WSL Docker PostgreSQL 16 Controller        \033[0m"
echo -e "\033[1;36m==========================================================\033[0m"

case "$ACTION" in
    up)
        echo -e "\033[1;33m[*] Starting optimized PostgreSQL container via Docker Compose...\033[0m"
        cd "$DIR" && docker compose up -d postgres
        echo -e "\033[1;32m[+] PostgreSQL is up and listening on host port 5433.\033[0m"
        ;;
    down)
        echo -e "\033[1;33m[*] Stopping PostgreSQL container...\033[0m"
        cd "$DIR" && docker compose stop postgres
        ;;
    status)
        docker ps --filter "name=deployforge_postgres"
        ;;
    logs)
        docker logs -f --tail=100 deployforge_postgres
        ;;
    psql)
        docker exec -it deployforge_postgres psql -U deployforge -d deployforge
        ;;
    *)
        echo "Usage: $0 {up|down|status|logs|psql}"
        exit 1
        ;;
esac
