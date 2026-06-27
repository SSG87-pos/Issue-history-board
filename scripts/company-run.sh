#!/usr/bin/env sh
set -eu

COMMAND="${1:-check}"
ENV_FILE="${ENV_FILE:-.env}"

error() {
  printf 'ERROR %s\n' "$1" >&2
  exit 1
}

info() {
  printf '%s\n' "$1"
}

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    error "Docker Compose is not available. Install docker-compose-plugin on Ubuntu."
  fi
}

require_docker() {
  command -v docker >/dev/null 2>&1 || error "docker is not installed."
  docker info >/dev/null 2>&1 || error "docker is installed but not running or current user cannot access it."
}

env_value() {
  key="$1"
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1 | sed "s/^['\"]//;s/['\"]$//"
}

require_value() {
  key="$1"
  value="$(env_value "$key")"
  [ -n "$value" ] || error "$key must be set in $ENV_FILE."
  printf '%s' "$value"
}

require_secret() {
  key="$1"
  min_length="$2"
  value="$(require_value "$key")"
  lower="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"

  case "$lower" in
    *change-this*|*deployment-check*|password|admin-password|issueboard)
      error "$key must be changed from the example value."
      ;;
  esac

  length=${#value}
  [ "$length" -ge "$min_length" ] || error "$key must be at least $min_length characters."
}

validate_port() {
  value="$(require_value WEB_PORT)"
  case "$value" in
    ''|*[!0-9]*)
      error "WEB_PORT must be a number."
      ;;
  esac
  [ "$value" -ge 1 ] && [ "$value" -le 65535 ] || error "WEB_PORT must be between 1 and 65535."
}

validate_cors() {
  value="$(require_value CORS_ORIGINS)"
  OLD_IFS="$IFS"
  IFS=','
  for origin in $value; do
    trimmed="$(printf '%s' "$origin" | sed 's/^ *//;s/ *$//')"
    case "$trimmed" in
      http://*|https://*) ;;
      *) error "CORS_ORIGINS contains an invalid origin: $trimmed" ;;
    esac
  done
  IFS="$OLD_IFS"
}

validate_env() {
  [ -f "$ENV_FILE" ] || error "$ENV_FILE is missing. Copy .env.example to .env and edit it first."
  require_secret POSTGRES_PASSWORD 12
  require_secret SECRET_KEY 32
  require_secret ADMIN_PASSWORD 12
  admin_username="$(require_value ADMIN_USERNAME)"
  [ "${#admin_username}" -ge 3 ] || error "ADMIN_USERNAME must be at least 3 characters."
  validate_port
  validate_cors
  info "Environment check passed: $ENV_FILE"
}

run_check() {
  require_docker
  validate_env
  compose config >/dev/null
  info "Docker Compose config check passed."
}

web_port() {
  if [ -f "$ENV_FILE" ]; then
    value="$(env_value WEB_PORT)"
  else
    value=""
  fi
  [ -n "$value" ] || value=8080
  printf '%s' "$value"
}

health_url() {
  printf 'http://127.0.0.1:%s/health' "$(web_port)"
}

check_http_health() {
  url="$(health_url)"
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "$url" >/dev/null
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O - "$url" >/dev/null
  else
    error "curl or wget is required for health checks."
  fi
}

run_health() {
  require_docker
  check_http_health
  info "Application health check passed: $(health_url)"
}

wait_for_health() {
  attempts=30
  attempt=1
  while [ "$attempt" -le "$attempts" ]; do
    if check_http_health >/dev/null 2>&1; then
      info "Application health check passed: $(health_url)"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done

  compose ps || true
  compose logs --tail=80 api web || true
  error "Application did not become healthy at $(health_url)."
}

run_up() {
  run_check
  compose up -d --build
  compose ps
  wait_for_health
  info "Application is ready at http://<server-ip>:$(web_port)"
}

run_backup() {
  require_docker
  [ -f "$ENV_FILE" ] || error "$ENV_FILE is missing."
  postgres_user="$(env_value POSTGRES_USER)"
  postgres_db="$(env_value POSTGRES_DB)"
  [ -n "$postgres_user" ] || postgres_user=issueboard
  [ -n "$postgres_db" ] || postgres_db=issueboard
  timestamp="$(date +%Y%m%d-%H%M%S)"
  mkdir -p backups
  compose exec -T postgres pg_dump -U "$postgres_user" "$postgres_db" > "backups/issueboard-$timestamp.sql"
  info "Backup written: backups/issueboard-$timestamp.sql"
}

case "$COMMAND" in
  env-check)
    validate_env
    ;;
  check)
    run_check
    ;;
  up)
    run_up
    ;;
  ps|status)
    require_docker
    compose ps
    ;;
  health)
    run_health
    ;;
  logs)
    require_docker
    compose logs -f --tail=120
    ;;
  down)
    require_docker
    compose down
    ;;
  backup)
    run_backup
    ;;
  *)
    error "Usage: scripts/company-run.sh [env-check|check|up|status|health|logs|down|backup]"
    ;;
esac
