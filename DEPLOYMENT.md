# Vercel Deployment Guide

## Quick Deploy to Vercel

### Option 1: One-Click Deploy (Recommended)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect Next.js and use the `vercel.json` configuration

### Option 2: Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from the frontend directory
vercel

# For production deployment
vercel --prod
```

## Environment Variables

The following environment variables are configured automatically via `vercel.json`:

- `NEXT_PUBLIC_BACKEND_URL`: Your Modal backend URL

If you need to update the backend URL later:
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Update `NEXT_PUBLIC_BACKEND_URL`

## Build Configuration

The `vercel.json` file contains:
- Build command: `npm run build`
- Output directory: `.next`
- Framework: Next.js
- Environment variables for production

## Testing Before Deploy

```bash
# Build locally
npm run build

# Test production build
npm start
```

## Post-Deployment

After deployment:
1. Test the live URL provided by Vercel
2. Verify the connection to your Modal backend
3. Test file upload functionality
4. Check all PDF extraction features

## Troubleshooting

### Common Issues:
1. **Backend connection fails**: Verify Modal app is running and URL is correct
2. **Build errors**: Check TypeScript/ESLint issues locally first
3. **Environment variables**: Ensure they're set in Vercel dashboard

### Checking Backend Status:
Your Modal backend URL: https://mjenius1357--pdf-extraction-playground-backend-fastapi-app.modal.run

Test it directly: https://mjenius1357--pdf-extraction-playground-backend-fastapi-app.modal.run/docs