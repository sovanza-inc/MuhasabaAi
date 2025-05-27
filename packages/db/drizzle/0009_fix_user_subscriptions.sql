-- Add the foreign key constraint if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_subscriptions_user_id_auth_users_id_fk'
    ) THEN
        ALTER TABLE "user_subscriptions" 
        ADD CONSTRAINT "user_subscriptions_user_id_auth_users_id_fk" 
        FOREIGN KEY ("user_id") 
        REFERENCES "auth_users"("id") 
        ON DELETE CASCADE 
        ON UPDATE NO ACTION;
    END IF;
END $$;
