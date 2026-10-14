#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

echo "Dependencies installed. Generating Prisma types and verifying database seeding..."
npm --prefix backend run db:generate
npm --prefix backend run db:verify-seed
echo "Database seed checks completed. See the verification result above (passed or disabled)."
