# PRD: LazyChef & Pantry Autopilot

## 1. Product overview

### 1.1 Document title and version

- PRD: LazyChef & Pantry Autopilot — Open-Source Local-First Kitchen Copilot
- Version: 1.0.0
- Date: 2026-10-20
- Challenge Context: Hacktoberfest 2026 Week 3: Slow and Steady (`#hf26challenge`)
- Partner Track Target: Best Use of Gemma / Open-Weight AI ($200)

### 1.2 Product summary

**LazyChef & Pantry Autopilot** is a local-first, privacy-preserving open-source kitchen copilot designed to eliminate decision fatigue, grocery waste, and cooking friction for exhausted professionals, busy students, and tired home cooks. Built to honor International Sloth Day and the Hacktoberfest Week 3 "Slow and Steady" ethos, LazyChef rejects the bloated paradigm of traditional cooking apps—which force users through 25-step instructions, obscure ingredient lists, and endless scrolling catalogs.

Instead, LazyChef operates under strict **Sloth Constraints**: the user dumps whatever random ingredients they currently have into their local pantry, and the system executes open-weight AI models (e.g., Google Gemma 2B via Transformers.js in WebGPU/WASM or local Ollama) entirely on-device to produce exactly **one single, optimal lazy recipe**. Every recommendation strictly adheres to the Golden Sloth Rules: maximum one pan, maximum three instructions, and under 15 minutes preparation time.

By integrating a deterministic zero-network fallback, local persistence via IndexedDB, an automated Grocery Gap checklist, and "The Lazy Payoff" analytics engine, LazyChef quantifies real-world savings in both cognitive drain and household budget while maintaining 100% data sovereignty.

---

## 2. Goals

### 2.1 Business goals

- Deliver a high-impact, production-grade submission for Hacktoberfest Week 3: Slow and Steady (`#hf26challenge`) before the deadline.
- Fulfill all qualification criteria for the **Best Use of Gemma / Open-Weight AI** partner track ($200 prize).
- Showcase best practices in edge AI execution by proving that lightweight open models (Gemma 2B) running inside client browsers via WebGPU provide immediate practical utility without expensive server infrastructure.
- Publish a comprehensive submission post on DEV utilizing the official DevRelay agent session embed tag (`{% agent_session %}`).

### 2.2 User goals

- **Zero Fridge Staring**: Eliminate 15 to 20 minutes of daily evening meal paralysis by converting random on-hand ingredients into a concrete dinner plan in under 30 seconds.
- **Minimal Kitchen Cleanup**: Ensure that cooking never creates a sink full of dishes by enforcing a strict single-vessel (one skillet, sheet pan, or bowl) constraint.
- **Fast Nourishment**: Complete the entire cooking cycle from pantry input to dining in 15 minutes or less.
- **Zero Privacy Leakage**: Keep pantry inventories, consumption habits, and dietary restrictions strictly on the user's local device without telemetry or third-party cloud logging.
- **Grocery Budget Protection**: Reduce pantry food spoilage by prioritizing expiring produce and staples, saving an estimated $30–$50 per week.

### 2.3 Non-goals (Out of Scope)

- Commercial multi-vendor e-commerce grocery delivery checkout or courier integration.
- Public social networking feeds, recipe upvoting forums, or user follower graphs.
- Cloud-hosted relational database clustering with mandatory user account creation or OAuth login walls.
- Complex multi-course culinary indexing (e.g., five-course banquet planning or fine-dining pastry techniques).
- Paid subscription paywalls or in-app advertising tracking SDKs.

---

## 3. User personas

### 3.1 Key user types

- **The Burned-Out Knowledge Worker / Developer**: Arrives home at 8:00 PM mentally drained after debugging code; wants healthy dinner with zero cognitive overhead, minimal chopping, and one skillet to wash.
- **The Budget-Conscious Student**: Possesses an erratic assortment of pantry items (canned beans, leftover rice, eggs, hot sauce); needs fast sustenance without wasting food or buying obscure spices.
- **The Hackathon Judge / Open-Source Evaluator**: Inspects technical architecture, local-first inference performance, reproducibility, and alignment with the Hacktoberfest Slow and Steady theme.

### 3.2 Basic persona details

