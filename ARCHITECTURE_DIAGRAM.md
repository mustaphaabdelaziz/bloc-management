# Auto-Code Generation Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CODE AUTO-GENERATION SYSTEM                    │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
FONCTION CODE GENERATION
═══════════════════════════════════════════════════════════════════════

    User Form                Model Layer              Database
    ┌──────────┐             ┌─────────┐             ┌────────┐
    │ Fonction │             │ pre-save│             │MongoDB │
    │   Form   │ ─submit───> │  Hook   │ ─save───→  │Instance│
    │ Name     │             │         │             │FCT0001 │
    │ (no code)│             │Generate │             │FCT0002 │
    └──────────┘             │FCT0001, │             │FCT0003 │
                             │FCT0002  │             │  ...   │
                             └─────────┘             └────────┘
                                  ▲
                                  │
                            Count Existing
                            Fonctions
                            (Global)


═══════════════════════════════════════════════════════════════════════
PRESTATION CODE GENERATION (Per-Specialty)
═══════════════════════════════════════════════════════════════════════

User Form             Model Layer            Database
┌─────────────┐       ┌──────────┐           ┌──────────┐
│ Prestation  │       │ pre-save │           │ MongoDB  │
│   Form      │       │  Hook    │           │Specialty │
│ Specialty:  │       │          │───get─→   │ORT (code)│
│  ORT        │─sub─→ │Populate  │           │          │
│ Design:     │  mit  │Specialty │  ─count─→ │For ORT:  │
│ "Surgery A" │       │          │ Prestations
│ (no code)   │       │Generate  │           │CO-ORT-001│
└─────────────┘       │CO-ORT-001│           │CO-ORT-002│
                      │CO-ORT-002│           │CO-ORT-003│
                      └──────────┘           │          │
                            ▲                │For CAR:  │
                            │                │CO-CAR-001│
                      Count For              │CO-CAR-002│
                      This Specialty         └──────────┘
                      (Per-Specialty
                       Counter)


═══════════════════════════════════════════════════════════════════════
SURGERY CODE GENERATION (Per-Year)
═══════════════════════════════════════════════════════════════════════

User Form             Model Layer            Database
┌─────────────┐       ┌──────────┐           ┌──────────┐
│ Surgery     │       │ pre-save │           │ MongoDB  │
│   Form      │       │  Hook    │           │Surgeries │
│ Patient     │       │          │           │          │
│ Surgeon     │       │Get Year  │───get─→   │2025:     │
│ Prestation  │─sub─→ │from      │ createdAt │2025/0001 │
│ Dates       │  mit  │createdAt │           │2025/0002 │
│ (no code)   │       │          │  ─count─→ │2025/0003 │
└─────────────┘       │Generate  │           │          │
                      │2025/00001│           │2024:     │
                      │2025/00002│           │2024/0152 │
                      └──────────┘           │2024/0153 │
                            ▲                │2024/0154 │
                            │                └──────────┘
                      Count For
                      This Year
                      (Per-Year
                       Counter)


═══════════════════════════════════════════════════════════════════════
FORM CHANGES
═══════════════════════════════════════════════════════════════════════

BEFORE                          AFTER
──────────────────────────────  ──────────────────────────────────
Fonction New Form:              Fonction New Form:
├─ Code: [____] *required       ├─ Name: [____] *required
├─ Name: [____] *required       └─ [Cancel] [Save]
└─ [Cancel] [Save]

Fonction Edit Form:             Fonction Edit Form:
├─ Code: [____] *required       ├─ Code: [FCT0001] (readonly)
├─ Name: [____] *required       │  Auto-generated
└─ [Cancel] [Save]              ├─ Name: [____] *required
                                └─ [Cancel] [Save]

Prestation New Form:            Prestation New Form:
├─ Code: [____] *required       ├─ Specialty: [Select]
├─ Specialty: [Select]          │  ℹ Code will auto-generate
├─ Designation: [____]          ├─ Designation: [____]
├─ Price: [____]                ├─ Price: [____]
├─ Duration: [____]             ├─ Duration: [____]
└─ [Cancel] [Save]              └─ [Cancel] [Save]

Prestation Edit Form:           Prestation Edit Form:
├─ Code: [____] *required       ├─ Code: [CO-ORT-0001] (readonly)
├─ Specialty: [Select]          │  Auto-generated
├─ Designation: [____]          ├─ Specialty: [Select]
├─ Price: [____]                ├─ Designation: [____]
├─ Duration: [____]             ├─ Price: [____]
└─ [Cancel] [Save]              ├─ Duration: [____]
                                └─ [Cancel] [Save]


