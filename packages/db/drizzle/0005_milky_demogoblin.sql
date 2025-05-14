ALTER TABLE "questionnaire_responses" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "questionnaire_responses" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "questionnaire_responses" ADD COLUMN "user_id" varchar(36);--> statement-breakpoint
CREATE INDEX "userIdx" ON "questionnaire_responses" USING btree ("user_id");