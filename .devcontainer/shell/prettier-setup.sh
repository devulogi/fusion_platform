#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

for project in backend frontend; do
    project_root="$repo_root/$project"
    cd "$project_root"

    cat > "$project_root/.prettierrc.json" <<'EOF'
{
        "singleQuote": true,
        "semi": true,
        "trailingComma": "all",
        "printWidth": 100,
        "tabWidth": 4,
        "endOfLine": "lf"
}
EOF

    cat > "$project_root/.prettierignore" <<'EOF'
node_modules/
dist/
coverage/
package-lock.json
*.tsbuildinfo
EOF

    npm pkg set 'scripts.format=prettier --write .' 'scripts.format:check=prettier --check .'
done