═══════════════════════════════════════════════════════════════════════
COUNTER STRATEGIES
═══════════════════════════════════════════════════════════════════════

FONCTION                PRESTATION              SURGERY
────────────────────────────────────────────────────────────
Global Counter          Per-Specialty           Per-Year
                        Counter                 Counter

Total Count in DB       Count grouped by        Count filtered
                        specialty               by year

FCT0001 ─first          CO-ORT-0001             2025/00001
FCT0002 ─second         CO-ORT-0002             2025/00002
FCT0003 ─third          CO-CAR-0001 ─resets     2025/00003
FCT0004 ─fourth         for new specialty       ...
...                     CO-CAR-0002             2025/00256
                        CO-URO-0001             2026/00001 ─resets
                        ...                     2026/00002 ─yearly


═══════════════════════════════════════════════════════════════════════
DATABASE SCHEMA (Pre-Save Hook Location)
═══════════════════════════════════════════════════════════════════════

Fonction Schema
├─ code: String (unique) ◄─── PRE-SAVE GENERATES
├─ name: String
├─ description: String
└─ timestamps

Prestation Schema
├─ code: String (unique) ◄─── PRE-SAVE GENERATES
├─ designation: String
├─ specialty: ObjectId (ref) ◄─── POPULATES TO GET CODE
├─ priceHT: Number
├─ duration: Number
└─ timestamps

Surgery Schema
├─ code: String (unique) ◄─── PRE-SAVE GENERATES
├─ patient: ObjectId (ref)
├─ surgeon: ObjectId (ref)
├─ prestation: ObjectId (ref)
├─ beginDateTime: Date
├─ endDateTime: Date
└─ timestamps ◄─── USES FOR YEAR EXTRACTION


═══════════════════════════════════════════════════════════════════════
ERROR HANDLING
═══════════════════════════════════════════════════════════════════════

If code generation fails:

Fonction               Prestation              Surgery
────────────────────────────────────────────────────────────
Count query fails  → Show error           Count query fails → Show error
                     "Error creating                      "Error creating
                      prestation"                         surgery"

                   If specialty not       
                   found after populate:
                   → Error "Specialty 
                     required"
```

## Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  USER SUBMITS FORM (without code field)                    │
│         ↓                                                   │
│  CONTROLLER RECEIVES REQUEST                               │
│         ↓                                                   │
│  CREATE MODEL INSTANCE (no code provided)                  │
│         ↓                                                   │
│  CALL model.save()                                         │
│         ↓                                                   │
│  MONGOOSE PRE-SAVE HOOK TRIGGERS                           │
│         ├─ Checks if code exists (it doesn't)             │
│         ├─ Performs counter query                          │
│         ├─ Generates new code based on pattern             │
│         └─ Sets this.code = generated code                 │
│         ↓                                                   │
│  DOCUMENT SAVED TO MONGODB (with generated code)           │
│         ↓                                                   │
│  CONTROLLER REDIRECTS TO SUCCESS PAGE                      │
│         ↓                                                   │
│  USER SEES NEW RECORD WITH AUTO-GENERATED CODE             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Code Pattern Examples

### Fonction Examples
```
Creation Order  →  Generated Code
1st                FCT0001
2nd                FCT0002
3rd                FCT0003
100th              FCT0100
1000th             FCT1000
```

### Prestation Examples (Multiple Specialties)
```
Specialty: Orthopédie (ORT)
  1st Prestation    →  CO-ORT-0001
  2nd Prestation    →  CO-ORT-0002
  3rd Prestation    →  CO-ORT-0003

Specialty: Cardiologie (CAR)
  1st Prestation    →  CO-CAR-0001 (counter resets)
  2nd Prestation    →  CO-CAR-0002

Specialty: Urologie (URO)
  1st Prestation    →  CO-URO-0001 (counter resets)
```

### Surgery Examples (Year-Based)
```
Year 2024
  First Surgery     →  2024/00001
  102nd Surgery     →  2024/00102
  Last Surgery      →  2024/00256

Year 2025 (New Year, Counter Resets)
  First Surgery     →  2025/00001
  Second Surgery    →  2025/00002
  100th Surgery     →  2025/00100
```
