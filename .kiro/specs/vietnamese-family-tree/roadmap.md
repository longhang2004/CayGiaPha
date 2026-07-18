# Product Roadmap — Cây Gia Phả

## Scope of This Document

This roadmap captures **future directions** beyond the v1 spec defined in `requirements.md`.
It is intentionally strategic rather than fully specified: each item carries enough context and
user-story framing for the team to understand *why* it matters, plus enough scope to begin
technical discovery. Full acceptance criteria will be authored in separate requirement documents
when work is scheduled.

**Agent routing:** Read this document only for product discovery, prioritization, or roadmap
planning. It is not an implementation specification and cannot override `requirements.md`,
`design.md`, or `tasks.md`.

**Source:** Market research across Vietnamese genealogy forums (J2TEAM, Facebook groups),
Reddit (r/genealogy, r/vietnameseamerican), and global genealogy product trends 2024–2026.
Cross-referenced with competitive analysis of: AKB Software, Phả Tuệ, Gia Phả Đại Việt,
giapha.org, MyTree.vn, MyHeritage, FamilySearch.

---

## Strategic Positioning

> **Goal:** Own the intersection of *modern UX* × *deep Vietnamese cultural fidelity*.
> Every competitor falls into one of two traps: culturally fluent but technically dated (AKB,
> VNGP), or technically polished but culturally shallow (MyTree.vn, MyHeritage). CayGiaPha
> must hold both axes simultaneously.

### Three Permanent Moats (must protect in every release)

1. **Kinship Resolver** — automatic, accurate `cách xưng hô` for any two nodes, any region.
   No competitor has this. It is the single most defensible technical moat.
2. **Solid / Dashed relationship model** — the asserted↔derived upgrade lifecycle that lets
   families work with incomplete data from day one.
3. **Node Claiming (collaborative ownership)** — each real person verifies and owns their own
   node, creating network effects that no single-owner tool can replicate.

---

## Release Phases

### v1 — Foundation *(current spec, `requirements.md`)*

Core graph model, Kinship Resolver (Bắc/Trung/Nam), solid/dashed relationships, node claiming,
password/Google auth, privacy controls, photo storage, search/filter, help system, accessibility.

#### Implementation Audit — 2026-07-10

The active Next.js repository contains the following v1 capabilities: password/Google authentication, tree and
person CRUD, primitive parent/spouse relationships, Vietnamese kinship resolution, privacy and
living-person redaction, photo uploads, search, share tokens, node claiming, audit/legal flows, and
basic collaboration invitations. These are the strongest current product foundations and should be
treated as existing capability rather than future roadmap work.

The production-priority runtime is Next.js full-stack with Drizzle/PostgreSQL. The Spring Boot
module is an inactive reference/future synchronization target. OTP-only sign-up/sign-in is legacy;
bounded verification codes remain relevant to recovery and person-node claiming. Checked items in
`tasks.md` are historical implementation records, not proof that the active runtime, prototypes,
and current verification are synchronized.

The following roadmap items are partially implemented:

- **F-1:** Vietnamese lunar/solar conversion, upcoming death-anniversary events, and in-app
  reminders exist. Push/email/Zalo delivery, a full monthly event view, RSVP, and rotating host
  duty do not yet exist.
- **F-4:** Collaborator invitation, joining, approval/rejection, and a contributor role exist.
  Branch-scoped permissions, read-only roles, proposed changes, approval before commit, and a
  complete change-review workflow do not yet exist.

The following items have no clear implementation in the current repository: grave/site map (F-2),
QR identity cards (F-3), oral history recording (F-5), AI narrative generation (F-6), dual-language
support (F-7), clan fund management (F-8), clan announcements and RSVP (F-9), OCR/Hán Nôm (F-10),
cross-tree discovery (F-11), health/trait tracking (F-12), and gamification (F-13).

This audit is based on the current controllers, services, entities, and frontend schema. “No clear
implementation” means the capability was not found in the repository; it is not a claim that no
prototype or external experiment exists elsewhere.

#### Current Product Gap vs. Market

