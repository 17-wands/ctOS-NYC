---
name: Feature Development
version: 1.0.0
description: Issue-driven development from the GitHub backlog to a merged PR.
tags: [dev, github, issues, testing, claude-code]
exported: 2026-05-18T00:00:00Z
---

# Workflow: Feature Development

This workflow takes one GitHub issue from the ordered backlog through to a merged
pull request. Work issues in priority order; do not skip ahead unless the human
reprioritizes. See `WORKFLOW.md` in the project root for the full workspace manifest.

## Conventions

- `actor: human` — must be performed by a person
- `actor: agent` — can be fully delegated to an AI agent
- `actor: either` — human or agent, at the team's discretion
- `enforcement: required` — this step must be completed before proceeding
- `enforcement: recommended` — skip only with documented justification
- `enforcement: optional` — use at team discretion
- `alternatives` — acceptable substitutes when the primary tool is unavailable

---

## Steps

```yaml
workflow:
  id: feature-development
  name: Feature Development
  steps:
    - id: select-issue
      name: Select Issue and Branch
      description: Take the next open issue from the backlog in priority order; read its goal, tasks, and acceptance criteria. Create a branch named issue-XX-short-description.
      inputs:
        - "GitHub issue backlog"
        - "Updated local main"
      outputs:
        - "Selected issue"
        - "Feature branch"
      ai: []
      tools:
        - name: GitHub Issues
          type: saas
          required: true
          alternatives: []
        - name: git
          type: cli
          required: true
          alternatives: []
      actor: either
      enforcement: required
      notes: "Do not skip ahead in the backlog unless the human explicitly reprioritizes."

    - id: inspect-context
      name: Inspect Code and Docs
      description: Inspect the code, PRD.md, ARCHITECTURE.md, and WORKFLOW.md relevant to the issue before editing anything.
      inputs:
        - "Selected issue"
        - "Feature branch"
      outputs:
        - "Implementation notes"
      ai:
        - name: Claude
          model: claude-opus-4-7
          skills: []
          harness: claude-code
      tools:
        - name: Claude Code
          type: ide
          required: true
          alternatives: []
      actor: agent
      enforcement: required

    - id: implement-change
      name: Implement Change
      description: Make the smallest coherent change that satisfies the issue. No speculative abstractions and no scope creep.
      inputs:
        - "Selected issue"
        - "Implementation notes"
      outputs:
        - "Code changes"
      ai:
        - name: Claude
          model: claude-opus-4-7
          skills: [accelint-ts-best-practices, accelint-ts-performance]
          harness: claude-code
      tools:
        - name: Claude Code
          type: ide
          required: true
          alternatives: []
      actor: agent
      enforcement: required

    - id: update-tests
      name: Add or Update Tests
      description: Add or update tests whenever behavior changes, covering the acceptance criteria from the issue.
      inputs:
        - "Code changes"
        - "Selected issue"
      outputs:
        - "Updated tests"
      ai:
        - name: Claude
          model: claude-opus-4-7
          skills: [accelint-ts-testing]
          harness: claude-code
      tools:
        - name: Vitest
          type: cli
          required: true
          alternatives: []
        - name: pytest
          type: cli
          required: true
          alternatives: []
      actor: agent
      enforcement: required

    - id: update-docs
      name: Update Documentation
      description: Update PRD.md, ARCHITECTURE.md, or WORKFLOW.md when the change affects product behavior, architecture, or workflow.
      inputs:
        - "Code changes"
      outputs:
        - "Updated docs"
      ai:
        - name: Claude
          model: claude-opus-4-7
          skills: [humanizer, accelint-ts-documentation]
          harness: claude-code
      tools:
        - name: Claude Code
          type: ide
          required: true
          alternatives: []
      actor: agent
      enforcement: recommended
      notes: "Skip only when the change has no product, architecture, or workflow impact."

    - id: run-checks
      name: Run Checks
      description: Run the checks for the layer touched — npm jobs:validate, test, test:e2e, build for TypeScript
      inputs:
        - "Code changes"
        - "Updated tests"
      outputs:
        - "Check results"
      ai: []
      tools:
        - name: npm
          type: cli
          required: true
          alternatives: []
      actor: agent
      enforcement: required
      notes: "If a check command does not exist yet, implement it in this issue or explain why it is unavailable."

    - id: open-pr
      name: Open Pull Request
      description: Open a PR from the feature branch summarizing what changed, why, tests run, docs updated, and known risks or follow-ups.
      inputs:
        - "Code changes"
        - "Updated tests"
        - "Updated docs"
        - "Check results"
      outputs:
        - "Pull request"
      ai: []
      tools:
        - name: GitHub CLI
          type: cli
          required: true
          alternatives: ["GitHub web"]
      actor: either
      enforcement: required
      notes: "Link the issue. Add screenshots for UI changes. The PR body is the change summary."

    - id: review-merge
      name: Review and Merge
      description: A person reviews the PR against the issue's acceptance criteria and merges it on GitHub.
      inputs:
        - "Pull request"
      outputs:
        - "Merged PR"
      ai: []
      tools:
        - name: GitHub
          type: saas
          required: true
          alternatives: []
      actor: human
      enforcement: required

    - id: return-to-main
      name: Return to Main
      description: After merge, switch the local repo to main and fast-forward, then return to select the next issue.
      inputs:
        - "Merged PR"
      outputs:
        - "Updated local main"
      ai: []
      tools:
        - name: git
          type: cli
          required: true
          alternatives: []
      actor: either
      enforcement: required
      notes: "Run git checkout main and git pull --ff-only."
```
