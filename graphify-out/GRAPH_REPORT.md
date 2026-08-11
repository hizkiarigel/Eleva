# Graph Report - .  (2026-08-11)

## Corpus Check
- 31 files · ~105,787 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 369 nodes · 584 edges · 18 communities (15 shown, 3 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.51)
- Token cost: 0 input · 214,533 output

## Community Hubs (Navigation)
- Server Bootstrap & Core Wiring
- Frontend App Logic (app.js)
- Claude AI Integration & Fallbacks
- Graphify Skill Documentation
- Database Layer (db.js)
- Core Product Mechanics (PRD)
- Frontend HTML View Helpers
- React Prototype Components
- NPM Package Dependencies
- Frontend API & Render Orchestration
- Radar Chart SVG Visualization
- Authentication Module (auth.js)
- Practice Test Grading
- Quest Countdown & Summary UI
- Job Match & Artifacts Feature
- Root CLAUDE.md Graphify Rules
- Privacy Notice Task
- Prompt Caching Task

## God Nodes (most connected - your core abstractions)
1. `renderDashboard()` - 31 edges
2. `esc()` - 29 edges
3. `renderAdaptive()` - 12 edges
4. `hasKey()` - 12 edges
5. `render()` - 11 edges
6. `renderOnboarding()` - 10 edges
7. `completedResultCardHTML()` - 10 edges
8. `graphify Skill Definition (SKILL.md)` - 10 edges
9. `statLabel()` - 9 edges
10. `callClaude()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Growth-Gate (12-word deterministic check)` --semantically_similar_to--> `Discrete Confidence-Score Rubric (0.95/0.85/0.75/0.65/0.55)`  [INFERRED] [semantically similar]
  PRD.md → .claude/skills/graphify/references/extraction-spec.md
- `Defense-in-Depth Pattern (don't trust AI self-report, enforce in code)` --semantically_similar_to--> `graphify Honesty Rules`  [INFERRED] [semantically similar]
  PRD.md → .claude/skills/graphify/SKILL.md
- `Eleva PRD.md` --references--> `Body Quest Completion Screen Screenshot`  [EXTRACTED]
  PRD.md → reference/screenshots/body-quest-completion-target.png
- `Body Quest Completion Screen Screenshot` --references--> `Structured Physical Quest Input (Task 7b)`  [EXTRACTED]
  reference/screenshots/body-quest-completion-target.png → PRD.md
- `DEPLOY_RAILWAY.md — Railway Deployment Guide` --references--> `BETA_CODE Invite Gate`  [EXTRACTED]
  DEPLOY_RAILWAY.md → PRD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **graphify Skill Documentation Set** — _claude_skills_graphify_skill_definition, _claude_skills_graphify_references_add_watch_guide, _claude_skills_graphify_references_exports_guide, _claude_skills_graphify_references_extraction_spec_prompt, _claude_skills_graphify_references_github_and_merge_guide, _claude_skills_graphify_references_hooks_guide, _claude_skills_graphify_references_query_guide, _claude_skills_graphify_references_transcribe_guide, _claude_skills_graphify_references_update_guide [EXTRACTED 1.00]
- **Eleva Adaptive Pathway Onboarding Flow** — prd_radar_7_axis_mece, prd_adaptive_scenario_cards, prd_pathway_carousel, prd_goal_capture, prd_woop_framework [INFERRED 0.85]
- **Eleva Deployment Documentation Set** — prd_document, readme_document, deploy_railway_guide, deploy_hostinger_guide [EXTRACTED 1.00]

## Communities (18 total, 3 thin omitted)

### Community 0 - "Server Bootstrap & Core Wiring"
Cohesion: 0.05
Nodes (25): ai, app, auth, cookieSession, db, express, jobMatch, KONDISI_LABELS (+17 more)

### Community 1 - "Frontend App Logic (app.js)"
Cohesion: 0.05
Nodes (41): adaptiveCards, adaptiveSelection, applyCalibrationCard(), applySynergyDrag(), ARTIFACT_TYPE_LABEL, authForm, AXIS_DEFINITIONS, buildPathwayOptions() (+33 more)

### Community 2 - "Claude AI Integration & Fallbacks"
Cohesion: 0.10
Nodes (40): AXIS_ACTIVITY_PHRASE, callClaude(), CARDIO_ACTIVITY_TYPES, computeLockTension(), coverageComplete(), FALLBACK_QUESTS, fallbackChapterAnalysis(), fallbackJobMatchAnalysis() (+32 more)

