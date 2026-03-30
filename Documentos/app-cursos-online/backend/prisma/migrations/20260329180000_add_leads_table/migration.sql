-- Create LeadStatus enum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATING', 'WON', 'LOST');

-- Create leads table
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "interest" TEXT,
    "notes" TEXT,
    "last_contact_at" TIMESTAMP(3),
    "next_followup" TIMESTAMP(3),
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_email_idx" ON "leads"("email");
