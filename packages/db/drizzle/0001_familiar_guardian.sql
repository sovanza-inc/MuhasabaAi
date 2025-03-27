CREATE TYPE "public"."role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "chat_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"conversation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"role" "role" NOT NULL,
	"message" text NOT NULL,
	"workspace_id" varchar(255),
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mailroom" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" char(24) NOT NULL,
	"mail_from" text NOT NULL,
	"mail_date" timestamp DEFAULT now() NOT NULL,
	"mail_subject" text,
	"mail_content" text,
	"attached_document" text,
	"icon_url" text,
	"status" varchar(20) DEFAULT 'unread',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;