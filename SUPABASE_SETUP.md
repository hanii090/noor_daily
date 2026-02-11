# Supabase Setup Instructions

Follow these steps to complete the Supabase migration for your Noor Daily app.

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in the details:
   - **Name**: `noor-daily`
   - **Database Password**: Generate a secure password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for now
5. Click "Create new project"
6. Wait for the project to be provisioned (~2 minutes)

## 2. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the schema
6. You should see success messages for all tables created

## 3. Enable Anonymous Authentication

1. Go to **Authentication** → **Providers**
2. Find **Anonymous Sign-in**
3. Toggle it to **Enabled**
4. Click "Save"

This allows users to use the app without creating accounts while still having their data in the cloud.

## 4. Get API Credentials

1. Go to **Settings** → **API**
2. Find the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## 5. Add Credentials to Your App

Create a `.env` file in your project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
```

Replace with your actual values from step 4.

> **IMPORTANT**: Add `.env` to your `.gitignore` if it's not already there!

## 6. Update Supabase Config

The config file at `src/config/supabase.ts` will automatically read from your `.env` file.

If you prefer to hardcode the values (not recommended for production):
1. Open `src/config/supabase.ts`
2. Replace `YOUR_SUPABASE_URL` with your Project URL
3. Replace `YOUR_SUPABASE_ANON_KEY` with your anon public key

## 7. Test the Connection

Run your app:

```bash
npm start
```

The app will automatically:
1. Create an anonymous user session on first launch
2. Save history and exam data to Supabase
3. Queue operations when offline
4. Sync when connection is restored

## 8. Verify Data in Supabase

1. Go to **Table Editor** in your Supabase dashboard
2. You should see three tables:
   - `history_entries`
   - `exam_sessions`
   - `user_preferences`
3. Use the app for a bit (view verses, take exams)
4. Refresh the table editor - you should see data appearing!

## 9. Monitor Usage

Go to **Database** → **Usage** to monitor:
- Database size
- Number of rows
- API requests

The free tier includes:
- 500MB database space
- Up to 50,000 monthly active users
- Unlimited API requests

This should be more than enough for personal use!

## Troubleshooting

### "Network request failed"
- Check your internet connection
- Verify Supabase project URL is correct
- Check if Supabase project is paused (free tier projects pause after 1 week of inactivity)

### "Anonymous sign-in not enabled"
- Make sure you enabled Anonymous Sign-in in step 3
- Wait a few seconds and try again

### "Row Level Security policy violation"
- Make sure you ran the entire schema.sql file
- Check that RLS policies were created (go to Authentication → Policies)

### Data not appearing
- Check browser console / React Native logs for errors
- Verify user session exists: `await userIdentityService.getUserId()`
- Check offline queue: `offlineQueueService.getStatus()`

## Migration from AsyncStorage (Optional)

If you have existing users with data in AsyncStorage, you can create a migration script to copy their data to Supabase. This is optional since new installations will start fresh with Supabase.

Let me know if you need help with this!
