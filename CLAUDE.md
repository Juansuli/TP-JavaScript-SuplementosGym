# CLAUDE.md

Behavioral guidelines for this repository. Based on a general-purpose
CLAUDE.md template, adapted with project-specific rules below.

**Tradeoff:** these guidelines bias toward caution over speed. For
trivial tasks, use judgment.

## 0. Project Context

- **Project:** DOSIS — AI-powered supplements e-commerce (Spanish name:
  "E-commerce de Suplementos Nutricionales con IA").
- **Course:** Desarrollo de Software, UTN FRRo.
- **Grading requirements:** defined by the course at
  https://github.com/utnfrrodsw/tp — read `README.md`, `proposal.md`,
  `docs.md`, and `FAQ.md` there before making claims about what is
  required for a given grading tier. Do not assume; verify against
  that repo.
- **Target tier: this project's scope is always "Aprobación Directa"**
  (the highest tier), not just "Regularidad". When in doubt about
  scope, default to what Aprobación Directa requires.
- **Team:** 4 first-year students, no prior professional web
  development experience. See section 5.
- **Stack:** monorepo with `frontend/` (Vite + React + React Router)
  and `backend/` (Express + MySQL, ORM not decided yet). See
  `docs/Propuesta JS.md` and `docs/casos de uso - desarrollo de
  software.md` for the actual data model and use cases — treat those
  documents as the source of truth, not this file.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
- **Be critical.** Don't just agree with a request if it conflicts
  with what's already documented in `docs/` or with the DER. Point out
  inconsistencies before implementing around them.
- Ground every suggestion in what is actually documented in this
  repository (the DER, the proposal, the use cases) — not in
  assumptions about what the project "probably" needs.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for scenarios that genuinely cannot happen.
- If you write 200 lines and it could be 50, rewrite it.
- Prefer simple, descriptive names over clever or abbreviated ones.
  A variable name should be understandable without extra context.

Ask yourself: "Would a senior engineer say this is overcomplicated?"
If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

## 5. Teaching-Oriented Assistance

**Assume the user and their teammates are still learning software
engineering and programming fundamentals.**

Current background:

* First-year Computer/Information Systems Engineering students (UTN FRRo).
* Group of 4, working together on the same repository.
* No prior professional web development experience.
* Learning JavaScript, React, and Node.js/Express as part of this project.
* Learning MySQL during coursework — little to no prior practical
  database experience.
* No ORM chosen yet for the backend.

When helping with code:

* Explain *why* code works, not just *what* it does.
* Prefer educational explanations over "black box" solutions.
* When introducing a new concept (a library, a pattern, a piece of
  syntax), briefly define it.
* Avoid assuming knowledge of advanced patterns, frameworks, or
  architecture unless they are already being used in the project.
* Break complex code into logical sections and explain the role of
  each section.
* Encourage understanding before optimization.
* Prefer clear, readable code over clever or highly condensed solutions.

The goal is not only to solve the problem, but also to help the team
gradually become capable of solving similar problems independently —
and of explaining their own code during the oral defense.

## 6. Code Language and Style

* **All generated code is always in English**: variable names,
  function names, file names, ids, CSS classes, comments, log
  messages, config metadata. No mixing Spanish and English in the same
  identifier ("spanglish").
* **Exception:** user-facing content and copy that real customers will
  read (product names, button labels, page text, accessibility labels
  read by screen readers) stays in Spanish, since the store's actual
  audience is Spanish-speaking. Academic documents under `docs/` also
  stay in Spanish (the course and professors read Spanish).
* Always humanize generated code: readable formatting, one statement
  per line, no minified/compressed style.
* Add short comments only where something is genuinely non-obvious
  (a subtle rule, a workaround, why three near-identical blocks
  exist). Don't comment what the code already says clearly through
  naming.
* No hard-to-parse names or clever abbreviations. Prefer a slightly
  longer, obvious name over a short, ambiguous one.

## 7. Defend Against the Professor, Not Against Everything

**The professor will actively try to break the app during the oral
defense — plan for that specific, real scenario. Don't invent
hypothetical ones.**

* Validate realistic inputs a professor or a distracted user would try:
  empty required fields, obviously wrong types, negative quantities,
  submitting a form twice, a product with no stock.
* Prefer code that fails loudly and clearly (a validation error, a
  4xx response) over code that fails silently or corrupts data.
* This does not override Section 2 (Simplicity First): keep validating
  what's plausible, not every theoretical edge case. "The professor
  might type a negative quantity" is realistic; "the professor might
  send a 4KB unicode string as a quantity" is not worth guarding
  against here.

## 8. Branch Safety Rules

**Never work directly on `main`. Never push. Never create or merge
Pull Requests. Never draft PR titles/descriptions/summaries.**

These rules are mandatory and take precedence over convenience.

* Assume all work must be done on a dedicated branch, never on `main`.
* Never checkout `main` to perform development work on it directly.
* Never commit development work directly onto `main`.
* Never run `git push`, `git push --force`, or any equivalent command.
* Never create Pull Requests. Never merge branches.
* Never draft, prepare, or send a PR title, description, or summary —
  the user writes and opens their own PRs, end to end.
* If asked to make changes while currently on `main`, stop and
  explicitly ask the user to create or switch to a working branch first.
* Before making changes, verify the current branch when possible.
* **Commits are allowed, but only when the user explicitly asks for a
  commit in that request.** Do not commit automatically as a side
  effect of finishing a task.
* All modifications must remain local until the user explicitly
  reviews and decides what to do with them.

The expected workflow is:

1. Work on a feature/fix branch.
2. Make only the requested changes.
3. Verify the result locally.
4. Leave changes ready for human review.
5. Commit only if explicitly asked to. Never push. Never open a PR.

Accidental modification of `main`, accidental pushes, or creating a PR
without being asked are considered critical failures.

## 9. Final Change Summary

**At the end of a completed task, summarize in Spanish what changed
— but never as a GitHub PR title/description (see Section 8).**

* Write the summary in clear, simple Spanish.
* Focus on what was modified, added, removed, or fixed, and why.
* Avoid technical jargon when simpler wording exists.
* If multiple changes were made, use a short bullet list.

Example:

Cambios realizados:

* Se agregó la validación de correo electrónico en el formulario de registro.
* Se corrigió un error que permitía enviar formularios vacíos.
* Se eliminaron importaciones sin uso generadas por esta modificación.

---

**These guidelines are working if:** fewer unnecessary changes in
diffs, fewer rewrites due to overcomplication, clarifying questions
come before implementation rather than after mistakes, and nothing
ever gets pushed or PR'd without the user doing it themselves.
