---
name: ctOS NYC
version: 1.0.0
team: ctOS NYC
exported: 2026-05-18T00:00:00Z
---

# Workflow Manifest: ctOS NYC

This workspace defines how work moves from the GitHub issue backlog to merged
code. One workflow file covers issue-driven feature development.

## Load Instructions

This file is the workspace index. When starting a session, read this manifest first.
Load only the workflow files relevant to your current task.
Match your task to the workflow descriptions and tags below.

```yaml
workspace:
  name: ctOS NYC
  version: 1.0.0
  team: ctOS NYC
  workflows:
    - id: feature-development
      name: Feature Development
      file: workflows/feature-development.md
      description: Issue-driven development from the GitHub backlog to a merged PR
      tags: [dev, github, issues, testing, claude-code]
      tokens: 1724
```

## Workflow Index

- **[Feature Development](workflows/feature-development.md)** — Issue-driven development from the GitHub backlog to a merged PR *(≈1,724 tokens)*
  Tags: dev, github, issues, testing, claude-code
