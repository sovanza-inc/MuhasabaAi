ALTER TABLE "questionnaire_responses" ALTER COLUMN "id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questionnaire_responses" ALTER COLUMN "workspace_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_id_workspace_id_pk" PRIMARY KEY("id","workspace_id");