- **Sloth Sam (Primary User)**:
  - Age: 26–34
  - Profile: Software engineer / knowledge worker living in an apartment.
  - Frustration: Stands in front of an open refrigerator for 15 minutes, gets overwhelmed by recipe search results with 18 ingredients and 4 pots, and ends up ordering expensive, unhealthy takeout.
  - Goal: Open app, click 4 ingredient tags, hit "Surprise Me Lazily", cook in 1 skillet, eat in 12 minutes.

- **Autopilot Alex (Frugal Meal Planner)**:
  - Age: 20–28
  - Profile: Graduate student with limited budget and busy schedule.
  - Frustration: Buys fresh produce that rots in the crisper drawer because complex recipes require missing specialty ingredients.
  - Goal: Track available pantry items easily, use up expiring staples, and get an automated grocery gap checklist for missing essentials.

### 3.3 Role-based access

- **Local Single User**:
  - Permissions: Complete control over local pantry inventory, cooking history, model inference preferences (In-Browser WebGPU vs. Local Ollama vs. Offline Fallback), and exportable telemetry.
  - Authentication: None required. 100% decentralized, browser-scoped state.

---

## 4. Functional requirements

- **Pantry State Management** (Priority: High)
  - Allow rapid addition, removal, and toggling of pantry ingredients via quick-tag selection, natural language comma-separated text, or one-click presets (e.g., "Student Basics", "Vegetarian Staples").
  - Categorize pantry items (Proteins, Veggies, Carbs, Sauces/Aromatics) with shelf-life urgency tags (e.g., "Use Soon").
  - Persist all pantry state client-side using `localStorage` / `IndexedDB` with zero network dependency.

- **Sloth Constraint Reasoning Engine** (Priority: Critical)
  - Enforce the **1-Vessel Rule**: Every suggested meal must be cookable using only one tool (One-Skillet, One-Pot, Sheet-Pan, or Microwave Bowl).
  - Enforce the **3-Step Rule**: Method instructions must never exceed three concise, numbered, imperatively phrased steps.
  - Enforce the **15-Minute Rule**: Preparation and active cooking time must strictly total 15 minutes or less.
  - Enforce the **Single Output Rule**: Generate exactly ONE high-confidence Lazy Recipe. Never present an overwhelming list of 50 links.
  - Provide an effort score badge (e.g., *"Sloth Level 1: 1 Pan, 1 Spoon, 0 Knives"*).

- **Open-Source Local AI Inference Adapter** (Priority: Critical)
  - Implement an in-browser inference seam using `@huggingface/transformers` (Transformers.js) with WebGPU acceleration and WASM fallback.
  - Target Google Gemma open-weight models (e.g., Gemma 2B quantized) or comparable lightweight SLMs (SmolLM2-1.7B / Qwen2.5-1.5B-Instruct).
  - Provide an optional local service connector targeting Ollama REST endpoints (`http://localhost:11434/api/generate`) for desktop users running native Gemma 2.
  - Utilize structured prompt engineering with strict JSON output schemas to guarantee adherence to Sloth Constraints.

- **Deterministic Offline Fallback Engine** (Priority: High)
  - Guarantee instant (<100ms) zero-latency meal recommendations without downloading model weights or requiring WebGPU capabilities.
  - Match ingredient combinations using a heuristic rule matrix (e.g., Eggs + Rice + Soy Sauce = 10-Min Garlic Butter Fried Rice).
  - Activate automatically if WebGPU is unsupported, model download is pending, or device memory is constrained.

- **The Lazy Payoff Analytics Dashboard** (Priority: High)
  - Compute cumulative time saved from eliminated decision fatigue (benchmarked at 15 minutes per session).
  - Compute estimated money saved from diverted grocery waste and averted takeout orders (benchmarked at $6.50 per meal).
  - Calculate dish cleanup reduction (benchmarked at 3 pans saved per meal).
  - Display gamified Sloth badges (e.g., *"Master of the One-Pan"*, *"Pantry Alchemist"*).

- **Grocery Gap & Missing Staples Checklist** (Priority: Medium)
  - Identify when a pantry selection is 1 optional ingredient away from culinary excellence (e.g., "You have rice, eggs, and garlic; adding green onions would elevate this").
  - Generate an instant, copyable one-click shopping list for missing essentials.

- **Hacktoberfest DevRelay Session & Submission Exporter** (Priority: High)
  - Provide a one-click exporter formatted according to the official DEV `#hf26challenge` template (`submission-template.md`).
  - Allow users to export AI agent session transcripts with ready-to-paste `{% agent_session %}` Liquid tags.

---