### Community 3 - "Graphify Skill Documentation"
Cohesion: 0.06
Nodes (40): .claude/CLAUDE.md — graphify Trigger Pointer, graphify add/--watch Reference Guide, graphify Exports & Benchmark Reference Guide, Discrete Confidence-Score Rubric (0.95/0.85/0.75/0.65/0.55), graphify Extraction Subagent Prompt Spec, graphify GitHub Clone & Cross-Repo Merge Guide, graphify Commit Hook & CLAUDE.md Integration Guide, graphify Query/Path/Explain Reference Guide (+32 more)

### Community 4 - "Database Layer (db.js)"
Cohesion: 0.07
Nodes (14): allHistory(), createArtifact(), createQuest(), DEFAULT_STATS, getArtifactById(), getOpenQuests(), getQuestById(), listArtifacts() (+6 more)

### Community 5 - "Core Product Mechanics (PRD)"
Cohesion: 0.08
Nodes (30): Adaptive Scenario Cards, Chapter Advancement Mechanism, Claude Sonnet (not Haiku) Model Choice, Context Update / Kondisi Hari Ini (11f), Homepage/Dashboard Redesign (4-screen nav shell), Stat Decay Mechanism (11e), Eleva (AI Character Growth System), Goal Capture (v13, bridge to First Trial) (+22 more)

### Community 6 - "Frontend HTML View Helpers"
Cohesion: 0.11
Nodes (30): appHeaderHTML(), artifactsSheetHTML(), completedResultCardHTML(), durasiMenitFromFields(), elevaResponseHTML(), esc(), fileToBase64(), jobMatchFlowHTML() (+22 more)

### Community 7 - "React Prototype Components"
Cohesion: 0.10
Nodes (17): callClaude(), ChapterHeader(), Dashboard(), dayLabel(), ElevaApp(), FALLBACK_QUESTS, fallbackQuest(), generateQuest() (+9 more)

### Community 8 - "NPM Package Dependencies"
Cohesion: 0.09
Nodes (21): bcrypt, cookie-session, dotenv, express, mammoth, dependencies, bcrypt, cookie-session (+13 more)

### Community 9 - "Frontend API & Render Orchestration"
Cohesion: 0.28
Nodes (15): api(), axisDefinitionsHTML(), boot(), fetchChapterAnalysis(), fetchScenarioCard(), goalPlaceholder(), helpBtnHTML(), helpSheetHTML() (+7 more)

### Community 10 - "Radar Chart SVG Visualization"
Cohesion: 0.19
Nodes (14): attachPolygonHandlers(), axisLabelLayout(), characterScreenHTML(), heptagonPath(), polyPoint(), polyRadius(), polyValueFromRadius(), radiusPoint() (+6 more)

### Community 11 - "Authentication Module (auth.js)"
Cohesion: 0.38
Nodes (6): AuthError, bcrypt, db, login(), normalizeEmail(), signup()

### Community 12 - "Practice Test Grading"
Cohesion: 0.40
Nodes (3): gradeAnswers(), norm(), QUESTION_TYPES

### Community 13 - "Quest Countdown & Summary UI"
Cohesion: 0.40
Nodes (5): ensureCountdownTicking(), formatCountdown(), questSummaryCard(), sideQuestRowHTML(), tickCountdowns()

### Community 14 - "Job Match & Artifacts Feature"
Cohesion: 0.50
Nodes (4): Anti-Sycophancy Principle (honest verdict), Artifacts Library (Task 10a), Job Match Analysis (Task 10b), server/jobMatch.js (job match content building)

## Knowledge Gaps
- **112 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Eleva README.md` connect `Graphify Skill Documentation` to `Core Product Mechanics (PRD)`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `Defense-in-Depth Pattern (don't trust AI self-report, enforce in code)` connect `Graphify Skill Documentation` to `Core Product Mechanics (PRD)`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server Bootstrap & Core Wiring` be split into smaller, more focused modules?**
  _Cohesion score 0.04756871035940803 - nodes in this community are weakly interconnected._
- **Should `Frontend App Logic (app.js)` be split into smaller, more focused modules?**
  _Cohesion score 0.053156146179401995 - nodes in this community are weakly interconnected._
- **Should `Claude AI Integration & Fallbacks` be split into smaller, more focused modules?**
  _Cohesion score 0.09634146341463415 - nodes in this community are weakly interconnected._
- **Should `Graphify Skill Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.06282051282051282 - nodes in this community are weakly interconnected._