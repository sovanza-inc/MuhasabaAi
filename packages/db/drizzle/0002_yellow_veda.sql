CREATE TABLE "questionnaire_responses" (
	"id" char(24) NOT NULL,
	"workspace_id" char(24) NOT NULL,
	"responses" json NOT NULL,
	"version" varchar(50) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "workspaceIdx" ON "questionnaire_responses" USING btree ("workspace_id");