
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
    to: string;
    sound: string;
    title: string;
    body: string;
    data: Record<string, any>;
}

serve(async (req) => {
    try {
        // Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Get users who have a push token AND have NOT completed an entry for today (UTC)
        // We use UTC for simplicity now. In future, we can store user timezones.

        // Check local time roughly? We'll assume "Today" based on server time.
        const today = new Date().toISOString().split('T')[0];

        const { data: usersToRemind, error } = await supabaseClient.rpc('get_users_needing_reminder', {
            check_date: today
        });

        // If RPC doesn't exist (we haven't created it yet), we can do it via raw query if permissions allow,
        // but RPC is cleaner. Let's try a direct query with left join if RPC fails or just implement the RPC later.
        // Actually, let's implement the logic in Typescript for now to avoid migration dependency if possible,
        // but a JOIN is hard via JS SDK without foreign keys set up exactly right.

        // Let's use a raw query if possible, or just fetch all prefs and check.
        // Fetching all prefs might be heavy.

        // Let's create a SQL function for this in the migration file I'll create next.
        // For now, I'll assume the RPC exists: `get_users_needing_reminder(check_date)`

        if (error) {
            console.error('Error fetching users:', error);
            throw error;
        }

        if (!usersToRemind || usersToRemind.length === 0) {
            return new Response(JSON.stringify({ message: "No users to remind" }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        console.log(`Found ${usersToRemind.length} users to remind.`);

        // 2. Construct Push Messages
        const messages: PushMessage[] = usersToRemind.map((user: any) => ({
            to: user.push_token,
            sound: "default",
            title: "Keep your streak alive! 🔥",
            body: "You haven't completed your daily reflection yet. Take a moment for yourself.",
            data: { type: "streak_reminder" },
        }));

        // 3. Send in batches (Expo recommends batches)
        const chunks = [];
        const chunkSize = 100;
        for (let i = 0; i < messages.length; i += chunkSize) {
            chunks.push(messages.slice(i, i + chunkSize));
        }

        const results = [];

        for (const chunk of chunks) {
            try {
                const response = await fetch(EXPO_PUSH_URL, {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Accept-encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(chunk),
                });

                const json = await response.json();
                results.push(json);
            } catch (e) {
                console.error("Error sending batch:", e);
                results.push({ error: e });
            }
        }

        return new Response(
            JSON.stringify({ success: true, sent: messages.length, details: results }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error sending reminders:", error);

        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
