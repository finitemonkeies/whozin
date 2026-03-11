
  # Build Whozin MVP

  This is a code bundle for Build Whozin MVP. The original project is available at https://www.figma.com/design/OreA7CPzhslKyqeU66w9go/Build-Whozin-MVP.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## PostHog setup

  PostHog is already wired in the frontend and activates when `VITE_POSTHOG_KEY` is set.

  Add these to your local `.env` and your production host env vars:

  ```env
  VITE_POSTHOG_KEY=phc_YOUR_PROJECT_API_KEY
  VITE_POSTHOG_HOST=https://us.i.posthog.com
  VITE_POSTHOG_UI_HOST=https://us.posthog.com
  ```

  Use `https://eu.i.posthog.com` and `https://eu.posthog.com` instead if your PostHog project is in the EU region.
  
