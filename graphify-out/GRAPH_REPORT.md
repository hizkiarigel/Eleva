# Graph Report - Eleva  (2026-08-12)

## Corpus Check
- 43 files · ~142,037 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 521 nodes · 791 edges · 32 communities (26 shown, 6 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 97 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `26e74fbe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- app.js
- claude.js
- graphify Skill Definition (SKILL.md)
- db.js
- Goal Capture (v13, bridge to First Trial)
- renderDashboard
- Eleva_Prototype.jsx
- package.json
- render
- renderOnboarding
- jobMatch.js
- practiceTest.js
- practicetest.e2e.js
- Job Match Analysis (Task 10b)
- Eleva Root CLAUDE.md — graphify Integration Rules
- Task 4: Privacy Notice (minimal)
- Task 6: Prompt Caching
- esc
- practice-test-flow.md
- questSummaryCard
- livelihood.e2e.js
- auth.e2e.js
- DEPLOY_RAILWAY.md — Railway Deployment Guide
- Task 5: Adaptive Pathway Onboarding
- Eleva README.md
- Growth-Gate (12-word deterministic check)
- 3-Card Pathway Recommendation Carousel
- server/nutrition.js
- livelihood-milestone-flow.md
- nutrition.e2e.js
- soma-nutrition-flow.md

## God Nodes (most connected - your core abstractions)
1. `renderDashboard()` - 37 edges
2. `esc()` - 32 edges
3. `hasKey()` - 15 edges
4. `renderAdaptive()` - 12 edges
5. `render()` - 12 edges
6. `completedResultCardHTML()` - 11 edges
7. `callClaude()` - 11 edges
8. `renderOnboarding()` - 10 edges
9. `graphify Skill Definition (SKILL.md)` - 10 edges
10. `statLabel()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Growth-Gate (12-word deterministic check)` --semantically_similar_to--> `Discrete Confidence-Score Rubric (0.95/0.85/0.75/0.65/0.55)`  [INFERRED] [semantically similar]
  PRD.md → .claude/skills/graphify/references/extraction-spec.md
- `Defense-in-Depth Pattern (don't trust AI self-report, enforce in code)` --semantically_similar_to--> `graphify Honesty Rules`  [INFERRED] [semantically similar]
  PRD.md → .claude/skills/graphify/SKILL.md
- `Body Quest Completion Screen Screenshot` --references--> `Structured Physical Quest Input (Task 7b)`  [EXTRACTED]
  reference/screenshots/body-quest-completion-target.png → PRD.md
- `DEPLOY_RAILWAY.md — Railway Deployment Guide` --references--> `BETA_CODE Invite Gate`  [EXTRACTED]
  DEPLOY_RAILWAY.md → PRD.md
- `Eleva PRD.md` --references--> `Body Quest Completion Screen Screenshot`  [EXTRACTED]
  PRD.md → reference/screenshots/body-quest-completion-target.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Eleva Deployment Documentation Set** — prd_document, readme_document, deploy_railway_guide, deploy_hostinger_guide [EXTRACTED 1.00]
- **graphify Skill Documentation Set** — _claude_skills_graphify_skill_definition, _claude_skills_graphify_references_add_watch_guide, _claude_skills_graphify_references_exports_guide, _claude_skills_graphify_references_extraction_spec_prompt, _claude_skills_graphify_references_github_and_merge_guide, _claude_skills_graphify_references_hooks_guide, _claude_skills_graphify_references_query_guide, _claude_skills_graphify_references_transcribe_guide, _claude_skills_graphify_references_update_guide [EXTRACTED 1.00]
- **Eleva Adaptive Pathway Onboarding Flow** — prd_radar_7_axis_mece, prd_adaptive_scenario_cards, prd_pathway_carousel, prd_goal_capture, prd_woop_framework [INFERRED 0.85]

## Communities (32 total, 6 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.05
Nodes (28): AuthError, bcrypt, db, login(), normalizeEmail(), signup(), ai, app (+20 more)

### Community 1 - "app.js"
Cohesion: 0.05
Nodes (47): adaptiveCards, adaptiveSelection, applyCalibrationCard(), applySynergyDrag(), ARTIFACT_TYPE_LABEL, AUTH_PHASE_TIMINGS, authForm, authTimers (+39 more)

### Community 2 - "claude.js"
Cohesion: 0.06
Nodes (56): APPLY, { looksRecoveryThemed, normalizeEvidenceSchema }, main(), { Pool }, analyzeNutritionPhoto(), AXIS_ACTIVITY_PHRASE, callClaude(), CARDIO_ACTIVITY_TYPES (+48 more)

### Community 3 - "graphify Skill Definition (SKILL.md)"
Cohesion: 0.18
Nodes (11): .claude/CLAUDE.md — graphify Trigger Pointer, graphify add/--watch Reference Guide, graphify Exports & Benchmark Reference Guide, graphify GitHub Clone & Cross-Repo Merge Guide, graphify Commit Hook & CLAUDE.md Integration Guide, graphify Query/Path/Explain Reference Guide, graphify Video/Audio Transcription Guide, graphify --update/--cluster-only Reference Guide (+3 more)

### Community 4 - "db.js"
Cohesion: 0.06
Nodes (25): allHistory(), createArtifact(), createFoodEntry(), createQuest(), DEFAULT_STATS, FOOD_SEED, getArtifactById(), getFoodByBarcode() (+17 more)

### Community 5 - "Goal Capture (v13, bridge to First Trial)"
Cohesion: 0.14
Nodes (15): Context Update / Kondisi Hari Ini (11f), Homepage/Dashboard Redesign (4-screen nav shell), Stat Decay Mechanism (11e), Goal Capture (v13, bridge to First Trial), Practice Test completionType (Task 9), public/app.js (vanilla JS frontend), public/styles.css (design tokens), Quest Hierarchy: Primary Quest/Milestone/Today's Trial (Task 7d) (+7 more)

### Community 6 - "renderDashboard"
Cohesion: 0.11
Nodes (20): activeSomaQuest(), artifactsSheetHTML(), beginStructuredOrReflectiveFlow(), durasiMenitFromFields(), fileToBase64(), kisahmuScreenHTML(), kondisiRowHTML(), maturityTier() (+12 more)

### Community 7 - "Eleva_Prototype.jsx"
Cohesion: 0.10
Nodes (17): callClaude(), ChapterHeader(), Dashboard(), dayLabel(), ElevaApp(), FALLBACK_QUESTS, fallbackQuest(), generateQuest() (+9 more)

### Community 8 - "package.json"
Cohesion: 0.08
Nodes (25): bcrypt, cookie-session, dotenv, express, mammoth, dependencies, bcrypt, cookie-session (+17 more)

### Community 9 - "render"
Cohesion: 0.26
Nodes (15): api(), authReducedMotion(), authStarsHTML(), boot(), clearAuthTimers(), fetchChapterAnalysis(), fetchScenarioCard(), goalPlaceholder() (+7 more)

### Community 10 - "renderOnboarding"
Cohesion: 0.16
Nodes (17): attachPolygonHandlers(), axisLabelLayout(), characterScreenHTML(), helpBtnHTML(), heptagonPath(), isStepValid(), polyPoint(), polyRadius() (+9 more)

### Community 11 - "jobMatch.js"
Cohesion: 0.08
Nodes (12): ACCEPTED_CV_MIMES, ACCEPTED_IMAGE_MIMES, mammoth, MATCH_STATUSES, cleanTargetMetrics(), num(), apiTests(), assert (+4 more)

### Community 12 - "practiceTest.js"
Cohesion: 0.10
Nodes (16): ALL_TRACKS, BAND_ANCHORS, currentTargetFor(), emptyTrack(), estimateBand(), gradeAnswers(), migrateState(), norm() (+8 more)

### Community 13 - "practicetest.e2e.js"
Cohesion: 0.22
Nodes (4): assert, { chromium }, { Client }, { spawn }

### Community 14 - "Job Match Analysis (Task 10b)"
Cohesion: 0.50
Nodes (4): Anti-Sycophancy Principle (honest verdict), Artifacts Library (Task 10a), Job Match Analysis (Task 10b), server/jobMatch.js (job match content building)

### Community 18 - "esc"
Cohesion: 0.18
Nodes (17): appHeaderHTML(), axisDefinitionsHTML(), completedResultCardHTML(), elevaResponseHTML(), esc(), helpSheetHTML(), jobApplicationFlowHTML(), jobApplicationSummary() (+9 more)

### Community 20 - "questSummaryCard"
Cohesion: 0.25
Nodes (8): ensureCountdownTicking(), formatCountdown(), nutritionFlowHTML(), nutritionProgressLabel(), nutritionTotalsHTML(), questSummaryCard(), sideQuestRowHTML(), tickCountdowns()

### Community 21 - "livelihood.e2e.js"
Cohesion: 0.22
Nodes (6): assert, { chromium }, { Client }, insertQuest(), seedQualifiedAnalysis(), { spawn }

### Community 22 - "auth.e2e.js"
Cohesion: 0.33
Nodes (3): assert, { chromium }, { spawn }

### Community 23 - "DEPLOY_RAILWAY.md — Railway Deployment Guide"
Cohesion: 0.29
Nodes (7): DATABASE_URL Environment Variable, DEPLOY_RAILWAY.md — Railway Deployment Guide, Railway Section 7: Upgrade to Postgres + Auth + Beta Gate, SESSION_SECRET Environment Variable, Railway Volume (/data mount for persistence), Eleva PRD.md, Body Quest Completion Screen Screenshot

### Community 24 - "Task 5: Adaptive Pathway Onboarding"
Cohesion: 0.22
Nodes (11): Adaptive Scenario Cards, Claude Sonnet (not Haiku) Model Choice, Eleva (AI Character Growth System), Locked-Axis Erosion Mechanism (v12), lockTension Mechanism, Freemium Monetization Model (decided, not built), Task 5: Adaptive Pathway Onboarding, 10-Person Closed 14-Day Pilot (+3 more)

### Community 25 - "Eleva README.md"
Cohesion: 0.16
Nodes (15): ANTHROPIC_API_KEY Environment Variable, better-sqlite3 Native Module Install Risk, Hostinger Filesystem Persistence Risk, DB_PATH Environment Variable, DEPLOY_HOSTINGER.md — Hostinger Deployment Guide, Task 2: Auth + Multi-Tenant + Beta Gate, BETA_CODE Invite Gate, Task 3: Crisis Safety Hardening (+7 more)

### Community 26 - "Growth-Gate (12-word deterministic check)"
Cohesion: 0.38
Nodes (7): Discrete Confidence-Score Rubric (0.95/0.85/0.75/0.65/0.55), graphify Extraction Subagent Prompt Spec, Goodhart's Law (Growth Needs Real Substance), Growth-Gate (12-word deterministic check), server/structured.js (structured evidence validation), Specificity Gate (kespesifikan, Task 7), Structured Physical Quest Input (Task 7b)

### Community 27 - "3-Card Pathway Recommendation Carousel"
Cohesion: 0.50
Nodes (4): Chapter Advancement Mechanism, 3-Card Pathway Recommendation Carousel, Pathway ≠ Chapter Principle, Pathway Rename/Reframe v8 (Architect/Warden/Weaver/Pilgrim/Specialist)

### Community 28 - "server/nutrition.js"
Cohesion: 0.10
Nodes (14): applyContribution(), initProgressiveState(), METRIC_LABEL, METRIC_UNIT, num(), PROGRESSIVE_METRICS, MEAL_TYPE_LABEL, MEAL_TYPES (+6 more)

### Community 30 - "nutrition.e2e.js"
Cohesion: 0.25
Nodes (4): assert, { chromium }, { Client }, { spawn }

## Knowledge Gaps
- **169 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+164 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Eleva README.md` connect `Eleva README.md` to `Task 5: Adaptive Pathway Onboarding`, `Goal Capture (v13, bridge to First Trial)`, `DEPLOY_RAILWAY.md — Railway Deployment Guide`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `Task 5: Adaptive Pathway Onboarding` connect `Task 5: Adaptive Pathway Onboarding` to `3-Card Pathway Recommendation Carousel`, `Goal Capture (v13, bridge to First Trial)`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `Defense-in-Depth Pattern (don't trust AI self-report, enforce in code)` connect `graphify Skill Definition (SKILL.md)` to `Task 5: Adaptive Pathway Onboarding`, `Eleva README.md`, `Growth-Gate (12-word deterministic check)`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _169 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0524390243902439 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04591836734693878 - nodes in this community are weakly interconnected._
- **Should `claude.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06440677966101695 - nodes in this community are weakly interconnected._