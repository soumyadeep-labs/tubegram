# AGENTS.md — Tubegram Agent Instructions

This document contains high-signal, actionable context for future OpenCode sessions to ensure efficient and correct work on this repository.

## 1. Investigation Strategy
**Prioritize executable sources of truth:**
1. Read `README*`, root manifests, workspace config, and lockfiles first.
2. Inspect build, test, lint, formatter, typecheck, and codegen configs.
3. Review CI workflows and pre-commit/task runner configs.
4. Trust executable results over prose when conflicts arise.

If architecture remains unclear:
*   Inspect representative code files to find entrypoints, package boundaries, and execution flow.
*   Prefer reading files that explain system wiring over random leaf files.

## 2. Key Information to Extract (High-Signal Facts)
Focus on facts that guide agent actions:
*   **Commands:** Exact developer commands, especially non-obvious ones for running a single test, package, or focused verification step.
*   **Order:** Required command order when it matters (e.g., `lint -> typecheck -> test`).
*   **Structure:** Monorepo/multi-package boundaries and ownership of major directories/entrypoints.
*   **Quirks:** Framework quirks (codegen, migrations), build artifacts, special environment loading, dev servers, and testing prerequisites (fixtures, services).
*   **Constraints:** Important constraints from existing instruction files or the plan that affect development (e.g., rate limits, self-hosting requirements).

## 3. Writing Rules & Constraints
Include only guidance that directly impacts agent execution:
*   **Commands & Shortcuts:** Exact commands and shortcuts the agent would otherwise guess wrong.
*   **Architecture Notes:** Structural facts not obvious from filenames.
*   **Dev/Infra Quirks:** Setup requirements, environment quirks, operational gotchas (e.g., network blocking, required service setups).
*   **References:** Links to other relevant instruction sources that matter.

Exclude:
*   Generic software advice or long tutorials.
*   Obvious language conventions.
*   Speculative claims or anything unverified.

Keep sections short and use bullets. If the repo is simple, keep this file minimal.