Competitors such as [MyTree.vn](https://mytree.vn/), Phả Tuệ, Gia Phả Đại Việt, and giapha.org
commonly advertise visual tree browsing, import/export (Excel, GEDCOM, PDF, PNG), public clan
websites, media libraries, QR member cards, event/reminder tools, maps, and administrator/editor
permissions. CayGiaPha is currently differentiated less by feature breadth and more by its domain
depth: regional Vietnamese kinship resolution, asserted-versus-derived relationships, privacy
redaction, and node claiming.

The product risk is therefore not lack of a large feature count. It is that the current strengths are
hard to discover while several familiar migration and sharing workflows are missing. Import/export,
reviewable collaboration, reminders that reach people outside the app, and a reliable clan event
workflow should come before high-risk AI features.

#### Evidence-Based Pain Points to Validate

The market and community review surfaced recurring problems: fear that a collaborator will corrupt
the official tree; manual re-entry of names and dates from paper books or spreadsheets; loss of
photos and family knowledge in scattered Zalo/Facebook chats; uncertainty about who owns the data or
whether it can be exported; and difficulty finding graves or ancestral temples after migration.
These are hypotheses from public discussions and competitor positioning, not quantified survey
results. Product discovery should validate them with Vietnamese clan administrators and family
historians before committing to large builds.

#### Recommended Near-Term Bets

To create customer-visible value and a defensible adoption loop, prioritize in this order:

1. **Complete F-1:** monthly lunar event calendar, push/email delivery, RSVP, and rotating host
   assignment. This turns an occasional archive into a recurring family habit.
2. **Strengthen F-4:** branch editor/read-only roles, proposed changes, approval queue, locks for
   verified records, and a readable audit history. This addresses the trust barrier to inviting an
   entire clan.
3. **Add F-3:** QR profile cards with viewpoint-aware `cách xưng hô` for clan gatherings. This is
   low effort, highly demonstrable, and directly showcases the Kinship Resolver moat.
4. **Add import/export:** Excel and GEDCOM import plus PDF/PNG/GEDCOM export. This is a prerequisite
   for switching from existing tools and is more urgent than F-6/F-10 AI work.
5. **Add F-2's online slice:** grave and nhà thờ tổ coordinates, photos, and map directions first;
   defer offline navigation until real usage proves it is needed.
6. **Add F-5's capture slice:** audio recording, consent, storage, playback, and Vietnamese
   transcription before guided AI interviews or memory-book generation.
7. **Research ordered addressing for Bắc and Trung:** validate the culturally correct ordering
   conventions, eligible kinship bands, spouse inheritance, and privacy behavior independently for
   each region before extending resolver display and search. Do not assume the Southern
   `birthOrder + 1` calling-number formatter applies to either dialect.
8. **Redesign asserted-relationship creation:** research a separate, older-adult-friendly flow for
   recording a known kinship label when the intermediate family path is missing. Keep existing
   dashed edges, upgrades, conflicts, and deletion preservation working, but do not restore the old
   mixed primitive/asserted form without usability validation and clear recovery guidance.

The three best experiments for the next product cycle are: “ngày giỗ không quên”, “quét QR biết
xưng hô”, and “cộng tác nhưng không làm hỏng gia phả”. Each can be tested with a small number of
real clans before committing to the broader feature scope below.

---

### v1.1 — Cultural Utility Layer

*Theme: Make CayGiaPha indispensable for day-to-day family life, not just a data archive.*

#### F-1: Lunar Calendar Events & Death Anniversary (Ngày Giỗ) Reminders

**Why:** The single most-requested feature across every Vietnamese genealogy forum.
Families manage death anniversaries (ngày giỗ) by lunar calendar; missing one is a cultural
failure. No competitor handles this well end-to-end.

**User stories:**
- As a family member, I want to store a person's death date in lunar calendar and have the
  system convert it correctly to the Gregorian equivalent each year, so that I know the right
  date to observe the ngày giỗ.
- As a tree member, I want push notifications and in-app reminders 7, 3, and 1 day before each
  ngày giỗ, so that I never miss an observance even when I live far from home.
- As a clan administrator, I want a "This month's events" summary showing all upcoming giỗ,
  birthdays, and clan meetings in one view, so that I can coordinate without spreadsheets.
- As a clan administrator, I want to assign rotation duty ("whose turn to host the giỗ this
  year") and notify the designated family branch automatically.

**Competitive gap:** MyTree.vn — absent. Phả Tuệ — partial, limited push.

---

#### F-2: Grave & Ancestral Site Map

**Why:** Descendants living far from their hometown cannot find ancestral graves, especially
after decades of migration or post-war displacement. No competitor offers offline navigation.

**User stories:**
- As a tree owner, I want to pin GPS coordinates for each person's grave directly on a map
  within their profile, so that descendants can navigate there without asking elders.
- As a mobile user in a rural cemetery with no signal, I want to download the map and grave
  pins for offline use, so that I can still navigate when connectivity is unavailable.
- As a tree member, I want to tap a grave pin and open turn-by-turn directions in Google Maps /
  Apple Maps, so that finding the grave requires no prior knowledge of the area.
- As a tree owner, I want to pin the location of the ancestral temple (nhà thờ tổ) and any
  clan-owned land or cemetery, so that all branch members can find them independently.

**Competitive gap:** giapha.org has a basic map; no competitor has offline + navigation.

---

#### F-3: QR Identity Cards

**Why:** Clan gatherings often involve hundreds of attendees who do not know each other.
A scannable QR on a printed nametag solves instant identification without an awkward app UX.

**User stories:**
- As any person with a node in the tree, I want a personal QR code that links to my profile,
  so that anyone at a family gathering can scan it and see who I am and how they are related
  to me.
- As a meeting host, I want to generate and print a page of QR cards for all attendees, so
  that I can distribute them before the event.
- As a scan recipient, I want to see not only the scanned person's profile but also the
  computed `cách xưng hô` *from my own viewpoint*, so that I immediately know how to address them.

**Competitive gap:** giapha.org has static QR; no competitor combines QR + live kinship lookup.

---

#### F-4: Collaborative Editing with Role Hierarchy

**Why:** Large clans have formal administrative structures (ban quản lý dòng họ). The current
owner-only model does not map to this reality. MyTree.vn offers basic collaborator roles but
lacks clan-specific approval workflows.

**User stories:**
- As a clan administrator (trưởng họ), I want to invite branch editors who can propose changes
  to their own branch but require my approval before they are committed, so that the official
  record stays authoritative.
- As a branch editor, I want to submit additions or corrections to nodes in my branch without
  needing full owner rights, so that distributed maintenance is possible.
- As a tree owner, I want to grant read-only access to any tree member without allowing edits,
  so that sharing the tree does not risk unintended modifications.

---

### v1.2 — Storytelling & Memory Preservation

*Theme: Move CayGiaPha from a data tool to an emotional keepsake — the place families turn
to hear the voice of someone they have lost.*

#### F-5: Oral History Recording ("Giọng Nói Ông Bà")

**Why:** Global trend (Remento, Tell Mel) validated that recording an elder's voice is one of
the highest-value genealogy experiences. No Vietnamese competitor has implemented this.
Emotional virality: "I can hear my grandfather's voice in this app" is a word-of-mouth driver
that no feature list can match.

**User stories:**
- As a family member, I want to record audio directly within the app while interviewing an
  elderly relative, so that their voice and stories are preserved alongside their profile.
- As a recorder, I want the app to suggest guided interview questions based on the person's
  birth year and life data (e.g., "Ask about their experience during 1975"), so that I know
  what to ask even without preparation.
- As a listener, I want to play audio recordings attached to a person's profile at any time,
  so that I can experience their voice even after they are gone.
- As a tree owner, I want AI transcription of Vietnamese audio (including regional accents)
  into text, so that the story is searchable and readable by those who cannot play audio.
- As a tree owner, I want to generate a printable family memory book that embeds QR codes
  linking to each person's audio recording, so that the physical and digital archives reinforce
  each other.

**Competitive gap:** No Vietnamese competitor has this. Global: Remento, Tell Mel exist but
are not localized for Vietnamese language or cultural context.

---

#### F-6: AI Narrative Generation ("Kể Chuyện")

**Why:** Raw genealogy data (names, dates, places) is sterile. AI can weave it into a
dignified Vietnamese-language biography that honours the ancestor and engages younger readers.

**User stories:**
- As a tree owner, I want the system to auto-draft a short biography for a person using their
  stored fields and the historical events that occurred during their lifetime, so that I have a
  starting point without writing from scratch.
- As an editor, I want to review, correct, and expand the AI-generated draft before it becomes
  part of the permanent record, so that I remain in control of accuracy.
- As a tree member, I want the AI to suggest questions I could ask living relatives based on
  gaps in their profile, so that I know exactly what information is worth capturing now.

**Competitive gap:** Phả Tuệ offers văn tế generation; no competitor does full life-narrative
from structured data.

---

#### F-7: Dual-Language Support for the Vietnamese Diaspora

**Why:** An estimated 5 million Vietnamese overseas, especially second- and third-generation
Việt kiều, cannot read Vietnamese fluently. They are a premium-willingness-to-pay segment
that no current tool serves well.

**User stories:**
- As a second-generation Việt kiều, I want every person's profile and kinship term displayed
  in both Vietnamese and English, so that I can understand the tree without a translator.
- As a tree member living abroad, I want death-anniversary reminders sent in my local timezone,
  so that I receive them at the right time regardless of where I live.
- As a Việt kiều, I want the Kinship Resolver to also display the English equivalent and a
  short cultural explanation (e.g., "bác = father's older brother"), so that I understand not
  just the label but its meaning.

---

### v1.3 — Community & Clan Operations

*Theme: Upgrade CayGiaPha from a family tool to a clan operating platform.*

#### F-8: Clan Fund Management (Quỹ Họ)

**Why:** Most clans manage their fund via handwritten ledgers or shared spreadsheets, leading
to disputes and opacity. Embedding fund management in the genealogy platform creates a powerful
reason for clan administrators to choose and stay on CayGiaPha (the B2B upgrade hook).

**User stories:**
- As a clan treasurer (thủ quỹ), I want to record every income (contributions, donations,
  bank interest) and expenditure (death ceremonies, study prizes, temple repairs) with date,
  amount, and description, so that the fund history is complete and searchable.
- As a clan administrator, I want to publish a monthly fund summary to all members so that
  every contributor can see how their money is used, reducing disputes.
- As a contributor, I want to scan a VietQR code to transfer my annual contribution directly
  to the clan account and have the payment automatically logged, so that manual entry is
  eliminated.
- As a clan leader, I want an approval workflow where the treasurer proposes a disbursement and
  I must approve it before it is recorded, so that no unilateral spending is possible.
- As any member, I want to see a public leaderboard of công đức (meritorious contributions)
  so that generous donors are honoured in a way visible to the whole clan.

**Competitive gap:** No direct competitor integrates fund management. This is a standalone
feature in the market — combining it with genealogy creates a uniquely sticky product.

---

#### F-9: Clan Internal Communication

**Why:** Family groups on Facebook and Zalo are the current solution, but they lose data over
time, have no permission structure, and mix genealogy content with casual chat. A structured
announcement board within CayGiaPha keeps clan communications authoritative and permanent.

**User stories:**
- As a clan administrator, I want to post announcements (meeting dates, decisions, obituaries)
  to all tree members at once, so that important news reaches everyone without relying on
  third-party messaging apps.
- As a tree member, I want to receive notifications for announcements relevant to my branch,
  so that I am informed without being overwhelmed by the full clan feed.
- As a clan administrator, I want members to RSVP to events (họp họ, lễ giỗ) from within the
  app, so that I can gauge attendance without collecting responses by hand.

---

### v2.0 — Intelligence Layer

*Theme: Make the data in CayGiaPha work for families, not just store for them.*

#### F-10: AI-Assisted Paper Genealogy Digitisation (OCR + Hán Nôm)

**Why:** Most traditional Vietnamese genealogies are handwritten books, many in chữ Nôm or
classical Chinese. This is the single largest barrier to digitisation for old or large clans.
No competitor has a practical solution. Solving this wins the high-value B2B segment (large
traditional clans) decisively.

**User stories:**
- As a clan historian, I want to photograph pages of a handwritten genealogy book and have the
  system recognise the text (modern Vietnamese, classical Chinese, or chữ Nôm) and propose
  person nodes and relationships, so that decades of manual transcription are compressed.
- As a reviewer, I want to see the raw photo side-by-side with the AI's proposed data so that
  I can correct errors field by field before anything is saved.
- As a tree owner, I want the system to flag low-confidence recognitions so that I know which
  entries need human verification.

**Competitive gap:** Entirely absent from the Vietnamese market. Technically very hard — that
is the moat.

---

#### F-11: Cross-Tree Discovery (Opt-In)

**Why:** Many clans are related but have built separate trees independently. Connecting them
multiplies the value of every tree in the network — this is the network-effect flywheel that
eventually separates CayGiaPha from all single-tree tools.

**User stories:**
- As a tree owner, I want to opt my tree into a privacy-controlled discovery pool, so that
  other trees with overlapping ancestors can be suggested as potential connections.
- As a tree owner, I want to receive a notification when the system detects that a node in my
  tree may match a node in another opted-in tree (same name, birth year, and birthplace), so
  that I can investigate and potentially link the trees.
- As a tree owner, I want to accept or decline any proposed cross-tree link, so that no
  connection is made without my explicit consent.

---

#### F-12: Inherited Health & Trait Tracking (Privacy-Gated)

**Why:** Families increasingly want to understand hereditary health patterns. This is a
sensitive but high-value feature with no current equivalent in the Vietnamese market.

**User stories:**
- As a tree owner, I want to record health attributes (blood type, hereditary conditions) on a
  person node, so that patterns across generations can be visualised.
- As any user, I want these health fields to be private-by-default and visible only to the
  node's linked user and the tree owner, with an explicit opt-in required before they appear
  in any visualisation.
- As a tree viewer, I want to see which hereditary conditions appear across multiple
  generations in a branch, so that I can discuss relevant health risks with my doctor.

---

#### F-13: Gamification & Engagement for Younger Members

**Why:** Gen Z family members are the primary audience for long-term platform sustainability.
Research shows they engage with genealogy through discovery experiences, not data entry duties.

**User stories:**
- As a young family member, I want to earn badges for contributing to the tree (adding a photo,
  recording a story, completing a profile), so that participation feels rewarding rather than
  obligatory.
- As a tree member, I want a "completeness score" for the overall tree and for my branch,
  so that I can see at a glance what information is still missing.
- As a young member, I want weekly discovery prompts ("This week: find out where your
  great-grandparents were born"), so that I learn about my family history gradually and
  interactively.

---

## Priority Summary

| ID | Feature | Phase | Strategic Value | Effort |
|----|---------|-------|----------------|--------|
| F-1 | Lunar Calendar & Ngày Giỗ Reminders | v1.1 | ★★★★★ | Medium |
| F-2 | Grave & Ancestral Site Map | v1.1 | ★★★★☆ | Medium |
| F-3 | QR Identity Cards | v1.1 | ★★★☆☆ | Low |
| F-4 | Collaborative Editing with Role Hierarchy | v1.1 | ★★★★☆ | Medium |
| F-5 | Oral History Recording | v1.2 | ★★★★★ | High |
| F-6 | AI Narrative Generation | v1.2 | ★★★★☆ | Medium |
| F-7 | Dual-Language (Diaspora) | v1.2 | ★★★★☆ | Medium |
| F-8 | Clan Fund Management | v1.3 | ★★★★★ | High |
| F-9 | Clan Internal Communication | v1.3 | ★★★☆☆ | Medium |
| F-10 | AI OCR Hán Nôm Digitisation | v2.0 | ★★★★★ | Very High |
| F-11 | Cross-Tree Discovery | v2.0 | ★★★★★ | Very High |
| F-12 | Health & Trait Tracking | v2.0 | ★★★☆☆ | High |
| F-13 | Gamification | v2.0 | ★★★☆☆ | Medium |

---

## What This Roadmap Deliberately Defers

- **Desktop offline app** — the web PWA (offline-first) in v1.1/F-2 covers the primary
  offline need. A native desktop app is not planned unless user research shows strong demand.
- **DNA integration** — valuable globally but no Vietnamese DNA database exists.
  Deferred until a regional partner emerges.
- **Full social network features** (comments, reactions, timelines) — out of scope. CayGiaPha
  is a genealogy platform with community features, not a social network.
- **Tree merging** — explicitly deferred from v1 per `requirements.md`. Will be revisited
  after cross-tree discovery (F-11) is validated.

---

*Last updated: 2026-07-10. Maintained by the CayGiaPha product team.*
*Source research: Vietnamese genealogy forums, Facebook clan groups, Reddit r/genealogy,
global genealogy product analysis 2024–2026.*
