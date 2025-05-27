CREATE TYPE "public"."subscription_status" AS ENUM('free', 'active', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" uuid NOT NULL,
    "plan_id" text NOT NULL,
    "status" "subscription_status" DEFAULT 'free' NOT NULL,
    "stripe_customer_id" text,
    "stripe_subscription_id" text,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now()
);

-- Add foreign key constraint to users table
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
