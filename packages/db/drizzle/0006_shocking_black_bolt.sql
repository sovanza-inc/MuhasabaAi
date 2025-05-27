CREATE TYPE "public"."subscription_status" AS ENUM('free', 'active', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"status" "subscription_status" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
