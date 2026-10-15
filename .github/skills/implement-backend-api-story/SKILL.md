---
name: implement-backend-api-story
description: "Use when implementing a backend trade API story or endpoint. Guides controller, Zod validation, service, repository, cache/event ordering, tests, and verification."
argument-hint: "Provide the story and acceptance criteria."
user-invocable: true
---

# Implement a Backend API Story

## When to use

Use for an approved backend story involving collection reads, trade creation, amendment, cancellation, or another backend HTTP workflow.

## Procedure

1. Read `.github/instructions/backend.instructions.md`, `backend/USER_STORIES.md`, and the current code/tests for the affected flow.
2. Confirm endpoint shape, fields, and domain rules. Ask about unresolved assumptions instead of filling them in silently.
3. Trace request handling through controller, service, repository, cache, and event publisher as needed.
4. Validate untrusted input with Zod at the boundary. Put use-case and trade rules in the service; keep database operations in the repository.
5. For writes, commit to PostgreSQL, update cache from the canonical saved record, then publish the typed event. Do not change cache or emit on failed persistence.
6. Update `backend/src/api-contract.ts` and its tests for every implemented or changed HTTP endpoint. This is the source used to generate the OpenAPI document served by `backend/src/api-docs.ts`. Document method/path, parameters, request and response schemas, validation/error responses, and relevant status codes. Swagger UI is served at `/api-docs` on the existing backend port.
7. Apply the RESTful API Response Design guidance below to every endpoint and its documented schemas:

   ## RESTful API Response Design

   ### Context & Objective

   Enforce consistency, predictability, and industry-standard practices across all RESTful API response bodies. This guidance ensures that the API is highly scannable, backward-compatible, and easy for frontend clients to consume.

   ### Core Directives

   #### 1. General Constraints
   - **Format:** Every response body MUST be valid JSON.
   - **Root Element:** The root element MUST always be a JSON object (`{}`). Never return primitives (strings, numbers, booleans) or bare arrays (`[]`) at the root level.
   - **Property Casing:** Use `camelCase` exclusively for all keys (e.g., `userId`, `createdAt`).
   - **Null Handling:** Do not omit keys with null values if they are part of the resource schema; explicitly set them to `null` to maintain contract predictability.

   #### 2. Payload Shapes by Request Type

   ##### Single Resource (e.g., GET /users/1)

   Return the resource object directly at the root level. Do not wrap it in a `data` envelope unless explicitly required by legacy systems.

   ```json
   {
     "id": "usr_9921b",
     "firstName": "Jane",
     "lastName": "Doe",
     "email": "jane.doe@example.com",
     "isActive": true
   }
   ```

##### Collections and Metadata

Wrap arrays under `items` and include a `pagination` metadata object. For the current trade collection, all rows are returned in one response; metadata uses `totalItems`, `currentPage`, and `totalPages` and does not mean the server paginates results. Do not add page parameters or `perPage`/`hasMore` fields unless server-side pagination is explicitly approved.

```json
{
  "items": [
    {
      "id": "usr_9921b",
      "firstName": "Jane",
      "email": "jane.doe@example.com"
    }
  ],
  "pagination": {
    "totalItems": 2,
    "currentPage": 1,
    "totalPages": 1
  }
}
```

##### Mutation Responses (e.g., POST, PUT, PATCH)

- **Creation (201 Created) / Update (200 OK):** Return the fully hydrated, updated state of the resource exactly like a single resource GET response.
- **Deletion (200 OK):** If data is returned upon deletion, use a standardized confirmation shape. Otherwise, use `204 No Content` with an empty body.

```json
{
  "id": "usr_9921b",
  "deleted": true,
  "deletedAt": "2026-10-15T23:50:00Z"
}
```

##### Error Payload (4xx and 5xx Status Codes)

All error responses MUST return a unified `error` envelope. Clients must be able to parse errors predictably regardless of which microservice threw the exception.

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The provided payload failed data validation rules.",
    "details": [
      {
        "field": "email",
        "issue": "must_be_valid_email",
        "message": "The email address format is invalid."
      }
    ]
  }
}
```

### Review Checklist for Generation

Finalized API response mock or schema:

1.  Root element is an object `{}`.
2.  All keys strictly `camelCase`.
3.  If it is a collection, wrap it under `items` and include metadata consistent with whether the endpoint actually pages results.
4.  Error payload exactly match the `error` root envelope.

5.  Run the focused tests, `npm --prefix backend run lint`, and `npm --prefix backend run build` as appropriate.

## Completion report

State implemented behavior, changed files, tests and checks run, and remaining assumptions or limitations. Distinguish implemented code from planned architecture.
