# n8n → Database → Frontend Implementation Guide

> **Status: IMPLEMENTED** ✅
>
> This guide documents the complete implementation for connecting the n8n workflow to a PostgreSQL database and enabling real-time progress tracking in the frontend.

## Implementation Status

| Component         | Status         | Files                                                                           |
| ----------------- | -------------- | ------------------------------------------------------------------------------- |
| PostgreSQL Schema | ✅ Ready       | `signalsai-backend/src/database/migrations/20260114_create_audit_processes.sql` |
| Backend API       | ✅ Implemented | `signalsai-backend/src/routes/audit.ts`                                         |
| Frontend Types    | ✅ Added       | `alloro-leadgen-tool/types.ts`                                                  |
| Polling Hook      | ✅ Created     | `alloro-leadgen-tool/useAuditPolling.ts`                                        |
| App Integration   | ✅ Updated     | `alloro-leadgen-tool/App.tsx`                                                   |

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [n8n Workflow Structure](#n8n-workflow-structure)
3. [PostgreSQL Schema](#postgresql-schema)
4. [n8n Database Save Points](#n8n-database-save-points)
5. [Data Structure Reference](#data-structure-reference)
6. [Backend API Endpoints](#backend-api-endpoints)
7. [Frontend Implementation](#frontend-implementation)
8. [UI Stage Mapping](#ui-stage-mapping)
9. [Testing Checklist](#testing-checklist)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│ Frontend│───▶│ signalsai-backend│───▶│   PostgreSQL    │◀───│    n8n         │
│  (React)│◀───│   (Express)     │◀───│   Database      │    │   Workflow     │
└─────────┘    └─────────────────┘    └──────────────────┘    └────────────────┘
     │                                        ▲                       │
     │                                        │                       │
     └── Polls /api/audit/:id/status ─────────┴── Updates realtime_status
```

### Flow Summary

1. **User selects business** → Frontend calls `POST /api/audit/start`
2. **Backend creates audit record** → Returns `audit_id`, triggers n8n webhook
3. **n8n processes in parallel** → Updates database after each step
4. **Frontend polls status** → `GET /api/audit/:id/status` every 2.5s
5. **UI advances stages** → Based on `realtime_status` value

---

## PostgreSQL Schema

### Create the Database Table

```sql
-- Run this in your PostgreSQL database

-- Create enum for audit status
CREATE TYPE audit_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Main audit tracking table
CREATE TABLE audit_processes (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Input data (from webhook call)
    domain VARCHAR(255) NOT NULL,
    practice_search_string TEXT NOT NULL,

    -- Status tracking
    status audit_status DEFAULT 'pending',
    realtime_status INTEGER DEFAULT 0,
    /*
      realtime_status values:
      0 = initialized (audit just created)
      1 = screenshots captured
      2 = website analysis complete
      3 = self GBP data fetched
      4 = competitors fetched
      5 = GBP analysis complete (DONE)
    */
    error_message TEXT,

    -- Step data columns (NULL until populated by n8n)
    step_screenshots JSONB,
    step_website_analysis JSONB,
    step_self_gbp JSONB,
    step_competitors JSONB,
    step_gbp_analysis JSONB
);

-- Performance indexes
CREATE INDEX idx_audit_processes_status ON audit_processes(status);
CREATE INDEX idx_audit_processes_realtime_status ON audit_processes(realtime_status);
CREATE INDEX idx_audit_processes_domain ON audit_processes(domain);
CREATE INDEX idx_audit_processes_created_at ON audit_processes(created_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_audit_processes_updated_at
    BEFORE UPDATE ON audit_processes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Realtime Status Values

| Value | Description           | UI Stage           |
| ----- | --------------------- | ------------------ |
| `0`   | Audit initialized     | `scanning_website` |
| `1`   | Screenshots captured  | `scanning_website` |
| `2`   | Website analysis done | `analyzing_gbp`    |
| `3`   | Self GBP fetched      | `analyzing_gbp`    |
| `4`   | Competitors fetched   | `competitor_map`   |
| `5`   | GBP analysis complete | `dashboard`        |

---

## n8n Workflow Structure

The n8n workflow processes audit requests through multiple parallel paths, each saving data directly to PostgreSQL at specific checkpoints.

### Visual Workflow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                    n8n WORKFLOW STRUCTURE                                 │
└──────────────────────────────────────────────────────────────────────────────────────────┘

                                         ┌─────────┐
                                         │ Webhook │
                                         └────┬────┘
                                              │
                                         ┌────┴────┐
                                         │  HTTP   │
                                         │ Request │
                                         └────┬────┘
                                              │
                                         ┌────┴────┐
                                         │   If    │
                                         └────┬────┘
                                              │
                              ┌───────────────┼───────────────┐
                              │               │               │
                              ▼               ▼               ▼
                    ┌─────────────────┐  ┌──────────┐  ┌────────────────┐
                    │ Insert rows     │  │ Create   │  │ Respond to     │
                    │ in a table      │  │ row: id  │  │ Webhook        │
                    └────────┬────────┘  └────┬─────┘  └────────────────┘
                             │                │
                             └───────┬────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │ Homepage markup +              │
                    │ screenshot scrape              │
                    │ POST: https://app.getalloro... │
                    └────────────────┬───────────────┘
                                     │
                                     ▼
                              ┌────────────┐
                              │Edit Fields │
                              └──────┬─────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                  ▼                  ▼                  ▼
        ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
        │ convert mobile   │ │ convert desktop  │ │ Code in          │
        │ (Base64→File)    │ │ (Base64→File)    │ │ JavaScript       │
        └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
                 │                    │                    │
                 └────────────┬───────┴────────────────────┘
                              │
                              ▼
                       ┌────────────┐
                       │   Merge    │
                       │  (combine) │
                       └──────┬─────┘
                              │
        ┌─────────────────────┼─────────────────────────────────────────┐
        │                     │                                         │
        ▼                     ▼                                         │
┌───────────────┐    ┌──────────────────┐                               │
│ Upload a file │    │ Analyze an image │                               │
│ (mobile)      │    │ (AI Vision)      │                               │
└───────┬───────┘    └────────┬─────────┘                               │
        │                     │                                         │
        ▼                     ▼                                         │
┌───────────────┐    ┌───────────────────────┐                          │
│ Upload a file │    │ Code in JavaScript1    │                          │
│ (desktop)     │    │ analyze website step  │                          │
└───────┬───────┘    └───────────┬───────────┘                          │
        │                        │                                      │
        ▼                        ▼                                      │
┌───────────────┐    ┌──────────────────────────┐                       │
│ Edit Fields1  │    │ 🗄️ "2. website analysis  │                       │
│ Edit Fields2  │    │     saved" (Postgres)   │                       │
└───────┬───────┘    └──────────────────────────┘                       │
        │                                                               │
        ▼                                                               │
┌────────────┐                                                          │
│  Merge3    │                                                          │
│  (append)  │                                                          │
└──────┬─────┘                                                          │
       │                                                                │
       ▼                                                                │
┌──────────────────────────┐                                            │
│ 🗄️ "1. Save screenshot   │ ◀──────────────────────────────────────────┘
│     urls" (Postgres)    │
└────────────┬─────────────┘
             │
             ▼
      ┌────────────┐
      │   Merge2   │
      │  (combine) │
      └──────┬─────┘
             │
    ┌────────┴────────────────────────────────────────────┐
    │                                                     │
    ▼                                                     ▼
┌───────────────────────┐                      ┌───────────────────────┐
│ Run an Actor and get  │                      │ Run an Actor and get  │
│ dataset (Self GBP)    │                      │ dataset1 (Competitors)│
│ Apify: Google Maps    │                      │ Apify: Google Maps    │
└───────────┬───────────┘                      └───────────┬───────────┘
            │                                              │
            ▼                                              ▼
    ┌───────────────┐                              ┌───────────────┐
    │    parse1     │                              │    parse3     │
    └───────┬───────┘                              └───────┬───────┘
            │                                              │
            ▼                                              ▼
    ┌───────────────┐                              ┌────────────────────┐
    │ self gbp step │                              │ competitor gbp step│
    │   (Postgres)  │                              │    (Postgres)      │
    └───────┬───────┘                              └─────────┬──────────┘
            │                                                │
            ▼                                                ▼
    ┌───────────────┐                              ┌───────────────┐
    │    agent1     │                              │     agent     │
    │ Google Gemini │                              │ Google Gemini │
    │  Chat Model   │                              │  Chat Model   │
    └───────┬───────┘                              └───────┬───────┘
            │                                              │
            ▼                                              ▼
    ┌───────────────┐                              ┌───────────────────────┐
    │    parse4     │                              │ Code in JavaScript    │
    └───────┬───────┘                              │ competitor gbp step1  │
            │                                      └───────────┬───────────┘
            ▼                                                  │
    ┌──────────────────────────┐                               │
    │ 🗄️ "3. self gbp saved"   │                               │
    │    (Postgres)           │                               │
    └────────────┬─────────────┘                               │
                 │                                             │
                 └──────────────────┬──────────────────────────┘
                                    │
                                    ▼
                        ┌──────────────────────────┐
                        │ 🗄️ "4. competitor gbp    │
                        │     saved" (Postgres)   │
                        └────────────┬─────────────┘
                                     │
                                     ▼
                        ┌──────────────────────────┐
                        │ 🗄️ "5. gbp analysis      │
                        │     saved" (Postgres)   │
                        └────────────┬─────────────┘
                                     │
                                     ▼
                              ┌────────────┐
                              │   Merge1   │
                              │  (append)  │
                              └────────────┘
```

### Key n8n Nodes

| Node Name                             | Purpose                             | Technology        |
| ------------------------------------- | ----------------------------------- | ----------------- |
| `Webhook`                             | Entry point, receives audit request | n8n Webhook       |
| `HTTP Request`                        | Initial validation                  | HTTP              |
| `Insert rows in a table`              | Creates initial audit record        | PostgreSQL        |
| `Homepage markup + screenshot scrape` | Captures website screenshots        | External API      |
| `convert mobile/desktop`              | Converts Base64 to file             | n8n Move Binary   |
| `Upload a file` (x2)                  | Uploads screenshots to S3           | AWS S3            |
| `Analyze an image`                    | AI vision analysis                  | OpenAI/Gemini     |
| `analyze website step`                | Processes website analysis          | JavaScript        |
| `Run an Actor` (x2)                   | Fetches GBP data via Apify          | Apify Google Maps |
| `agent1` / `agent`                    | AI analysis with Gemini             | Google Gemini     |
| `parse1/3/4`                          | JSON parsing/transformation         | JavaScript        |

### Screenshot Storage

Screenshots are uploaded to **AWS S3**:

- **Bucket**: `alloro-main-bucket`
- **Path**: `leadgen-screenshots/`
- **URL Format**: `https://alloro-main-bucket.s3.us-east-1.amazonaws.com/leadgen-screenshots/{audit_id}-{mobile|desktop}.png`

---

## n8n Database Save Points

The n8n workflow saves data directly to PostgreSQL at 5 checkpoints using PostgreSQL nodes.

### Save Point Summary

| Step | n8n Node Label                | Database Column         | `realtime_status` | Trigger Condition               |
| ---- | ----------------------------- | ----------------------- | ----------------- | ------------------------------- |
| 1    | `"1. Save screenshot urls"`   | `step_screenshots`      | 1                 | After S3 upload completes       |
| 2    | `"2. website analysis saved"` | `step_website_analysis` | 2                 | After AI image analysis         |
| 3    | `"3. self gbp saved"`         | `step_self_gbp`         | 3                 | After Apify + Gemini parsing    |
| 4    | `"4. competitor gbp saved"`   | `step_competitors`      | 4                 | After competitor Apify + Gemini |
| 5    | `"5. gbp analysis saved"`     | `step_gbp_analysis`     | 5                 | After final GBP analysis        |

### PostgreSQL Update Queries

#### Step 1: Save Screenshot URLs

```sql
UPDATE audit_processes
SET step_screenshots = $1::jsonb,
    realtime_status = 1
WHERE id = $2::uuid;
```

**Data format:**

```json
{
  "mobile_url": "https://alloro-main-bucket.s3.us-east-1.amazonaws.com/leadgen-screenshots/{id}-mobile.png",
  "desktop_url": "https://alloro-main-bucket.s3.us-east-1.amazonaws.com/leadgen-screenshots/{id}-desktop.png"
}
```

#### Step 2: Save Website Analysis

```sql
UPDATE audit_processes
SET step_website_analysis = $1::jsonb,
    realtime_status = 2
WHERE id = $2::uuid;
```

#### Step 3: Save Self GBP

```sql
UPDATE audit_processes
SET step_self_gbp = $1::jsonb,
    realtime_status = 3
WHERE id = $2::uuid;
```

#### Step 4: Save Competitors

```sql
UPDATE audit_processes
SET step_competitors = $1::jsonb,
    realtime_status = 4
WHERE id = $2::uuid;
```

#### Step 5: Save GBP Analysis (Final)

```sql
UPDATE audit_processes
SET step_gbp_analysis = $1::jsonb,
    realtime_status = 5,
    status = 'completed'
WHERE id = $2::uuid;
```

---

## Data Structure Reference

### step_screenshots

```json
{
  "mobile_url": "https://alloro-main-bucket.s3.us-east-1.amazonaws.com/leadgen-screenshots/d1d4d99f-518b-4fcd-9046-0d304cc92577-mobile.png",
  "desktop_url": "https://alloro-main-bucket.s3.us-east-1.amazonaws.com/leadgen-screenshots/d1d4d99f-518b-4fcd-9046-0d304cc92577-desktop.png"
}
```

### step_website_analysis

```json
{
  "pillars": [
    {
      "score": 95,
      "category": "Trust & Authority",
      "key_finding": "The practice builds strong immediate trust by featuring authentic, professional photographs...",
      "action_items": []
    },
    {
      "score": 98,
      "category": "Accessibility",
      "key_finding": "The website ensures seamless contact with instant, clickable phone numbers...",
      "action_items": []
    },
    {
      "score": 75,
      "category": "Patient Journey",
      "key_finding": "The ability for patients to utilize the 'Pay with Cherry' financing option is severely disrupted...",
      "action_items": [
        "Immediately audit and fix the 'pay with cherry' link...",
        "Verify that all 'Read Bio' links..."
      ]
    },
    {
      "score": 95,
      "category": "Technical Reliability",
      "key_finding": "The website delivers a highly reliable and swift loading experience (1.1 seconds)...",
      "action_items": []
    }
  ],
  "overall_grade": "A",
  "overall_score": 91.9
}
```

### step_self_gbp

```json
{
  "url": "https://www.google.com/maps/search/?api=1&query=...",
  "phone": "(516) 407-3207",
  "title": "Gentle Touch Endodontics, Dr. Lyubov (Luba) Borukhova, DDS",
  "address": "99 Hillside Ave. Unit W, Williston Park, NY 11596",
  "placeId": "ChIJP_2NKX5iwokR_NR-IwFdZSA",
  "reviews": [
    {
      "name": "Leslieann Richards",
      "text": "my husband and my daughter both needed endodontic root canal's...",
      "stars": 5,
      "reviewId": "Ci9DQUlRQUNvZENodHljRjlv...",
      "publishAt": "a week ago",
      "reviewUrl": "https://www.google.com/maps/reviews/data=...",
      "likesCount": 0,
      "reviewerId": "113647831696183734399",
      "reviewerUrl": "https://www.google.com/maps/contrib/...",
      "isLocalGuide": false,
      "reviewOrigin": "Google",
      "publishedAtDate": "2026-01-06T18:25:17.961Z",
      "reviewImageUrls": [],
      "reviewerPhotoUrl": "https://lh3.googleusercontent.com/a/...",
      "responseFromOwnerDate": "2026-01-12T13:58:15.000Z",
      "responseFromOwnerText": "Thank you so much for taking the time...",
      "reviewerNumberOfReviews": 3
    }
  ],
  "website": "https://gentletouchendo.com/?utm_source=Google+Business+Profile&utm_medium=Website&utm_campaign=Website",
  "imageUrl": "https://lh3.googleusercontent.com/p/AF1QipOQdkDfjVzRZm_KNOVJk0RrzLdWfUfKLHw7bHQo=w408-h272-k-no",
  "location": {
    "lat": 40.7568387,
    "lng": -73.64304
  },
  "imageUrls": [
    "https://lh3.googleusercontent.com/p/AF1QipOQdkDfjVzRZm_KNOVJk0RrzLdWfUfKLHw7bHQo=w1920-h1080-k-no",
    "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSzuXqqr-QCiPMklnBr1-xvOcweTErjopudaGEa5pc2UCbxjT6E1Myn6M1zd..."
  ],
  "categories": ["Endodontist"],
  "imagesCount": 102,
  "reviewsTags": [
    { "count": 17, "title": "skills" },
    { "count": 9, "title": "the office" },
    { "count": 7, "title": "infection" }
  ],
  "categoryName": "Endodontist",
  "openingHours": [
    { "day": "Monday", "hours": "9 AM to 4 PM" },
    { "day": "Tuesday", "hours": "9 AM to 4 PM" }
  ],
  "ownerUpdates": [],
  "reviewsCount": 227,
  "searchString": "Gentle Touch Endodontics, Dr. Lyubov (Luba) Borukhova, DDS, 99 Hillside Ave...",
  "additionalInfo": {
    "Crowd": [{ "LGBTQ+ friendly": true }, { "Transgender safespace": true }],
    "Payments": [{ "Credit cards": true }, { "Debit cards": true }],
    "Accessibility": [{ "Wheelchair accessible entrance": true }]
  },
  "averageStarRating": 4.9,
  "reviewsDistribution": {
    "oneStar": 1,
    "twoStar": 1,
    "fiveStar": 221,
    "fourStar": 3,
    "threeStar": 1
  }
}
```

### step_competitors

```json
{
  "competitors": [
    {
      "url": "https://www.google.com/maps/search/?api=1&query=Nassau-Queens%20Endodontics%20PC...",
      "phone": "(516) 437-1633",
      "title": "Nassau-Queens Endodontics PC",
      "address": "2035 Lakeville Rd #205, New Hyde Park, NY 11040",
      "placeId": "ChIJifAEK35iwokRBM94zLA3Wnk",
      "website": "http://www.nqendo.com/",
      "imageUrl": "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=...",
      "location": {
        "lat": 40.751592
      },
      "categories": ["Dentist"],
      "imagesCount": 1,
      "reviewsTags": [],
      "categoryName": "Dentist",
      "openingHours": [{ "day": "Monday", "hours": "8 AM to 6 PM" }],
      "reviewsCount": 420,
      "searchString": "endodontist: Williston Park, NY",
      "additionalInfo": {},
      "imageCategories": [],
      "averageStarRating": 4.9
    }
  ]
}
```

**Note:** The competitors array may include the self business. The backend filters this out using `placeId` comparison.

### step_gbp_analysis

```json
{
  "pillars": [
    {
      "score": 60,
      "category": "Profile Integrity",
      "key_finding": "Critical mismatch identified in operating hours. The website lists Monday, Tuesday, and Thursday closing at 2 PM..."
    },
    {
      "score": 100,
      "category": "Trust & Engagement",
      "key_finding": "Elite performance demonstrated by a 4.9-star rating across 227 reviews..."
    },
    {
      "score": 95,
      "category": "Visual Authority",
      "key_finding": "Excellent volume of images (102 total) indicates strong visual presence..."
    },
    {
      "score": 70,
      "category": "Search Conversion",
      "key_finding": "Zero active GBP Posts/Owner Updates were found in the live evidence..."
    },
    {
      "score": 98,
      "category": "Competitor Analysis",
      "key_finding": "Superior patient trust metrics (4.9 stars, high volume) demonstrate strong authority..."
    }
  ],
  "gbp_grade": "B",
  "sync_audit": {
    "nap_match": false,
    "mismatched_fields": [
      "Business Hours (GBP: M/T/Th 9-4, W 10-6 vs. Website: M/T/Th 9-2, W Closed)"
    ],
    "trust_gap_severity": "Medium"
  },
  "gbp_readiness_score": 82.3
}
```

---

## UI Stage Mapping

### realtime_status → UI Stage → Data Required

| `realtime_status` | UI Stage           | Data Available                    | UI Components Shown             |
| ----------------- | ------------------ | --------------------------------- | ------------------------------- |
| 0                 | `scanning_website` | None                              | Loading skeleton browsers       |
| 1                 | `scanning_website` | `screenshots`                     | Real desktop/mobile screenshots |
| 2                 | `analyzing_gbp`    | `screenshots`, `website_analysis` | GBP loading skeleton            |
| 3                 | `analyzing_gbp`    | + `self_gbp`                      | GBP carousel (3 pages × 3s)     |
| 4                 | `competitor_map`   | + `competitors`                   | Map with animated pins          |
| 5                 | `dashboard`        | + `gbp_analysis`                  | Full dashboard report           |

### GBP Carousel Behavior

When `realtime_status >= 3` and `self_gbp` data is available:

1. Carousel auto-starts
2. Cycles through 3 pages: **Profile Health** → **Review Sentiment** → **Visual Authority**
3. Each page shows for 3 seconds (total 9 seconds)
4. After completing one full cycle, `onCarouselComplete` callback fires
5. If `realtime_status >= 4` (competitors ready), UI transitions to `competitor_map`
6. If competitors not ready yet, carousel continues looping until they are

### Loading State Behavior

Each stage component handles its own loading state:

| Component            | Loading Trigger | Loading UI                                        |
| -------------------- | --------------- | ------------------------------------------------- |
| `WebsiteScanStage`   | `!screenshots`  | Skeleton browser frames with animated loading bar |
| `GBPAnalysisStage`   | `!self_gbp`     | Skeleton card with scanning line animation        |
| `CompetitorMapStage` | `!competitors`  | Map with scanning line animation                  |
| `DashboardStage`     | N/A             | Always has data when reached                      |

---

## Backend API Endpoints

### File: `signalsai-backend/src/routes/audit.ts`

```typescript
import { Router, Request, Response } from "express";
import { Pool } from "pg";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ============================================
// POST /api/audit/start
// Creates audit record and triggers n8n
// ============================================
router.post("/start", async (req: Request, res: Response) => {
  try {
    const { domain, practice_search_string } = req.body;

    if (!domain || !practice_search_string) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: domain, practice_search_string",
      });
    }

    // Insert new audit record
    const result = await pool.query(
      `INSERT INTO audit_processes (domain, practice_search_string, status, realtime_status)
       VALUES ($1, $2, 'processing', 0)
       RETURNING id, created_at`,
      [domain, practice_search_string]
    );

    const auditId = result.rows[0].id;

    // Trigger n8n webhook (fire and forget)
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audit_id: auditId,
          domain,
          practice_search_string,
        }),
      }).catch((err) => console.error("n8n webhook error:", err));
    }

    return res.json({
      success: true,
      audit_id: auditId,
      created_at: result.rows[0].created_at,
    });
  } catch (error) {
    console.error("Audit start error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

// ============================================
// GET /api/audit/:auditId/status
// Polling endpoint for frontend
// ============================================
router.get("/:auditId/status", async (req: Request, res: Response) => {
  try {
    const { auditId } = req.params;

    const result = await pool.query(
      `SELECT 
        id,
        status,
        realtime_status,
        error_message,
        step_screenshots,
        step_website_analysis,
        step_self_gbp,
        step_competitors,
        step_gbp_analysis,
        created_at,
        updated_at
       FROM audit_processes
       WHERE id = $1`,
      [auditId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Audit not found" });
    }

    const audit = result.rows[0];

    // Process and normalize data
    const response = {
      success: true,
      id: audit.id,
      status: audit.status,
      realtime_status: audit.realtime_status,
      error_message: audit.error_message,
      created_at: audit.created_at,
      updated_at: audit.updated_at,

      // Step data (null if not yet available)
      screenshots: audit.step_screenshots,
      website_analysis: normalizeWebsiteAnalysis(audit.step_website_analysis),
      self_gbp: normalizeSelfGBP(audit.step_self_gbp),
      competitors: normalizeCompetitors(
        audit.step_competitors,
        audit.step_self_gbp
      ),
      gbp_analysis: normalizeGBPAnalysis(audit.step_gbp_analysis),
    };

    return res.json(response);
  } catch (error) {
    console.error("Audit status error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

// ============================================
// NORMALIZATION HELPERS
// ============================================

function normalizeWebsiteAnalysis(data: any) {
  if (!data) return null;
  return {
    overall_score: Number(data.overall_score),
    overall_grade: data.overall_grade,
    pillars: data.pillars.map((p: any) => ({
      ...p,
      score: Number(p.score),
    })),
  };
}

function normalizeSelfGBP(data: any) {
  if (!data) return null;
  return {
    ...data,
    totalScore: data.totalScore ?? data.averageStarRating ?? 0,
  };
}

function normalizeCompetitors(competitorsData: any, selfGbpData: any) {
  if (!competitorsData?.competitors) return null;

  // Extract placeId from step_self_gbp to filter out self
  const selfPlaceId = selfGbpData?.placeId || null;

  return competitorsData.competitors
    .filter((c: any) => c.placeId !== selfPlaceId)
    .map((c: any, index: number) => ({
      ...c,
      location: ensureLatLng(c.location, index),
      totalScore: c.totalScore ?? c.averageStarRating ?? 0,
    }));
}

function ensureLatLng(location: any, index: number) {
  if (location?.lat && location?.lng) {
    return location;
  }

  // Fallback: generate nearby coordinates (West Orange, NJ area)
  const baseLat = 40.7964763;
  const baseLng = -74.2613414;

  const offsets = [
    { lat: 0.015, lng: -0.01 },
    { lat: -0.02, lng: 0.008 },
    { lat: 0.01, lng: 0.015 },
    { lat: -0.008, lng: -0.02 },
    { lat: 0.025, lng: 0.005 },
    { lat: -0.015, lng: 0.012 },
  ];

  const offset = offsets[index % offsets.length];

  return {
    lat: location?.lat ?? baseLat + offset.lat,
    lng: location?.lng ?? baseLng + offset.lng,
  };
}

function normalizeGBPAnalysis(data: any) {
  if (!data) return null;
  return {
    ...data,
    gbp_readiness_score: Number(data.gbp_readiness_score),
    pillars: data.pillars.map((p: any) => ({
      ...p,
      score: Number(p.score),
    })),
  };
}

export default router;
```

### Register Route in `signalsai-backend/src/index.ts`

```typescript
import auditRoutes from "./routes/audit";

// ... existing setup ...

app.use("/api/audit", auditRoutes);
```

### Environment Variables

Add to `signalsai-backend/.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/alloro_db
N8N_WEBHOOK_URL=https://n8napp.getalloro.com/webhook/website-scraping-tool
```

---

## Frontend Implementation

### 1. Add Types (`alloro-leadgen-tool/types.ts`)

```typescript
// Add these new types

export interface AuditStatusResponse {
  success: boolean;
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  realtime_status: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;

  screenshots: {
    mobile_url: string;
    desktop_url: string;
  } | null;

  website_analysis: WebsiteAnalysis | null;
  self_gbp: BusinessProfile | null;
  competitors: Competitor[] | null;
  gbp_analysis: GBPAnalysis | null;
}

export interface StartAuditResponse {
  success: boolean;
  audit_id: string;
  created_at: string;
}
```

### 2. Create Polling Hook (`alloro-leadgen-tool/useAuditPolling.ts`)

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import { AuditStatusResponse, AuditStage } from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const POLL_INTERVAL = 2500; // 2.5 seconds

export function useAuditPolling(auditId: string | null) {
  const [data, setData] = useState<AuditStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!auditId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/audit/${auditId}/status`);
      const result: AuditStatusResponse = await response.json();

      if (result.success) {
        setData(result);
        setError(null);

        // Stop polling when complete or failed
        if (result.status === "completed" || result.status === "failed") {
          setIsPolling(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      } else {
        setError("Failed to fetch status");
      }
    } catch (err) {
      setError("Network error");
    }
  }, [auditId]);

  const startPolling = useCallback(() => {
    if (!auditId) return;

    setIsPolling(true);
    fetchStatus(); // Immediate first fetch

    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL);
  }, [auditId, fetchStatus]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Derive UI stage from realtime_status
  const derivedStage: AuditStage = (() => {
    if (!data) return "input";

    switch (data.realtime_status) {
      case 0:
      case 1:
        return "scanning_website";
      case 2:
      case 3:
        return "analyzing_gbp";
      case 4:
        return "competitor_map";
      case 5:
        return "dashboard";
      default:
        return "input";
    }
  })();

  // Derive progress percentage
  const progress = data ? Math.round((data.realtime_status / 5) * 100) : 0;

  return {
    data,
    error,
    isPolling,
    startPolling,
    stopPolling,
    derivedStage,
    progress,
  };
}
```

### 3. Update App.tsx

Key changes to make in `App.tsx`:

```typescript
// Add imports
import { useAuditPolling } from "./useAuditPolling";
import { StartAuditResponse } from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const App = () => {
  const [stage, setStage] = useState<AuditStage>("input");
  const [selectedGBP, setSelectedGBP] = useState<SelectedGBP | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);

  // Use polling hook
  const {
    data: auditData,
    error: auditError,
    isPolling,
    startPolling,
    stopPolling,
    derivedStage,
    progress,
  } = useAuditPolling(auditId);

  // Sync derived stage to UI stage
  useEffect(() => {
    if (auditId && derivedStage !== "input") {
      setStage(derivedStage);
    }
  }, [derivedStage, auditId]);

  // REPLACE the old startAudit function with this:
  const startAudit = async (gbp: SelectedGBP) => {
    try {
      const response = await fetch(`${API_BASE_URL}/audit/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: gbp.websiteUri || `https://${gbp.domain}`,
          practice_search_string: gbp.practiceSearchString,
        }),
      });

      const result: StartAuditResponse = await response.json();

      if (result.success) {
        setAuditId(result.audit_id);
        setStage("scanning_website");
        startPolling();
      } else {
        console.error("Failed to start audit");
      }
    } catch (error) {
      console.error("Audit start error:", error);
    }
  };

  // Use real data when available, fall back to mocks
  const screenshotDesktop =
    auditData?.screenshots?.desktop_url || MOCK_SCREENSHOT_DESKTOP;
  const screenshotMobile =
    auditData?.screenshots?.mobile_url || MOCK_SCREENSHOT_MOBILE;
  const businessData = auditData?.self_gbp || MOCK_BUSINESS;
  const competitorData = auditData?.competitors || MOCK_COMPETITORS;
  const websiteAnalysis = auditData?.website_analysis || MOCK_WEBSITE_ANALYSIS;
  const gbpAnalysis = auditData?.gbp_analysis || MOCK_GBP_ANALYSIS;

  // REMOVE the old setTimeout simulation logic (lines ~2013-2033)

  // Use `progress` from hook instead of local state for sidebar
  // Use the data variables above in stage components

  // ... rest of component
};
```

### 4. Update Stage Components to Accept Props

Each stage component should accept data as props instead of using MOCK\_\* directly:

```typescript
// WebsiteScanStage - add props
const WebsiteScanStage = ({
  desktopScreenshot,
  mobileScreenshot,
}: {
  desktopScreenshot: string;
  mobileScreenshot: string;
}) => {
  // Use desktopScreenshot and mobileScreenshot instead of MOCK_SCREENSHOT_*
};

// GBPAnalysisStage - already has data prop ✓

// CompetitorMapStage - already has self and competitors props ✓

// DashboardStage - already has business, websiteData, gbpData props ✓
```

---

## Field-to-Component Mapping

### step_screenshots

| Field         | UI Component             | Stage              | Notes                        |
| ------------- | ------------------------ | ------------------ | ---------------------------- |
| `desktop_url` | `<img>` in browser frame | `WebsiteScanStage` | Shows in macOS-style browser |
| `mobile_url`  | `<img>` in phone frame   | `WebsiteScanStage` | Shows in iPhone-style frame  |

### step_website_analysis

| Field                   | UI Component            | Stage            | Notes                      |
| ----------------------- | ----------------------- | ---------------- | -------------------------- |
| `overall_grade`         | `GradeBadge`            | `DashboardStage` | A/B/C/D/F badge            |
| `overall_score`         | `CircularProgress`      | `DashboardStage` | Animated circular progress |
| `pillars[].score`       | `HorizontalProgressBar` | `DashboardStage` | Colored by score range     |
| `pillars[].category`    | Progress bar label      | `DashboardStage` | Category name              |
| `pillars[].key_finding` | Finding text below bar  | `DashboardStage` | With ✓/⚠️ icon             |

### step_self_gbp

| Field                              | UI Component          | Stage                | Notes                      |
| ---------------------------------- | --------------------- | -------------------- | -------------------------- |
| `title`                            | Business name heading | `GBPAnalysisStage`   | Truncated if too long      |
| `imageUrl`                         | Cover image           | `GBPAnalysisStage`   | Profile Health page        |
| `imageUrls[]`                      | Photo collage         | `GBPAnalysisStage`   | Visual Authority page      |
| `reviews[]`                        | Review cards          | `GBPAnalysisStage`   | Review Sentiment page      |
| `reviewsCount`                     | Stats card            | `GBPAnalysisStage`   | Number badge               |
| `imagesCount`                      | Stats card            | `GBPAnalysisStage`   | Number badge               |
| `averageStarRating` / `totalScore` | Star display          | `GBPAnalysisStage`   | 4.9★ format                |
| `location.lat/lng`                 | Map center pin        | `CompetitorMapStage` | Blue pin                   |
| `address`                          | Info card             | `GBPAnalysisStage`   | With MapPin icon           |
| `website`                          | Info card             | `GBPAnalysisStage`   | With Globe icon, truncated |
| `categoryName`                     | Badge                 | `GBPAnalysisStage`   | Orange badge on image      |

### step_competitors

| Field                             | UI Component              | Stage                | Notes                 |
| --------------------------------- | ------------------------- | -------------------- | --------------------- |
| `competitors[].title`             | Pin tooltip, sidebar list | `CompetitorMapStage` | Truncated to 120px    |
| `competitors[].location.lat/lng`  | Red pin position          | `CompetitorMapStage` | Animated reveal       |
| `competitors[].averageStarRating` | Star display              | `CompetitorMapStage` | In tooltip & sidebar  |
| `competitors[].reviewsCount`      | Review count              | `CompetitorMapStage` | Red number in sidebar |
| `competitors[].address`           | Tooltip text              | `CompetitorMapStage` | Secondary line        |

### step_gbp_analysis

| Field                   | UI Component            | Stage            | Notes                                 |
| ----------------------- | ----------------------- | ---------------- | ------------------------------------- |
| `gbp_grade`             | `GradeBadge`            | `DashboardStage` | Large A/B/C/D/F badge                 |
| `gbp_readiness_score`   | `CircularProgress`      | `DashboardStage` | "Readiness Score" label               |
| `sync_audit.nap_match`  | `CircularProgress`      | `DashboardStage` | "NAP Consistency" label, 100% if true |
| `pillars[].score`       | `HorizontalProgressBar` | `DashboardStage` | GBP Performance section               |
| `pillars[].category`    | Progress bar label      | `DashboardStage` | 5 categories                          |
| `pillars[].key_finding` | Finding text            | `DashboardStage` | Detailed recommendations              |

---

## Testing Checklist

### Database

- [ ] PostgreSQL schema created successfully
- [ ] Test INSERT query manually
- [ ] Test UPDATE queries manually
- [ ] Verify indexes created

### n8n

- [ ] PostgreSQL credential configured in n8n
- [ ] Node #1 saves screenshots + updates realtime_status to 1
- [ ] Node #2 saves website analysis + updates to 2
- [ ] Node #3 saves self GBP + updates to 3
- [ ] Node #4 saves competitors + updates to 4
- [ ] Node #5 saves GBP analysis + updates to 5 + status to 'completed'
- [ ] Verify `audit_id` passes through entire workflow

### Backend

- [ ] `POST /api/audit/start` creates record and returns audit_id
- [ ] `GET /api/audit/:id/status` returns correct data
- [ ] Competitor self-filtering works (removes self from array)
- [ ] Score normalization works (strings → numbers)
- [ ] Missing lat/lng fallback works

### Frontend

- [ ] `useAuditPolling` hook polls correctly
- [ ] Stage transitions match realtime_status
- [ ] Progress bar updates smoothly
- [ ] Real data renders when available
- [ ] Mock data fallback works when data is null
- [ ] Polling stops when status = 'completed'

### End-to-End

- [ ] Select business → Create audit → n8n processes → UI updates → Dashboard shows
- [ ] Full flow completes in expected time (~30-60 seconds)
- [ ] Error handling works if n8n fails

---

## Troubleshooting

### Polling not updating UI

- Check browser Network tab for `/status` requests
- Verify `realtime_status` is incrementing in database
- Check console for errors

### n8n not saving to database

- Verify PostgreSQL credentials in n8n
- Check n8n execution logs
- Ensure `audit_id` is being passed to all nodes

### Stage stuck on scanning_website

- Verify screenshots step completed (realtime_status >= 1)
- Check if screenshot URLs are valid S3 links

### Competitors include self business

- Verify `step_self_gbp.placeId` exists
- Check filtering logic in `normalizeCompetitors`
