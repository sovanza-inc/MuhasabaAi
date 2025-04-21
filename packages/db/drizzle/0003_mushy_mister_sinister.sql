DROP INDEX "workspaceIdx";--> statement-breakpoint
ALTER TABLE "questionnaire_responses" ADD COLUMN "system_prompt" text;--> statement-breakpoint
CREATE INDEX "workspaceIdx" ON "questionnaire_responses" USING btree ("id","workspace_id");--> statement-breakpoint
ALTER TABLE "questionnaire_responses" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "questionnaire_responses" DROP COLUMN "notes";