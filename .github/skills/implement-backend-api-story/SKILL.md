---
name: implement-backend-api-story
description: "Tool-selection guidance for implementing an approved backend HTTP API story."
argument-hint: "Provide the API story and acceptance criteria."
user-invocable: true
---

# Backend API Story Tool Guidance

## When to use

Use when working on an approved backend HTTP API story and selecting useful tools, regardless of which agent is handling the implementation. This skill provides tool-selection guidance only; it does not define role, scope, or implementation workflow.

## Tool selection

- Use available search and file-reading tools to inspect the story, route, API contract, and relevant tests.
- Use available editing tools for source, test, and OpenAPI changes. Use available execution tools for focused tests, lint, builds, or other repository checks.
- Use configured database or MCP tools only when live database inspection is necessary and those tools are available. Do not use them to bypass the repository's migration or seeding workflow, or to perform destructive changes without explicit approval.
- Use browser or web tools only when the task specifically requires observing a running API UI or consulting external documentation.
- This skill recommends tool use; it does not grant tool access or configure MCP servers. Tool availability is determined by the active agent and environment; MCP server configuration lives outside Markdown.
- Follow `.github/instructions/backend.instructions.md` for shared backend standards. Follow the active agent's role and workflow for scope, implementation, and reporting.
