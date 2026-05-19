CREATE TYPE "public"."insight_kind" AS ENUM('opp', 'thr', 'pat', 'ano');--> statement-breakpoint
CREATE TYPE "public"."mention_type" AS ENUM('organic', 'ad');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('instagram', 'tiktok', 'youtube', 'facebook', 'x', 'reddit', 'mastodon', 'bluesky', 'web', 'meta_ads');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'done', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."sentiment" AS ENUM('pos', 'neu', 'neg', 'mix');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('high', 'med', 'low');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"severity" "severity" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"evidence" text,
	"read" boolean DEFAULT false NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"handle" text NOT NULL,
	"brand" text NOT NULL,
	"is_client" boolean DEFAULT false NOT NULL,
	"accent" text,
	"platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"kind" "insight_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"sources" integer DEFAULT 0 NOT NULL,
	"confidence" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"competitor_id" uuid,
	"platform" "platform" NOT NULL,
	"author" text NOT NULL,
	"handle" text NOT NULL,
	"brand" text,
	"body" text NOT NULL,
	"thumb_type" text,
	"thumb_src" text,
	"is_ad" boolean DEFAULT false NOT NULL,
	"sentiment" "sentiment" DEFAULT 'neu' NOT NULL,
	"type" "mention_type" DEFAULT 'organic' NOT NULL,
	"engagement" integer DEFAULT 0 NOT NULL,
	"metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"permalink" text,
	"posted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"status" "report_status" DEFAULT 'draft' NOT NULL,
	"pages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"cost_usd" double precision DEFAULT 0 NOT NULL,
	"piece_count" integer DEFAULT 0 NOT NULL,
	"params" jsonb,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE set null ON UPDATE no action;