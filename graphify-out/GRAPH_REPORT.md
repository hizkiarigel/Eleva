# Graph Report - Eleva  (2026-08-16)

## Corpus Check
- 58 files · ~484,891 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 779 nodes · 1229 edges · 55 communities (47 shown, 8 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 115 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0ef1a0e0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- app.js
- claude.js
- graphify Skill Definition (SKILL.md)
- db.js
- Goal Capture (v13, bridge to First Trial)
- realmIconSVG
- Eleva_Prototype.jsx
- package.json
- renderAdaptive
- onboarding-bridge.e2e.js
- livelihood.js
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
- quest-expiry.e2e.js
- Eleva README.md
- Growth-Gate (12-word deterministic check)
- Task 5: Adaptive Pathway Onboarding
- server/nutrition.js
- livelihood-milestone-flow.md
- nutrition.e2e.js
- soma-nutrition-flow.md
- jobMatch.js
- onboarding-radar.e2e.js
- server/listeningDiagnostic.js
- onboarding-chapter-analysis.e2e.js
- onboarding-name.e2e.js
- listening-diagnostic.e2e.js
- renderDashboard
- quest-hub.e2e.js
- renderPolygonSVG
- onboarding-bridge-audio.e2e.js
- onboarding-draft-resume.e2e.js
- questDetailPanelHTML
- generate-onboarding-audio.js
- onboarding-goal-setting.e2e.js
- wireListeningDiagnosticHandlers
- auth.js
- targets.js
- goalCardHTML
- Adaptive Scenario Cards
- structured.js
- 7-Axis MECE Radar (Body/Growth/Livelihood/Emotional/Social/Purpose/Autonomy)
- safety.js
- todayKey

## God Nodes (most connected - your core abstractions)
1. `esc()` - 53 edges
2. `renderDashboard()` - 42 edges
3. `renderAdaptive()` - 22 edges
4. `hasKey()` - 16 edges
5. `renderOnboarding()` - 14 edges
6. `render()` - 14 edges
7. `api()` - 12 edges
8. `callClaude()` - 12 edges
9. `completedResultCardHTML()` - 11 edges
10. `renderAuth()` - 10 edges

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

## Communities (55 total, 8 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.07
Nodes (19): ai, app, auth, cookieSession, db, express, jobApplication, jobMatch (+11 more)

### Community 1 - "app.js"
Cohesion: 0.03
Nodes (68): adaptiveCards, adaptiveSelection, applyCalibrationCard(), applySynergyDrag(), ARTIFACT_TYPE_LABEL, authForm, authTimers, AXIS_DEFINITIONS (+60 more)

### Community 2 - "claude.js"
Cohesion: 0.05
Nodes (64): APPLY, { looksRecoveryThemed, normalizeEvidenceSchema }, main(), { Pool }, analyzeNutritionPhoto(), AXIS_ACTIVITY_PHRASE, AXIS_PATTERN_PHRASE, callClaude() (+56 more)

### Community 3 - "graphify Skill Definition (SKILL.md)"
Cohesion: 0.22
Nodes (9): .claude/CLAUDE.md — graphify Trigger Pointer, graphify add/--watch Reference Guide, graphify Exports & Benchmark Reference Guide, graphify GitHub Clone & Cross-Repo Merge Guide, graphify Commit Hook & CLAUDE.md Integration Guide, graphify Query/Path/Explain Reference Guide, graphify Video/Audio Transcription Guide, graphify --update/--cluster-only Reference Guide (+1 more)

### Community 4 - "db.js"
Cohesion: 0.05
Nodes (25): allHistory(), createArtifact(), createFoodEntry(), createQuest(), DEFAULT_STATS, FOOD_SEED, getArtifactById(), getFoodByBarcode() (+17 more)

### Community 5 - "Goal Capture (v13, bridge to First Trial)"
Cohesion: 0.14
Nodes (15): Context Update / Kondisi Hari Ini (11f), Homepage/Dashboard Redesign (4-screen nav shell), Stat Decay Mechanism (11e), Goal Capture (v13, bridge to First Trial), Practice Test completionType (Task 9), public/app.js (vanilla JS frontend), public/styles.css (design tokens), Quest Hierarchy: Primary Quest/Milestone/Today's Trial (Task 7d) (+7 more)

### Community 6 - "realmIconSVG"
Cohesion: 0.36
Nodes (9): comingSoonRowHTML(), metaRealmDetailHTML(), metaRealmToolsHTML(), metaScreenHTML(), metaSessionPct(), realmClusterHTML(), realmIconSVG(), realmProgressCardHTML() (+1 more)

### Community 7 - "Eleva_Prototype.jsx"
Cohesion: 0.10
Nodes (17): callClaude(), ChapterHeader(), Dashboard(), dayLabel(), ElevaApp(), FALLBACK_QUESTS, fallbackQuest(), generateQuest() (+9 more)

### Community 8 - "package.json"
Cohesion: 0.08
Nodes (25): bcrypt, cookie-session, dotenv, express, mammoth, dependencies, bcrypt, cookie-session (+17 more)

### Community 9 - "renderAdaptive"
Cohesion: 0.07
Nodes (52): actingMethodCardHTML(), api(), authConsentInfoModalHTML(), authFinish(), authHelpModalHTML(), authReducedMotion(), beginPathwayBridge(), beginScenarioBridge() (+44 more)

### Community 10 - "onboarding-bridge.e2e.js"
Cohesion: 0.25
Nodes (3): assert, { chromium }, { spawn }

### Community 11 - "livelihood.js"
Cohesion: 0.18
Nodes (6): apiTests(), assert, jobApplication, jobMatch, targets, test()

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
Cohesion: 0.15
Nodes (24): artifactsSheetHTML(), axisDefinitionsHTML(), completedResultCardHTML(), elevaResponseHTML(), esc(), helpSheetHTML(), jobApplicationSummary(), jobMatchResultHTML() (+16 more)

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

### Community 24 - "quest-expiry.e2e.js"
Cohesion: 0.22
Nodes (4): assert, { chromium }, { Client }, { spawn }

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

### Community 32 - "jobMatch.js"
Cohesion: 0.22
Nodes (4): ACCEPTED_CV_MIMES, ACCEPTED_IMAGE_MIMES, mammoth, MATCH_STATUSES

### Community 33 - "onboarding-radar.e2e.js"
Cohesion: 0.33
Nodes (3): assert, { chromium }, { spawn }

### Community 34 - "server/listeningDiagnostic.js"
Cohesion: 0.15
Nodes (10): ASSESSMENT, checkWordLimit(), gradeAnswers(), MATCHING_LEGEND, norm(), QUESTIONS, validateAssessment(), _validation (+2 more)

### Community 35 - "onboarding-chapter-analysis.e2e.js"
Cohesion: 0.25
Nodes (3): assert, { chromium }, { spawn }

### Community 36 - "onboarding-name.e2e.js"
Cohesion: 0.33
Nodes (3): assert, { chromium }, { spawn }

### Community 37 - "listening-diagnostic.e2e.js"
Cohesion: 0.15
Nodes (6): assert, { chromium }, clearSpeakLog(), reachListeningIntro(), { spawn }, startActiveTest()

### Community 38 - "renderDashboard"
Cohesion: 0.10
Nodes (25): activeSomaQuest(), appHeaderHTML(), beginStructuredOrReflectiveFlow(), durasiMenitFromFields(), fileToBase64(), helpBtnHTML(), jobApplicationFlowHTML(), jobMatchFlowHTML() (+17 more)

### Community 39 - "quest-hub.e2e.js"
Cohesion: 0.22
Nodes (4): assert, { chromium }, { Client }, { spawn }

### Community 40 - "renderPolygonSVG"
Cohesion: 0.14
Nodes (22): attachPolygonHandlers(), axisLabelLayout(), chapterPoint(), chapterRadius(), characterScreenHTML(), clearActiveAxisNow(), formatRadarValue(), heptagonPath() (+14 more)

### Community 41 - "onboarding-bridge-audio.e2e.js"
Cohesion: 0.13
Nodes (7): assert, { chromium }, fillNameAndReachRadar(), FIXTURE_PATH, path, reachFirstBridge(), { spawn }

### Community 42 - "onboarding-draft-resume.e2e.js"
Cohesion: 0.25
Nodes (3): assert, { chromium }, { spawn }

### Community 43 - "questDetailPanelHTML"
Cohesion: 0.18
Nodes (11): deriveDoDChecklist(), ensureCountdownTicking(), formatCountdown(), nutritionFlowHTML(), nutritionProgressLabel(), nutritionTotalsHTML(), questCategoryIconSVG(), questDetailPanelHTML() (+3 more)

### Community 44 - "generate-onboarding-audio.js"
Cohesion: 0.22
Nodes (9): APPLY, BRIDGE_VOICE_LINES, fs, main(), onlyArg, OUTPUT_DIR, path, IMPORTANT: always listen to every generated file before committing - TTS (+1 more)

### Community 45 - "onboarding-goal-setting.e2e.js"
Cohesion: 0.25
Nodes (3): assert, { chromium }, { spawn }

### Community 46 - "wireListeningDiagnosticHandlers"
Cohesion: 0.29
Nodes (10): lstnAnsweredCount(), lstnDoSubmit(), lstnFormatMMSS(), lstnStartCountdown(), lstnStopCountdown(), lstnSubmitConfirmSheetHTML(), lstnSubmittedHTML(), lstnUpdateFooterCount() (+2 more)

### Community 47 - "auth.js"
Cohesion: 0.38
Nodes (6): AuthError, bcrypt, db, login(), normalizeEmail(), signup()

### Community 49 - "goalCardHTML"
Cohesion: 0.29
Nodes (7): goalCardAccentColor(), goalCardApprovedHTML(), goalCardBorderColor(), goalCardEditingBodyHTML(), goalCardFeedbackHTML(), goalCardHeadHTML(), goalCardHTML()

### Community 50 - "Adaptive Scenario Cards"
Cohesion: 0.40
Nodes (5): graphify Honesty Rules, Adaptive Scenario Cards, Defense-in-Depth Pattern (don't trust AI self-report, enforce in code), Locked-Axis Erosion Mechanism (v12), lockTension Mechanism

### Community 51 - "structured.js"
Cohesion: 0.50
Nodes (4): CARDIO_ACTIVITIES, num(), SPEED_CAP_KMH, validateStructuredData()

### Community 52 - "7-Axis MECE Radar (Body/Growth/Livelihood/Emotional/Social/Purpose/Autonomy)"
Cohesion: 0.50
Nodes (5): Eleva PRD.md, 7-Axis MECE Radar (Body/Growth/Livelihood/Emotional/Social/Purpose/Autonomy), SYNERGY Weight Matrix (single-pool redistribution), Eleva_Correlation_Matrix.html — Research Evidence Ledger, Body Quest Completion Screen Screenshot

### Community 54 - "todayKey"
Cohesion: 0.67
Nodes (3): startOfMonthKey(), startOfWeekKey(), todayKey()

## Knowledge Gaps
- **238 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+233 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Eleva README.md` connect `Eleva README.md` to `7-Axis MECE Radar (Body/Growth/Livelihood/Emotional/Social/Purpose/Autonomy)`, `Goal Capture (v13, bridge to First Trial)`, `DEPLOY_RAILWAY.md — Railway Deployment Guide`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `Task 5: Adaptive Pathway Onboarding` connect `Task 5: Adaptive Pathway Onboarding` to `Adaptive Scenario Cards`, `7-Axis MECE Radar (Body/Growth/Livelihood/Emotional/Social/Purpose/Autonomy)`, `Goal Capture (v13, bridge to First Trial)`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `esc()` connect `esc` to `app.js`, `realmIconSVG`, `renderDashboard`, `renderPolygonSVG`, `renderAdaptive`, `questDetailPanelHTML`, `goalCardHTML`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _238 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.030729359496482783 - nodes in this community are weakly interconnected._
- **Should `claude.js` be split into smaller, more focused modules?**
  _Cohesion score 0.053923541247484906 - nodes in this community are weakly interconnected._