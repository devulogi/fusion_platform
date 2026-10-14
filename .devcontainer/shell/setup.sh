#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

setup_database() {
    workspace_container="$(docker compose ps -q workspace)"
    if [[ -n "$workspace_container" ]]; then
        workspace_source="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/workspaces/fusion_platform"}}{{.Source}}{{end}}{{end}}' "$workspace_container")"
        if [[ -n "$workspace_source" ]]; then
            export BACKEND_SOURCE_PATH="$workspace_source/backend"
            export FRONTEND_SOURCE_PATH="$workspace_source/frontend"
        fi
    fi

    docker compose stop backend frontend
    docker compose up --build --detach --wait database
    docker compose exec --no-TTY database sh /database-scripts/migrate.sh
    docker compose exec --no-TTY database sh /database-scripts/seed.sh
}

if [[ "${1:-}" == "--database-only" ]]; then
    cd "$repo_root"
    setup_database
    docker compose up --detach backend frontend
    exit 0
fi

cd "$repo_root"
if ! git config --global --get-all safe.directory | grep -Fxq -- "$repo_root"; then
    git config --global --add safe.directory "$repo_root"
fi

if [[ ! -e "$repo_root/.git" ]]; then
    git init
fi

for project in backend frontend; do
    mkdir -p "$project"
    cd "$repo_root/$project"

    if [[ ! -f package.json ]]; then
        npm init -y
    fi

    npm install
done

bash "$script_dir/prettier-setup.sh"
bash "$script_dir/eslint-setup.sh"

cd "$repo_root"
npm install

echo "Applying database migrations and seeding before app startup..."
setup_database

echo "Generating Prisma client..."
npm --prefix backend run db:generate

echo "Starting backend and frontend after database setup..."
docker compose up --detach backend frontend
