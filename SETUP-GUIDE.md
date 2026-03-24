# Starve; Get Rich — Setup Guide

You have 3 files:
- **index.html** — the entire app
- **manifest.json** — makes it work as a phone app
- **google-apps-script.js** — the backend code for Google Sheets

---

## STEP 1: Set up Google Sheets backend (10 min)

This stores your data in your Google Drive so it works across all your devices.

### 1a. Create the Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Click **+ Blank** to create a new spreadsheet
3. Name it **"Starve Get Rich - Budget"** (or whatever you like)

### 1b. Add the backend script
1. In your new sheet, click **Extensions** → **Apps Script**
2. This opens a code editor. **Delete** everything in the code area
3. Open the `google-apps-script.js` file from your download
4. **Copy ALL** the code and **paste** it into the Apps Script editor
5. Click the **💾 Save** button (or Ctrl+S / Cmd+S)

### 1c. Deploy as a Web App
1. Click **Deploy** → **New deployment** (top right)
2. Click the ⚙️ gear icon next to "Select type" → choose **Web app**
3. Set these options:
   - **Description**: "Starve Get Rich Backend" (or anything)
   - **Execute as**: "Me" (your Google account)
   - **Who has access**: "Anyone"
4. Click **Deploy**
5. Google will ask you to **authorize**. Click through the prompts:
   - Click "Review permissions"
   - Select your Google account
   - If you see "This app isn't verified", click "Advanced" → "Go to [script name] (unsafe)" — this is safe, it's YOUR script
   - Click "Allow"
6. You'll see a **Web app URL** — it looks like:
   `https://script.google.com/macros/s/AKfycbx.../exec`
7. **COPY THIS URL** — you'll need it in the next step

**Important**: If you ever update the script code, you need to create a New Deployment again to get an updated URL.

---

## STEP 2: Host the app for free on GitHub Pages (10 min)

### 2a. Create a GitHub account
1. Go to [github.com](https://github.com) → **Sign up** (free)

### 2b. Create a repository
1. Click **+** (top right) → **New repository**
2. Name it: `starve-get-rich`
3. Select **Public**
4. Check **Add a README file**
5. Click **Create repository**

### 2c. Upload the app files
1. Click **Add file** → **Upload files**
2. Drag in **index.html** and **manifest.json** (NOT the google-apps-script.js — that's already in your Google Sheet)
3. Click **Commit changes**

### 2d. Enable GitHub Pages
1. Go to **Settings** (tab at top)
2. Sidebar → **Pages**
3. Under Source: select **Deploy from a branch**
4. Branch: **main**, folder: **/ (root)**
5. Click **Save**
6. Wait 2 minutes, refresh, and you'll see your URL:
   `https://YOURUSERNAME.github.io/starve-get-rich/`

---

## STEP 3: Connect everything (2 min)

1. Open your app URL in Safari (iPhone) or Chrome
2. Tap the ⚙️ **Settings** tab (bottom right)
3. Paste your **Google Apps Script URL** from Step 1c
4. Tap **Test connection** — you should see "Connected!"
5. (Optional) If you have an Anthropic API key, paste it in the AI Parsing field

---

## STEP 4: Add to your phone's home screen (30 sec)

### iPhone (Safari):
1. Open the app URL in **Safari**
2. Tap the **Share** button (square with arrow)
3. Scroll down → **Add to Home Screen**
4. Tap **Add**

### Android (Chrome):
1. Open the app URL in **Chrome**
2. Tap the **⋮** menu (top right)
3. Tap **Add to Home Screen** or **Install App**

---

## How to use it

### Logging a transaction
1. Tap the green **🎤 mic button**
2. Either **speak** or **type** your transaction naturally
3. The app parses it and fills in the form
4. Review → tap **Save**

### Voice/text examples that work
| You say/type | App understands |
|---|---|
| `"47 costco groceries"` | $47 expense, Groceries |
| `"coffee 5.50"` | $5.50 expense, Dining out |
| `"got paid 2100"` | $2,100 income, Salary |
| `"rent 1500"` | $1,500 expense, Rent/Mortgage |
| `"saved 200 tfsa"` | $200 savings, TFSA |
| `"uber 23 yesterday"` | $23 expense, Transport/Gas, yesterday's date |
| `"netflix 16.99"` | $16.99 expense, Subscriptions |

**With LLM enabled** (API key added), it also understands complex inputs like:
- "dropped 85 at the barber and grabbed lunch"
- "my paycheck came in today, 2100 after tax"
- "put 500 into my TFSA last Friday"

### Managing categories
Go to **Settings** → scroll to the category sections → use the **Add** button to create custom categories or the **×** button to remove ones you don't use.

### Time periods
Both the **Insights** and **History** tabs have period filters:
- **1W** — last 7 days
- **2W** — last 14 days
- **1M** — current month
- **3M** — last 3 months
- **1Y** — current year
- **All** — everything

### Backing up
Your data lives in Google Sheets, so it's already backed up in your Google Drive. But you can also export a CSV anytime from Settings.

---

## FAQ

**Can two people share the same budget?**
Yes! Share the Google Sheet with another person, and have them use the same Apps Script URL in their app. Both of you will see the same data.

**What if I lose internet?**
Transactions save to your phone's local storage immediately, so you won't lose them. They'll sync to Google Sheets next time you're online.

**Does the AI parsing cost money?**
Without an API key, the built-in parser handles most simple inputs for free. With an Anthropic API key, each transaction costs about $0.001 (one tenth of a cent) — so roughly $0.30/month if you log 10 transactions/day.

**Can I use this on my computer too?**
Yes — open the same URL in any browser. Since data lives in Google Sheets, it's the same everywhere.

**What if voice doesn't work?**
Make sure you're using Safari (iPhone) or Chrome (desktop/Android). Check microphone permissions. The text input uses the same smart parser — just type naturally instead.