## 5. User experience

### 5.1 Entry points & first-time user flow

1. **Landing & Initialization**:
   - The user opens the web application. A zero-friction splash screen presents an opinionated warm culinary theme (Warm Parchment `#F9F7F2`, Olive Moss `#3E5235`, Terracotta Clay `#C85A32`, Espresso Charcoal `#181614`).
   - The app checks for local WebGPU support and model cache status in the background without blocking the UI.
2. **Instant Pantry Setup**:
   - First-time users see interactive pill badges representing common pantry items (e.g., Eggs, Rice, Pasta, Garlic, Butter, Canned Tuna, Spinach).
   - Clicking pills immediately populates their local Pantry State. An input bar allows typing custom items.
3. **One-Click Action**:
   - A prominent, pulsing primary CTA reads: **"Cook Lazily"** (or *"Generate My Sloth Meal"*).

### 5.2 Core experience

```
┌─────────────────────────────────────────────────────────────┐
│                       LAZYCHEF UI                           │
├─────────────────────────────────────────────────────────────┤
│  [Pantry Input]                                             │
│  Selected: [Eggs ×] [Leftover Rice ×] [Soy Sauce ×] [Butter ×]│
│  + Quick Add: [Garlic] [Cheese] [Noodles]                   │
├─────────────────────────────────────────────────────────────┤
│  [AI Engine Status: In-Browser Gemma 2B (WebGPU Active)]    │
│  Sloth Setting: [● Ultra Lazy (1 Pan / <15m)]               │
│                                                             │
│  [BUTTON: "Feed Me with Minimum Effort"]                    │
├─────────────────────────────────────────────────────────────┤
│  RECOMMENDATION: "10-Minute Garlic Butter Egg Fried Rice"   │
│  • Sloth Level: 1 Pan | 1 Spatula | 0 Chopping Boards       │
│  • Cook Time: 9 minutes                                     │
│                                                             │
│  Step 1: Melt butter in skillet over medium heat. Crack egg │
│  Step 2: Dump cold leftover rice directly into pan with soy │
│  Step 3: Toss vigorously for 3 minutes until steaming. Eat! │
├─────────────────────────────────────────────────────────────┤
│  [The Lazy Payoff]                                          │
│  ⏱️ 17 mins saved | 🍳 2 pans avoided | 💰 $7.50 saved      │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 UI/UX highlights & Edge cases

- **Visual Tone**: Warm, organic, uncluttered culinary aesthetic. High contrast, clean typography (Outfit / Inter), micro-animations on button hover, zero generic AI placeholders.
- **Edge Case — Empty Pantry**: If user clicks generate with zero ingredients selected, the system suggests a "Desperation Staples" pantry prompt or recommends a 5-minute pantry survival meal.
- **Edge Case — Hardware Constraint**: If WebGPU is unavailable or browser memory is low, seamlessly switch to the deterministic rules engine with an informative toast: *"Using Instant Offline Sloth Engine (Zero Download)"*.
- **Edge Case — Obscure / Toxic Ingredients**: Safety filter prevents hallucination of dangerous non-food items and rejects inedible inputs.

---

## 6. Narrative

It is 8:15 PM on a Tuesday. Sam, a software developer, closes their laptop after a grueling 9-hour day of sprint releases. Sam is hungry, tired, and mentally spent. Walking into the kitchen, Sam opens the refrigerator door and stares blankly at the shelves for 10 minutes. There is leftover jasmine rice from Sunday, three eggs, half a stick of salted butter, a wilted scallion, and soy sauce. The thought of browsing cooking blogs with 10,000-word backstories, 20 ingredients, and a sink full of dirty pots causes instant dread.

Sam opens LazyChef on their phone or laptop. With three taps, Sam selects *Eggs*, *Leftover Rice*, and *Soy Sauce*. Sam taps **"Feed Me with Minimum Effort"**. Within 3 seconds, LazyChef's local Gemma model outputs a single recipe: **"9-Minute Garlic Butter Fried Rice"**. The instructions are just three steps, requiring only one skillet and a single wooden spoon. No chef knife required. 

Sam cooks the meal in 9 minutes, eats directly from the bowl, washes the single skillet in 45 seconds, and sits down to relax. The Lazy Payoff dashboard confirms: 18 minutes of decision paralysis avoided, $8.50 saved compared to food delivery, and 3 dirty pans spared. Sam spent zero mental energy and enjoyed a hot, homemade dinner.

---

## 7. Success metrics

### 7.1 User-centric metrics

- **Decision Latency**: Average time from app launch to recipe display < 30 seconds.
- **Vessel Count**: 100% of generated recipes require strictly 1 cooking vessel.
- **Preparation & Cooking Duration**: 100% of recipes can be executed in <= 15 minutes.
- **Step Limit**: 100% of recipes have <= 3 instructions.

### 7.2 Business & Hackathon metrics

- **Hacktoberfest Week 3 Compliance**: 100% adherence to the "Slow and Steady" theme criteria and submission template.
- **Gemma Partner Category Qualification**: Proven demonstration of open-weight Google Gemma execution (in-browser or local Ollama).
- **Open Innovation Narrative**: High-engagement DEV challenge post clearly articulating why open innovation and local privacy matter.
- **DevRelay Session Replay**: Successful capture and Liquid tag embedding of the AI agent development session.

### 7.3 Technical metrics

- **Inference Time (WebGPU Gemma 2B)**: First token in < 2.5 seconds; total recipe generation < 6 seconds.
- **Deterministic Fallback Latency**: Recipe generation < 50 milliseconds.
- **Client Bundle Size**: Core web application < 350 KB (excluding cached neural weights).
- **Offline Reliability**: 100% functionality when disconnected from the internet once web app and assets are cached.
- **Zero Cloud Leakage**: 0 network requests containing user pantry data sent to external servers.

---

## 8. Technical considerations (Input for Engineering Team)

### 8.1 Integration points

- **Transformers.js (`@huggingface/transformers`)**: Client-side execution of ONNX/WebGPU quantized open-weight language models.
- **Local Ollama Seam (REST)**: Optional localhost bridge (`http://localhost:11434/api/generate`) with automatic CORS detection.
- **DevRelay MCP Gateway**: Integration for session recording, challenge entry management, and DEV post drafting.
- **Web Storage APIs**: LocalStorage and IndexedDB for persistence of inventory, favorites, and payoff history.

