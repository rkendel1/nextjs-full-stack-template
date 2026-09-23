# FeltDB Full-Stack Next.js Starter

## 1. What this starter is

This repository is a real Next.js App Router starter that wires together:

- `@feltdb/core`
- `@appport/services`
- `@authboundry/core`
- `appport`
- `runora`

It demonstrates one intentionally small domain: durable orders.

## 2. Architecture

```text
feltdb.flow
   │
   ├── durable collections
   ├── order capabilities
   ├── demo actors
   └── authorization policies
        │
        ▼
shared application runtime
   ├── FeltDB durable state
   ├── AppPort services runtime
   ├── AuthBoundry client/server projection contract
   └── Next.js routes and UI
```

FeltDB is the durable application state authority.

A database merely stores data.

FeltDB is the authoritative durable substrate for application state, authorization evidence, sessions, orders, and AppPort service state. React state remains presentation-only, request state remains request-local, and durable state lives in FeltDB.

## 3. Installation

```bash
npm install
```

## 4. Running locally

```bash
npm run dev
```

Then open `http://localhost:3000`.

## 5. Running tests

```bash
npm test
```

The test suite covers:

- authorized order creation
- denied mutation fail-closed behavior
- persistence across runtime reinitialization
- AppPort job creation
- Runora verification against the live Next.js app

## 6. How FeltDB works here

`feltdb.flow` is the durable contract.

The starter stores these records in FeltDB-backed state:

- `Orders`
- `AuthSessions`
- `AuthorizationEvidence`
- AppPort service collections such as `Jobs`, `ApiKeys`, and `WebhookDeliveries`

Orders are not stored in React state, request memory, SQLite, Prisma, Drizzle, or another database.

## 7. How AppPort works here

`appport.toml` declares the enabled AppPort runtime capabilities.

The shared runtime is created once in `src/lib/application.ts` through `@appport/services`' `appport()` bootstrap, so routes do not create independent runtimes.

## 8. How @appport/services works here

The starter uses AppPort Services for durable operational behavior.

When an authorized order is created, the application atomically:

1. writes the order to FeltDB-backed state
2. writes durable authorization evidence
3. enqueues the `orders.fulfill` AppPort job

That proves application state and AppPort services operate together inside one runtime.

## 9. How @authboundry/core works here

The UI uses the `@authboundry/core` client contract against `/auth/*` routes.

The starter demonstrates:

- identity
- session
- principal
- claims
- delegation
- policy lookup from `feltdb.flow`
- authorization decision
- durable evidence
- application effect

Protected mutations fail closed when no matching policy exists.

## 10. How the .flow contract works

`feltdb.flow` is authoritative for:

- durable collections
- order capabilities
- demo actors
- policy grants

The runtime parses the flow file and derives:

- capability names
- actor metadata
- policy grants used during authorization

## 11. How to add a capability

1. Add a capability block to `/home/runner/work/nextjs-full-stack-template/nextjs-full-stack-template/feltdb.flow`
2. Add or update policy blocks in the same file
3. Implement the effect in `src/domain/`
4. Expose it through a route or UI entry point
5. Add a focused test

## 12. How authorization works

For protected actions the flow is:

```text
request
  ↓
session projection
  ↓
policy lookup from feltdb.flow
  ↓
authorization decision
  ↓
allowed  -> effect + evidence + AppPort job
 denied  -> evidence only, no effect
```

`orders.create` is granted only to `demo.order_manager`.

`demo.viewer` can observe state but cannot create orders.

## 13. How to deploy

Build and run it like a normal Next.js application:

```bash
npm run build
npm run start
```

Deployment requirements:

- Node.js
- writable filesystem for the local durable FeltDB/AppPort state directory, unless you override `FELTDB_PATH`
- optional Chromium installation if you want to run the Runora browser test in that environment

## Developer commands

```bash
npm run dev
npm run build
npm run start
npm test
```
