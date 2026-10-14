#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

for project in backend frontend; do
    project_root="$repo_root/$project"
    cd "$project_root"

    if [[ -f "$project_root/eslint.config.js" ]]; then
      echo "Preserving existing ESLint configuration for $project."
      npm pkg set 'scripts.lint=eslint .' 'scripts.lint:fix=eslint . --fix'
      continue
    fi

    if [[ "$project" == "frontend" ]]; then
        cat > "$project_root/eslint.config.js" <<'EOF'
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.tsbuildinfo'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
);
EOF
    else
    cat > "$project_root/eslint.config.js" <<'EOF'
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: { allowDefaultProject: ['src/*.test.ts', 'src/seed/*.test.ts'] },
      },
    },
  },
);
EOF
    fi

    npm pkg set 'scripts.lint=eslint .' 'scripts.lint:fix=eslint . --fix'
done