### 8.2 Data storage & privacy

- All data—including ingredient inventories, dietary restrictions, cooking logs, and payoff metrics—resides exclusively on the user's browser device.
- No third-party cookies, tracking pixels, or remote telemetry collectors are loaded.

### 8.3 Scalability & potential technical challenges

- **Client Hardware Heterogeneity**: Varying GPU capabilities across mobile phones and low-end laptops require graceful tiered degradation: `WebGPU -> WASM -> Heuristic Fallback`.
- **Weight Download Overhead**: Initial download of 1B–2B quantized weights requires clear progress indicators, non-blocking background streaming, and immediate fallback availability.
- **Model Hallucination & Sloth Guardrails**: Enforcing JSON Schema validation or regex constraint checking on model outputs to guarantee that steps do not exceed 3 and vessels do not exceed 1.

---

## 9. Milestones & sequencing

### 9.1 Project estimate & Team composition

- **Size**: Small Hackathon Sprint (3 to 4 days)
- **Team**: 1 Senior Fullstack AI Engineer + 1 Senior Product Manager

### 9.2 Suggested phases

- **Phase 1: Foundation & Sloth Engine (Day 1)**:
  - Implement Vanilla CSS design system, responsive UI shell, and pantry state store.
  - Implement deterministic heuristic recipe generator adhering strictly to Sloth Constraints.
- **Phase 2: Local Open-Weight AI Seam (Day 2)**:
  - Integrate `@huggingface/transformers` for in-browser Gemma 2B / SmolLM2 inference via WebGPU.
  - Wire Ollama local adapter as optional power-user setting.
  - Implement JSON schema enforcement for generated recipes.
- **Phase 3: The Lazy Payoff & Grocery Gap (Day 3)**:
  - Build The Lazy Payoff calculation engine and visual dashboard.
  - Implement Grocery Gap checklist and shopping list clipboard exporter.
- **Phase 4: Hacktoberfest Submission & Polish (Day 4)**:
  - Perform browser testing, accessibility check, and offline testing.
  - Generate DEV submission draft using `submission-template.md` and DevRelay agent session embed.

---

## 10. User stories & Acceptance Criteria

### 10.1. One-Tap Pantry Inventory Input

