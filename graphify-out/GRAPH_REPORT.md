# Graph Report - Eleva  (2026-08-12)

## Corpus Check
- 35 files · ~125,492 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 438 nodes · 672 edges · 30 communities (25 shown, 5 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e6413ad8`
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
- renderAdaptive
- statLabel
- jobMatch.js
- practiceTest.js
- practicetest.e2e.js
- Job Match Analysis (Task 10b)
- Eleva Root CLAUDE.md — graphify Integration Rules
- Task 4: Privacy Notice (minimal)
- Task 6: Prompt Caching
- completedResultCardHTML
- practice-test-flow.md
- questSummaryCard
- livelihood.e2e.js
- Eleva README.md
- DEPLOY_RAILWAY.md — Railway Deployment Guide
- Task 5: Adaptive Pathway Onboarding
- DEPLOY_HOSTINGER.md — Hostinger Deployment Guide
- Growth-Gate (12-word deterministic check)
- 3-Card Pathway Recommendation Carousel
- Claude Sonnet (not Haiku) Model Choice
- livelihood-milestone-flow.md

## God Nodes (most connected - your core abstractions)
1. `renderDashboard()` - 33 edges
2. `esc()` - 31 edges
3. `hasKey()` - 13 edges
4. `renderAdaptive()` - 12 edges
5. `completedResultCardHTML()` - 11 edges
6. `render()` - 11 edges
7. `renderOnboarding()` - 10 edges
8. `callClaude()` - 10 edges
9. `graphify Skill Definition (SKILL.md)` - 10 edges
10. `statLabel()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Growth-Gate (12-word deterministic check)` --semantically_similar_to--> `Discrete Confidence-Score Rubric (0.95/0.85/0.75/0.65/0.55)`  [INFERRED] [semantically similar]
  PRD.md → .claude/skills/graphify/references/extraction-spec.md
- `Defense-in-Depth Pattern (don't trust AI self-report, enforce in code)` --semantically_similar_to--> `graphify Honesty Rules`  [INFERRED] [semantically similar]
  PRD.md → .claude/skills/graphify/SKILL.md
- `Body Quest Completion Screen Screenshot` --references--> `Structured Physical Quest Input (Task 7b)`  [EXTRACTED]
  reference/screenshots/body-quest-completion-target.png → PRD.md
- `Eleva README.md` --references--> `server/auth.js (signup/login)`  [EXTRACTED]
  README.md → PRD.md
- `Eleva README.md` --references--> `server/index.js (Express routes)`  [EXTRACTED]
  README.md → PRD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Eleva Deployment Documentation Set** — prd_document, readme_document, deploy_railway_guide, deploy_hostinger_guide [EXTRACTED 1.00]
- **graphify Skill Documentation Set** — _claude_skills_graphify_skill_definition, _claude_skills_graphify_references_add_watch_guide, _claude_skills_graphify_references_exports_guide, _claude_skills_graphify_references_extraction_spec_prompt, _claude_skills_graphify_references_github_and_merge_guide, _claude_skills_graphify_references_hooks_guide, _claude_skills_graphify_references_query_guide, _claude_skills_graphify_references_transcribe_guide, _claude_skills_graphify_references_update_guide [EXTRACTED 1.00]
- **Eleva Adaptive Pathway Onboarding Flow** — prd_radar_7_axis_mece, prd_adaptive_scenario_cards, prd_pathway_carousel, prd_goal_capture, prd_woop_framework [INFERRED 0.85]

## Communities (30 total, 5 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.06
Nodes (26): AuthError, bcrypt, db, login(), normalizeEmail(), signup(), ai, app (+18 more)

### Community 1 - "app.js"
Cohesion: 0.05
Nodes (42): adaptiveCards, adaptiveSelection, applyCalibrationCard(), applySynergyDrag(), ARTIFACT_TYPE_LABEL, authForm, AXIS_DEFINITIONS, buildPathwayOptions() (+34 more)

### Community 2 - "claude.js"
Cohesion: 0.09
Nodes (43): AXIS_ACTIVITY_PHRASE, callClaude(), CARDIO_ACTIVITY_TYPES, computeLockTension(), coverageComplete(), FALLBACK_QUESTS, fallbackChapterAnalysis(), fallbackJobMatchAnalysis() (+35 more)

### Community 3 - "graphify Skill Definition (SKILL.md)"
Cohesion: 0.18
Nodes (11): .claude/CLAUDE.md — graphify Trigger Pointer, graphify add/--watch Reference Guide, graphify Exports & Benchmark Reference Guide, Discrete Confidence-Score Rubric (0.95/0.85/0.75/0.65/0.55), graphify Extraction Subagent Prompt Spec, graphify GitHub Clone & Cross-Repo Merge Guide, graphify Commit Hook & CLAUDE.md Integration Guide, graphify Query/Path/Explain Reference Guide (+3 more)

### Community 4 - "db.js"
Cohesion: 0.07
Nodes (14): allHistory(), createArtifact(), createQuest(), DEFAULT_STATS, getArtifactById(), getOpenQuests(), getQuestById(), listArtifacts() (+6 more)

### Community 5 - "Goal Capture (v13, bridge to First Trial)"
Cohesion: 0.15
Nodes (14): Context Update / Kondisi Hari Ini (11f), Homepage/Dashboard Redesign (4-screen nav shell), Stat Decay Mechanism (11e), Goal Capture (v13, bridge to First Trial), Practice Test completionType (Task 9), public/styles.css (design tokens), Quest Hierarchy: Primary Quest/Milestone/Today's Trial (Task 7d), Quest-Per-Goal Model (Fokus 1) (+6 more)

### Community 6 - "renderDashboard"
Cohesion: 0.13
Nodes (24): appHeaderHTML(), artifactsSheetHTML(), axisDefinitionsHTML(), durasiMenitFromFields(), esc(), fileToBase64(), helpSheetHTML(), jobApplicationFlowHTML() (+16 more)

### Community 7 - "Eleva_Prototype.jsx"
Cohesion: 0.10
Nodes (17): callClaude(), ChapterHeader(), Dashboard(), dayLabel(), ElevaApp(), FALLBACK_QUESTS, fallbackQuest(), generateQuest() (+9 more)

### Community 8 - "package.json"
Cohesion: 0.08
Nodes (25): bcrypt, cookie-session, dotenv, express, mammoth, dependencies, bcrypt, cookie-session (+17 more)

### Community 9 - "renderAdaptive"
Cohesion: 0.33
Nodes (13): api(), boot(), fetchChapterAnalysis(), fetchScenarioCard(), goalPlaceholder(), helpBtnHTML(), isStepValid(), render() (+5 more)

### Community 10 - "statLabel"
Cohesion: 0.19
Nodes (14): attachPolygonHandlers(), axisLabelLayout(), characterScreenHTML(), heptagonPath(), polyPoint(), polyRadius(), polyValueFromRadius(), radiusPoint() (+6 more)

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

### Community 18 - "completedResultCardHTML"
Cohesion: 0.18
Nodes (11): completedResultCardHTML(), elevaResponseHTML(), jobApplicationSummary(), jobMatchResultHTML(), mmss(), paceLabel(), practiceTestResultHTML(), shortfallPromptHTML() (+3 more)

### Community 20 - "questSummaryCard"
Cohesion: 0.40
Nodes (5): ensureCountdownTicking(), formatCountdown(), questSummaryCard(), sideQuestRowHTML(), tickCountdowns()

### Community 21 - "livelihood.e2e.js"
Cohesion: 0.22
Nodes (6): assert, { chromium }, { Client }, insertQuest(), seedQualifiedAnalysis(), { spawn }

### Community 22 - "Eleva README.md"
Cohesion: 0.28
Nodes (9): Task 3: Crisis Safety Hardening, Eleva PRD.md, public/app.js (vanilla JS frontend), server/claude.js (Claude API calls + fallback), server/safety.js (crisis phrase detection), SYNERGY Weight Matrix (single-pool redistribution), Eleva README.md, Eleva_Correlation_Matrix.html — Research Evidence Ledger (+1 more)

### Community 23 - "DEPLOY_RAILWAY.md — Railway Deployment Guide"
Cohesion: 0.25
Nodes (8): DATABASE_URL Environment Variable, DEPLOY_RAILWAY.md — Railway Deployment Guide, Railway Section 7: Upgrade to Postgres + Auth + Beta Gate, SESSION_SECRET Environment Variable, Railway Volume (/data mount for persistence), Task 2: Auth + Multi-Tenant + Beta Gate, BETA_CODE Invite Gate, server/auth.js (signup/login)

### Community 24 - "Task 5: Adaptive Pathway Onboarding"
Cohesion: 0.33
Nodes (7): graphify Honesty Rules, Adaptive Scenario Cards, Defense-in-Depth Pattern (don't trust AI self-report, enforce in code), Locked-Axis Erosion Mechanism (v12), lockTension Mechanism, Task 5: Adaptive Pathway Onboarding, 7-Axis MECE Radar (Body/Growth/Livelihood/Emotional/Social/Purpose/Autonomy)

### Community 25 - "DEPLOY_HOSTINGER.md — Hostinger Deployment Guide"
Cohesion: 0.29
Nodes (7): ANTHROPIC_API_KEY Environment Variable, better-sqlite3 Native Module Install Risk, Hostinger Filesystem Persistence Risk, DB_PATH Environment Variable, DEPLOY_HOSTINGER.md — Hostinger Deployment Guide, Task 1: Postgres Migration, server/db.js (Postgres access layer)

### Community 26 - "Growth-Gate (12-word deterministic check)"
Cohesion: 0.47
Nodes (6): Goodhart's Law (Growth Needs Real Substance), Growth-Gate (12-word deterministic check), server/index.js (Express routes), server/structured.js (structured evidence validation), Specificity Gate (kespesifikan, Task 7), Structured Physical Quest Input (Task 7b)

### Community 27 - "3-Card Pathway Recommendation Carousel"
Cohesion: 0.50
Nodes (4): Chapter Advancement Mechanism, 3-Card Pathway Recommendation Carousel, Pathway ≠ Chapter Principle, Pathway Rename/Reframe v8 (Architect/Warden/Weaver/Pilgrim/Specialist)

### Community 28 - "Claude Sonnet (not Haiku) Model Choice"
Cohesion: 0.50
Nodes (4): Claude Sonnet (not Haiku) Model Choice, Eleva (AI Character Growth System), Freemium Monetization Model (decided, not built), 10-Person Closed 14-Day Pilot

## Knowledge Gaps
- **136 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+131 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Eleva README.md` connect `Eleva README.md` to `DEPLOY_HOSTINGER.md — Hostinger Deployment Guide`, `Growth-Gate (12-word deterministic check)`, `DEPLOY_RAILWAY.md — Railway Deployment Guide`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `Task 5: Adaptive Pathway Onboarding` connect `Task 5: Adaptive Pathway Onboarding` to `3-Card Pathway Recommendation Carousel`, `Claude Sonnet (not Haiku) Model Choice`, `Goal Capture (v13, bridge to First Trial)`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `Defense-in-Depth Pattern (don't trust AI self-report, enforce in code)` connect `Task 5: Adaptive Pathway Onboarding` to `Growth-Gate (12-word deterministic check)`, `Eleva README.md`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _136 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05689900426742532 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05179704016913319 - nodes in this community are weakly interconnected._
- **Should `claude.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09302325581395349 - nodes in this community are weakly interconnected._