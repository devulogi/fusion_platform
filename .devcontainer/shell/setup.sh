#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$repo_root"
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