- **ID**: GH-001
- **Story**: As a tired user, I want to quickly tap or type ingredients I have in my fridge, so that I don't waste time typing complex descriptions or quantities.
- **Acceptance criteria**:
  - [ ] User can click pre-defined ingredient badges (e.g., Eggs, Rice, Cheese, Tomato) to toggle them into the pantry.
  - [ ] User can type comma-separated items in an input field and press Enter to add multiple items at once.
  - [ ] Pantry items are automatically saved to `localStorage` and persist across page refreshes.
  - [ ] User can clear individual items or empty the entire pantry with one click.

### 10.2. Strict Sloth Constraint Recipe Generation

- **ID**: GH-002
- **Story**: As an exhausted cook, I want the system to output exactly ONE recipe with maximum 1 pan, maximum 3 steps, and under 15 minutes, so that I am never overwhelmed by cooking chores.
- **Acceptance criteria**:
  - [ ] The generated output presents exactly one recipe, never a multi-item search list.
  - [ ] The recipe explicitly specifies a single cooking vessel (e.g., skillet, pot, baking sheet, or microwave bowl).
  - [ ] The recipe contains no more than 3 distinct numbered instructions.
  - [ ] The total estimated preparation and cooking time is strictly <= 15 minutes.
  - [ ] The UI displays a prominent "Sloth Effort Badge" detailing vessel count and prep time.

### 10.3. In-Browser Open-Weight Model Inference (Gemma 2B)

- **ID**: GH-003
- **Story**: As an open-source advocate and privacy-minded user, I want recipe generation to run locally on my machine using open-weight models, so that my personal data stays private and I can use the tool offline.
- **Acceptance criteria**:
  - [ ] The application integrates `@huggingface/transformers` to run open-weight models (Gemma 2B / SmolLM2 / Qwen2.5) in-browser.
  - [ ] Model weights are loaded with a clear, non-intrusive progress bar.
  - [ ] If WebGPU is supported, inference utilizes WebGPU hardware acceleration; otherwise, it falls back to WASM or the offline rule engine.
  - [ ] Output generation adheres to structured JSON schemas matching recipe requirements.

### 10.4. Instant Deterministic Fallback Mode

- **ID**: GH-004
- **Story**: As a user on low-end hardware or with a slow internet connection, I want an instant fallback recipe generator, so that I don't have to wait for large neural weights to download before cooking.
- **Acceptance criteria**:
  - [ ] When the user clicks "Cook Instantly (Offline Mode)", a recipe is generated in < 100ms using the heuristic rule engine.
  - [ ] The deterministic recipe strictly adheres to all Sloth Constraints (1 pan, 3 steps, <15 min).
  - [ ] The system displays an informative badge indicating that offline instant mode was utilized.

### 10.5. The Lazy Payoff Dashboard

- **ID**: GH-005
- **Story**: As a user, I want to see how much time, money, and cleaning effort I saved by using LazyChef, so that I feel rewarded for practicing sustainable, low-stress cooking.
- **Acceptance criteria**:
  - [ ] Dashboard displays cumulative minutes saved (15 minutes benchmark per meal).
  - [ ] Dashboard displays estimated grocery money saved ($6.50 benchmark per meal).
  - [ ] Dashboard displays dish count reduction (minimum 2 pans saved per meal).
  - [ ] Payoff statistics persist in local storage and update immediately after a recipe is completed.

### 10.6. Grocery Gap & Missing Staples Checklist

- **ID**: GH-006
- **Story**: As a cook missing one critical ingredient, I want LazyChef to highlight the single optional staple that would make my meal better, so that I can decide whether to grab it or cook without it.
- **Acceptance criteria**:
  - [ ] The generated recipe highlights a "Grocery Gap" section with maximum 1-2 optional staple suggestions.
  - [ ] The user can click a "Copy Missing Staples" button to copy items to their clipboard formatted as a clean shopping list.

### 10.7. Hacktoberfest Week 3 DevRelay Telemetry & Exporter

- **ID**: GH-007
- **Story**: As a hackathon participant, I want to export my project summary and agent session directly formatted for DEV (`#hf26challenge`), so that I can submit to the hackathon with zero manual post-formatting friction.
- **Acceptance criteria**:
  - [ ] The application provides an export modal with pre-filled markdown matching `submission-template.md`.
  - [ ] The exported markdown includes "What I Built", "How I Built It", "Why Does Open Innovation Matter?", "The Lazy Payoff", and "Prize Categories (Best Use of Gemma)".
  - [ ] Ready-to-paste DevRelay `{% agent_session %}` Liquid tag is generated.
