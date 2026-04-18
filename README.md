# Gold Offer Coach

A custom AI coach that helps entrepreneurs transform their strengths, gifts, and passions into clear, profitable offers using Dr. Johnna's G.O.L.D. Framework.

This is the web rebuild of the Pickaxe "Gold Offer Coach," now living inside your own ecosystem.

Live at: `goldoffer.drjohnna.co` (once deployed)

---

## What this is

- A chat interface powered by Claude (Anthropic's API)
- A password gate so only Legacy Lab members and past clients can access it
- A PDF download of the full conversation
- A copy-to-clipboard option
- Clean, editorial, on-brand design (cream, dark, teal)
- No external dependencies beyond Claude. No Pickaxe, no Formwise, no email service.

---

## File structure

```
goldoffer/
├── api/
│   ├── _system-prompt.js     Full coach instructions + knowledge base. Edit here to refine behavior.
│   ├── chat.js               Streams responses from Claude.
│   └── verify.js             Checks the access code.
├── public/
│   ├── index.html            Gate, welcome, and chat screens.
│   ├── styles.css            All styling.
│   └── app.js                Client-side logic (chat, streaming, PDF, copy).
├── .env.example              Template for environment variables.
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

---

## Setup (first time)

### Step 1. Create the GitHub repo

1. Go to github.com/dr-johnna and create a new private repo called `goldoffer`.
2. Do not initialize it with a README. You will push this code into it.

### Step 2. Get your local copy into GitHub

From the folder containing these files:

```bash
git init
git add .
git commit -m "Initial commit, Gold Offer Coach v1"
git branch -M main
git remote add origin https://github.com/dr-johnna/goldoffer.git
git push -u origin main
```

### Step 3. Deploy to Vercel

1. Go to vercel.com and click "Add New Project."
2. Import the `goldoffer` repo from GitHub.
3. Framework Preset: leave as "Other" (Vercel will auto-detect).
4. Root Directory: leave as is.
5. Build and Output Settings: leave defaults.
6. Environment Variables: add these two before deploying.
   - `ANTHROPIC_API_KEY` — your API key from console.anthropic.com
   - `ACCESS_CODE` — the password clients will enter (e.g. `goldenlab`)
7. Click Deploy.

### Step 4. Connect your domain

1. In your Vercel project, go to Settings, Domains.
2. Add `goldoffer.drjohnna.co`.
3. Vercel will give you a CNAME record.
4. In Namecheap, add a CNAME for `goldoffer` pointing to `cname.vercel-dns.com`.
5. Wait a few minutes for DNS to propagate.

That is it. Clients enter the access code, pick an entry path, and start coaching.

---

## How to edit the coach's behavior

The full role prompt, flow rules, G.O.L.D. framework, scorecard, and knowledge base all live in one place:

**`api/_system-prompt.js`**

Open that file to change:

- How the coach opens the conversation
- The phrasing of the G.O.L.D. framework
- The review scorecard criteria
- Word preferences (words to use, words to avoid)
- The knowledge base (Gold Offer Fundamentals, the 3-day challenge, pricing philosophy, etc.)

After editing, commit the change and Vercel will auto-deploy the new version.

You do not need to touch any other files to change the coach's behavior.

---

## How to share access with clients

Once the site is live:

1. Decide on the access code you set in the `ACCESS_CODE` environment variable.
2. Share it inside Skool, via email to past clients, or inside Legacy Lab.
3. Clients go to `goldoffer.drjohnna.co`, enter the code, and start using the coach.

To change the access code later, update the `ACCESS_CODE` variable in Vercel. Clients will need to re-enter the new code in their next session.

---

## Local development (optional)

If you want to run this on your laptop before deploying:

```bash
npm install -g vercel
vercel login
vercel dev
```

Then visit `http://localhost:3000`.

For local dev, create a `.env.local` file based on `.env.example`.

---

## What is not in this build (Phase 2)

- No user accounts. Each session is fresh. If you want true memory across sessions, that requires Supabase auth.
- No email summary. PDF download and clipboard copy handle this. Email can be added if clients ask for it.
- No analytics. If you want to see how clients are using it, Vercel Analytics or Plausible can be added.

These are all deliberate scope choices for Phase 1 to get the tool live fast.

---

## A note on the strategic context

This coach is one of many tools in the "Tools by Dr. Johnna" ecosystem. Phase 2 is a hub at `tools.drjohnna.co` that unifies this, the Carousel Maker, Content Studio, and future builds into one place for clients. This coach is intentionally standalone for now so it can ship this week.

Relaunch plan suggestion: when this goes live, do a Legacy Lab live session walking members through it, a Skool post, and an email to past clients. A better build only helps if clients actually use it.

---

Built with the G.O.L.D. Framework.
doctorjohnna.com
