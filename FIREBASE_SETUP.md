# Firebase Cloud Functions Setup for AI Service

This guide explains how to deploy the secure AI proxy using Firebase Cloud Functions.

## Prerequisites

1. Node.js 20 or later
2. Firebase CLI: `npm install -g firebase-tools`
3. A Firebase project (create one at https://console.firebase.google.com)

## Setup Steps

### 1. Initialize Firebase Project

```bash
# Login to Firebase
firebase login

# Update .firebaserc with your project ID
# Replace "YOUR_FIREBASE_PROJECT_ID" with your actual project ID
```

### 2. Configure the API Key

Set the Together AI API key as a Firebase environment variable:

```bash
# From the project root directory
firebase functions:config:set together.api_key="YOUR_TOGETHER_AI_API_KEY"
```

**IMPORTANT**: Never commit API keys to git. The key is stored securely in Firebase.

### 3. Install Dependencies

```bash
cd functions
npm install
```

### 4. Build and Test Locally (Optional)

```bash
# Build TypeScript
npm run build

# Start Firebase emulator
firebase emulators:start --only functions

# The function will be available at:
# http://localhost:5001/YOUR_PROJECT_ID/us-central1/aiProxy
```

### 5. Deploy to Firebase

```bash
# From the project root or functions directory
npm run deploy

# Or use the Firebase CLI directly
firebase deploy --only functions
```

After deployment, you'll see the function URL like:
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/aiProxy
```

### 6. Update App Configuration

Update `.env` file with your deployed function URL:

```
EXPO_PUBLIC_AI_PROXY_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/aiProxy
```

### 7. Update app.json

Add the environment variable to `app.json` under `expo.extra`:

```json
{
  "expo": {
    "extra": {
      "aiProxyUrl": "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/aiProxy"
    }
  }
}
```

## Security Features

The cloud function implements:
- **Rate Limiting**: 10 requests per IP per minute
- **Request Validation**: Validates message format, length, and structure
- **API Key Protection**: API key never exposed to client
- **CORS**: Configured for secure cross-origin requests
- **Timeout Protection**: 30-second request timeout
- **Token Limits**: Max 500 tokens per request

## Testing

Test the deployed function:

```bash
curl -X POST https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/aiProxy \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 50,
    "temperature": 0.7
  }'
```

## Monitoring

View function logs:

```bash
firebase functions:log
```

Or view in Firebase Console:
https://console.firebase.google.com/project/YOUR_PROJECT_ID/functions

## Cost Optimization

- Free tier includes 125K invocations per month
- Rate limiting prevents abuse
- Token limits reduce costs per request
- Consider upgrading to Blaze plan for production

## Troubleshooting

### Function deployment fails
- Ensure you're on Node 20: `node --version`
- Check Firebase project ID in `.firebaserc`
- Verify billing is enabled for your project

### Function returns 500 error
- Check API key is set: `firebase functions:config:get`
- View logs: `firebase functions:log`

### Rate limiting too strict
- Adjust `MAX_REQUESTS_PER_MINUTE` in `functions/src/index.ts`
- Redeploy: `npm run deploy`

## Production Checklist

- [ ] Remove API key from `.env` file (keep only in Firebase config)
- [ ] Add `.env` to `.gitignore`
- [ ] Deploy function to Firebase
- [ ] Update `EXPO_PUBLIC_AI_PROXY_URL` in `.env`
- [ ] Test AI features in app
- [ ] Enable Firebase monitoring
- [ ] Set up billing alerts

## Alternative: Firebase Emulator for Development

For local development without deploying:

```bash
# Set API key for emulator
cd functions
echo 'together.api_key="YOUR_KEY"' > .runtimeconfig.json

# Start emulator
firebase emulators:start --only functions

# Update .env for local testing
EXPO_PUBLIC_AI_PROXY_URL=http://localhost:5001/YOUR_PROJECT_ID/us-central1/aiProxy
```

**Note**: Don't commit `.runtimeconfig.json` to git!
