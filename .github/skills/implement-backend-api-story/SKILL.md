---
name: implement-backend-api-story
description: "Workflow for taking an approved backend HTTP API story from acceptance criteria through implementation and verification."
argument-hint: "Provide the story and acceptance criteria."
user-invocable: true
---

# Implement a Backend API Story

## When to use

Use when implementing an approved backend HTTP API story or endpoint.

## Playbook

Use this workflow to keep an API change anchored to its approved story. Shared backend architecture, design patterns, API contracts and response conventions, testing standards, and validation requirements are defined in `.github/instructions/backend.instructions.md`; follow those instructions rather than duplicating them here.

### 1. Understand the story

- Read `backend/USER_STORIES.md`, identify the selected story's acceptance criteria, and inspect the existing endpoint behavior and relevant tests.
- If any part of the story or acceptance criteria is unclear, seek clarification before proceeding by showing clickable options which user can select or provide feedback on, rather than making assumptions.
- Use the story and existing API contract to understand the intended scope. If required behavior or compatibility expectations are unclear or conflict, ask for clarification rather than inventing a decision.

### 2. Implement the story

- Implement only the approved scope needed to satisfy the acceptance criteria.
- For endpoint and contract requirements, follow the backend instructions. Do not extend the API beyond the story without approval.

### 3. Verify the outcome

- Check the implementation against each acceptance criterion and use the backend instructions to determine the required tests and validation checks.
- Distinguish verified behavior from assumptions or work that remains incomplete.
