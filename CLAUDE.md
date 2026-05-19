# ctOS NYC — Claude Code guide

The intent of this application is to demonstrate Rapid in-browser in-memory route planning for MTA transit in New York City. It's also testing some stylistic elements to mirror the in-game operating system ctOS from the Watchdogs video game series. This is not related to Ubisoft or any of their trademark properties. It's just an attempt to create a visual expression similar to that experience to help with MTA transit planning. And doing it all in memory using Minotor (https://github.com/aubryio/minotor), other open source libraries, and the publicly-available MTA GTFS APIs.

## Project docs

These docs govern the project. Read the relevant one before non-trivial work and
keep it current when behavior changes (the `update-docs` step in
`workflows/feature-development.md`).

- **PRD.md** — scope, workflows, success criteria, non-goals.
- **ARCHITECTURE.md** — governs every non-trivial technical decision: components,
  data model, data flows, stack, minimum versions. Read it first; do not diverge
  from it without updating it.
- **DESIGN.md** — the "Overlord" design system. Governs all UI, visual, and voice
  work. No interface change ships unless it conforms to this system.
- **WORKFLOW.md** — governs how work moves from a GitHub issue to a merged PR (see
  "Workflow context" below).

## Stack

React + Vite + TypeScript single-page app. In-browser route planning via the
`minotor` RAPTOR library; MapLibre GL for the map. A Vercel Edge Function proxies
the MTA realtime feeds. Tests run on Vitest and Playwright. See `ARCHITECTURE.md`
for minimum versions and rationale.

## Skills

Before relying on your training data you MUST evaluate and apply ALL APPLICABLE
SKILLS to your problem space. IF AND ONLY IF you do not find a skill that applies
are you allowed to fall back to your training data.

Project skills are installed in `.claude/skills/`:

| Skill | Use when |
|---|---|
| `flowz` | Creating or updating `WORKFLOW.md` and `workflows/*.md` files. |
| `humanizer` | Editing user-facing prose or Markdown docs — strip AI-writing patterns before finalizing. |
| `accelint-ts-best-practices` | Writing or reviewing TypeScript/JavaScript. |
| `accelint-ts-testing` | Writing Vitest tests for the TypeScript layer. |
| `accelint-ts-documentation` | Adding JSDoc or code comments to TypeScript. |
| `accelint-ts-performance` | Optimizing slow TypeScript/JavaScript hot paths. |
| `accelint-ts-audit-all` | Running a full multi-skill audit of TypeScript code. |

The `accelint-ts-*` skills apply to the TypeScript layer only.

## Workflow context

A `WORKFLOW.md` file exists at the project root. It is the manifest for this
team's product workflow. When starting any work session:

1. Read `WORKFLOW.md` to understand what workflow files exist.
2. Identify which workflow(s) are relevant to the current task based on
   descriptions and tags.
3. Read only those workflow files from the `workflows/` directory.
4. Only perform steps where `actor` is `agent` or `either`. Steps marked
   `actor: human` require a person and must not be executed autonomously.
5. Before starting a step, verify its inputs exist. A step's outputs become the
   required inputs for downstream steps — do not skip producing them.
6. Follow enforcement levels: complete `required` steps, use judgment on
   `recommended`, skip `optional` unless specifically helpful.
7. Prefer the listed `ai:` and `tools:` entries unless there is a documented
   reason to deviate.

## Development workflow

GitHub Issues in the remote repo are the ordered backlog. Work issues in priority
order; do not skip ahead unless the human reprioritizes. The full step contract
is in `workflows/feature-development.md`.

Per issue: read the goal, tasks, and acceptance criteria → inspect code and docs
before editing → make the smallest coherent change → add or update tests when
behavior changes → update docs when product, architecture, or workflow changes →
run the required checks → open a PR.

Branches use `issue-XX-short-description`. A PR links its issue and states what
changed, why, tests run, docs updated, and known risks or follow-ups; include
screenshots for UI changes. After a PR merges:

```
git checkout main
git pull --ff-only
```

Then take the next open issue.

## Conventions

- Make the smallest coherent change that satisfies the issue. No speculative
  abstractions, no scope creep.
- Update PRD.md, ARCHITECTURE.md, DESIGN.md, or WORKFLOW.md when a change affects
  product behavior, architecture, design, or workflow.
- Run `humanizer` over Markdown docs and user-facing copy before finalizing.
