# CleanTraffic - Quick Setup Guide

Get your bot detection system running in under 5 minutes.

## Step 1: Admin Login
- Go to `/admin`
- Username: `Mark02`
- Password: `Markstorey@2015`

## Step 2: Configure System
1. Click **Settings** tab
2. Enter your configuration details
3. Click **Update**

## Step 3: Create API Key
1. Go to **API Keys** tab
2. Click **Create API Key**
3. Enter a name (e.g., "Production")
4. Copy the generated key (starts with `ak_...`)

## Step 4: Create Client User
1. Go to **Client Users** tab
2. Click **Create Client User**
3. Fill in:
   - Username
   - Password
   - Select the API key you just created
4. Click **Create**

## Step 5: Set Redirect URLs (Client Dashboard)
1. **Logout** from admin
2. Login at `/` with your client username/password
3. Enter your API key when prompted
4. Go to **Settings** → Update redirect URLs:
   - **Human URL**: Where real visitors go (e.g., your website)
   - **Bot URL**: Where bots go (e.g., `https://google.com`)
5. Click **Save**

## Step 6: Download Integration Script
1. In client dashboard, scroll to **Download Integration Script**
2. Click **Download Script**
3. Upload this file to your website
4. Access it via browser - it will automatically redirect based on detection

## Step 7: Deploy (Optional)
Click **Publish** in Replit to make your CleanTraffic dashboard live with a permanent URL.

---

## How It Works

When someone visits your integration script:
- ✅ **Human visitors** → Redirected to your Human URL
- ❌ **Bot traffic** → Redirected to your Bot URL

View all detections and analytics in your dashboard at `/`

---

## Support

- **Dashboard**: Monitor real-time visitor classifications
- **Analytics**: Track human vs bot traffic
- **API Key Management**: Create unlimited keys for different websites
- **White/Blacklists**: Fine-tune detection rules

---

**That's it!** Your bot detection system is now live and protecting your website.
