# Graph Report - Eleva  (2026-08-12)

## Corpus Check
- 44 files · ~231,215 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 548 nodes · 846 edges · 34 communities (28 shown, 6 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 102 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `592a1476`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- app.js
- claude.js
- graphify Skill Definition (SKILL.md)
- db.js
- Goal Capture (v13, bridge to First Trial)
- questSummaryCard
- Eleva_Prototype.jsx
- package.json
- render
- attachPolygonHandlers
- jobMatch.js
- practiceTest.js
- practicetest.e2e.js
- Job Match Analysis (Task 10b)
- Eleva Root CLAUDE.md — graphify Integration Rules
- Task 4: Privacy Notice (minimal)
- Task 6: Prompt Caching
- esc
- practice-test-flow.md
- metaTargets.js
- livelihood.e2e.js
- auth.e2e.js
- DEPLOY_RAILWAY.md — Railway Deployment Guide
- Adaptive Scenario Cards
- Eleva README.md
- Growth-Gate (12-word deterministic check)
- Task 5: Adaptive Pathway Onboarding
- server/nutrition.js
- livelihood-milestone-flow.md
- nutrition.e2e.js
- soma-nutrition-flow.md
- realmIconSVG
- 7-Axis MECE Radar (Body/Growth/Livelihood/Emotional/Social/Purpose/Autonomy)

## God Nodes (most connected - your core abstractions)
1. `esc()` - 37 edges
2. `renderDashboard()` - 37 edges
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
- `Body Quest Completion Screen Screenshot` --references--> `Structured Physical Quest Input (Task 7b)`  [EXTRACTED]
  reference/screenshots/body-quest-completion-target.png → PRD.md
- `Defense-in-Depth Pattern (don't trust AI self-report, enforce in code)` --semantically_similar_to--> `graphify Honesty Rules`  [INFERRED] [semantically similar]
  PRD.md → .claude/skills/graphify/SKILL.md
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

## Communities (34 total, 6 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.05
Nodes (32): AuthError, bcrypt, db, login(), normalizeEmail(), signup(), ai, app (+24 more)

### Community 1 - "app.js"
Cohesion: 0.04
Nodes (49): adaptiveCards, adaptiveSelection, applyCalibrationCard(), applySynergyDrag(), ARTIFACT_TYPE_LABEL, AUTH_PHASE_TIMINGS, authForm, authTimers (+41 more)

### Community 2 - "claude.js"
Cohesion: 0.06
Nodes (56): APPLY, { looksRecoveryThemed, normalizeEvidenceSchema }, main(), { Pool }, analyzeNutritionPhoto(), AXIS_ACTIVITY_PHRASE, callClaude(), CARDIO_ACTIVITY_TYPES (+48 more)

### Community 3 - "graphify Skill Definition (SKILL.md)"
Cohesion: 0.22
Nodes (9): .claude/CLAUDE.md — graphify Trigger Pointer, graphify add/--watch Reference Guide, graphify Exports & Benchmark Reference Guide, graphify GitHub Clone & Cross-Repo Merge Guide, graphify Commit Hook & CLAUDE.md Integration Guide, graphify Query/Path/Explain Reference Guide, graphify Video/Audio Transcription Guide, graphify --update/--cluster-only Reference Guide (+1 more)

### Community 4 - "db.js"
Cohesion: 0.05
Nodes (25): allHistory(), createArtifact(), createFoodEntry(), createQuest(), DEFAULT_STATS, FOOD_SEED, getArtifactById(), getFoodByBarcode() (+17 more)

### Community 5 - "Goal Capture (v13, bridge to First Trial)"
Cohesion: 0.14
Nodes (15): Context Update / Kondisi Hari Ini (11f), Homepage/Dashboard Redesign (4-screen nav shell), Stat Decay Mechanism (11e), Goal Capture (v13, bridge to First Trial), Practice Test completionType (Task 9), public/app.js (vanilla JS frontend), public/styles.css (design tokens), Quest Hierarchy: Primary Quest/Milestone/Today's Trial (Task 7d) (+7 more)

### Community 6 - "questSummaryCard"
Cohesion: 0.25
Nodes (8): ensureCountdownTicking(), formatCountdown(), nutritionFlowHTML(), nutritionProgressLabel(), nutritionTotalsHTML(), questSummaryCard(), sideQuestRowHTML(), tickCountdowns()

### Community 7 - "Eleva_Prototype.jsx"
Cohesion: 0.10
Nodes (17): callClaude(), ChapterHeader(), Dashboard(), dayLabel(), ElevaApp(), FALLBACK_QUESTS, fallbackQuest(), generateQuest() (+9 more)

### Community 8 - "package.json"
Cohesion: 0.08
Nodes (25): bcrypt, cookie-session, dotenv, express, mammoth, dependencies, bcrypt, cookie-session (+17 more)

### Community 9 - "render"
Cohesion: 0.19
Nodes (20): api(), authReducedMotion(), authStarsHTML(), boot(), clearAuthTimers(), fetchChapterAnalysis(), fetchScenarioCard(), goalPlaceholder() (+12 more)

### Community 10 - "attachPolygonHandlers"
Cohesion: 0.24
Nodes (10): attachPolygonHandlers(), axisLabelLayout(), heptagonPath(), polyPoint(), polyRadius(), polyValueFromRadius(), radiusPoint(), renderPolygonSVG() (+2 more)

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
Cohesion: 0.08
Nodes (38): activeSomaQuest(), appHeaderHTML(), artifactsSheetHTML(), axisDefinitionsHTML(), beginStructuredOrReflectiveFlow(), characterScreenHTML(), completedResultCardHTML(), durasiMenitFromFields() (+30 more)

### Community 20 - "metaTargets.js"
Cohesion: 0.33
Nodes (10): cardForRealm(), clampPct(), domainForGoalIndex(), goalCardTitle(), laboraProgress(), linguaProgress(), practiceTestLib, progressFor() (+2 more)

### Community 21 - "livelihood.e2e.js"
Cohesion: 0.22
Nodes (6): assert, { chromium }, { Client }, insertQuest(), seedQualifiedAnalysis(), { spawn }

### Community 22 - "auth.e2e.js"
Cohesion: 0.33
Nodes (3): assert, { chromium }, { spawn }

### Community 23 - "DEPLOY_RAILWAY.md — Railway Deployment Guide"
Cohesion: 0.40
Nodes (5): DATABASE_URL Environment Variable, DEPLOY_RAILWAY.md — Railway Deployment Guide, Railway Section 7: Upgrade to Postgres + Auth + Beta Gate, SESSION_SECRET Environment Variable, Railway Volume (/data mount for persistence)

### Community 24 - "Adaptive Scenario Cards"
Cohesion: 0.40
Nodes (5): graphify Honesty Rules, Adaptive Scenario Cards, Defense-in-Depth Pattern (don't trust AI self-report, enforce in code), Locked-Axis Erosion Mechanism (v12), lockTension Mechanism

### Community 25 - "Eleva README.md"
Cohesion: 0.16
Nodes (15): ANTHROPIC_API_KEY Environment Variable, better-sqlite3 Native Module Install Risk, Hostinger Filesystem Persistence Risk, DB_PATH Environment Variable, DEPLOY_HOSTINGER.md — Hostinger Deployment Guide, Task 2: Auth + Multi-Tenant + Beta Gate, BETA_CODE Invite Gate, Task 3: Crisis Safety Hardening (+7 more)

### Community 26 - "Growth-Gate (12-word deterministic check)"
Cohesion: 0.38
Nodes (7): Discrete Confidence-Score Rubric (0.95/0.85/0.75/0.65/0.55), graphify Extraction Subagent Prompt Spec, Goodhart's Law (Growth Needs Real Substance), Growth-Gate (12-word deterministic check), server/structured.js (structured evidence validation), Specificity Gate (kespesifikan, Task 7), Structured Physical Quest Input (Task 7b)

### Community 27 - "Task 5: Adaptive Pathway Onboarding"
Cohesion: 0.22
Nodes (9): Chapter Advancement Mechanism, Claude Sonnet (not Haiku) Model Choice, Eleva (AI Character Growth System), Freemium Monetization Model (decided, not built), 3-Card Pathway Recommendation Carousel, Pathway ≠ Chapter Principle, Task 5: Adaptive Pathway Onboarding, Pathway Rename/Reframe v8 (Architect/Warden/Weaver/Pilgrim/Specialist) (+1 more)

### Community 28 - "server/nutrition.js"
Cohesion: 0.10
Nodes (14): applyContribution(), initProgressiveState(), METRIC_LABEL, METRIC_UNIT, num(), PROGRESSIVE_METRICS, MEAL_TYPE_LABEL, MEAL_TYPES (+6 more)

### Community 30 - "nutrition.e2e.js"
Cohesion: 0.25
Nodes (4): assert, { chromium }, { Client }, { spawn }

### Community 32 - "realmIconSVG"
Cohesion: 0.36
Nodes (9): comingSoonRowHTML(), metaRealmDetailHTML(), metaRealmToolsHTML(), metaScreenHTML(), metaSessionPct(), realmClusterHTML(), realmIconSVG(), realmProgressCardHTML() (+1 more)

### Community 33 - "7-Axis MECE Radar (Body/Growth/Livelihood/Emotional/Social/Purpose/Autonomy)"
Cohesion: 0.50
Nodes (5): Eleva PRD.md, 7-Axis MECE Radar (Body/Growth/Livelihood/Emotional/Social/Purpose/Autonomy), SYNERGY Weight Matrix (single-pool redistribution), Eleva_Correlation_Matrix.html — Research Evidence Ledger, Body Quest Completion Screen Screenshot

## Knowledge Gaps
- **174 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+169 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Eleva README.md` connect `Eleva README.md` to `7-Axis MECE Radar (Body/Growth/Livelihood/Emotional/Social/Purpose/Autonomy)`, `Goal Capture (v13, bridge to First Trial)`, `DEPLOY_RAILWAY.md — Railway Deployment Guide`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `Task 5: Adaptive Pathway Onboarding` connect `Task 5: Adaptive Pathway Onboarding` to `Adaptive Scenario Cards`, `7-Axis MECE Radar (Body/Growth/Livelihood/Emotional/Social/Purpose/Autonomy)`, `Goal Capture (v13, bridge to First Trial)`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `Defense-in-Depth Pattern (don't trust AI self-report, enforce in code)` connect `Adaptive Scenario Cards` to `Eleva README.md`, `Growth-Gate (12-word deterministic check)`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _174 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0507399577167019 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04392156862745098 - nodes in this community are weakly interconnected._
- **Should `claude.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06440677966101695 - nodes in this community are weakly interconnected._