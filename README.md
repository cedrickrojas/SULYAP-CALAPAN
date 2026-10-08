# Sulyap — Calapan Discovery Guide

A responsive React + Vite + Tailwind tourism website featuring the ten client-selected Calapan destinations, direct QR links, twelve information sections per destination, OpenStreetMap embeds, Google Maps directions, and three gallery slots per destination. The visual theme is feminine and professional, with blush/rose accents and no ribbons or lace.

Home presents the destination-photo hero shown in the client's reference, with the shared navigation and footer. Explore Destinations opens the ten-place directory, and Discover More opens About. The directory, project information, and QR instructions remain accessible on their own pages.

The navigation order is Home, QR Directory, Destinations, About, and How It Works. All five links stay visible at the top on desktop and mobile, wrapping below the logo on smaller screens without a hamburger menu. QR entry and section anchors account for the header height so content stays visible below the navigation. QR and destination directories retain their separate pages. Each destination's Information section includes a detailed three-paragraph description, with dated reports distinguished from current access or operating arrangements.

On opening or reloading the React website, a four-second startup screen displays the Sulyap logo with a subtle progress bar. Internal page navigation does not restart it. Direct destination and QR links retain their requested page and information-menu anchor after the startup screen. Animations respect reduced-motion preferences.

## Run locally
From this folder:
```powershell
npm install
npm run dev
```
Open the Local URL printed by Vite. Production output is created with `npm run build`; preview it with `npm run preview`.

## Edit your destinations
Edit `src/destinations.js`. Keep each existing `id` stable once its QR code has been printed. ID routes (`/destination/1`) and slug routes (`/destination/sto-nino-cathedral`) both work. The QR directory uses the stable ID route. IDs 1–10 now refer to the selected Calapan destinations rather than the former sample destinations; old ID-based codes will therefore open the newly assigned place.
Each record includes the requested fields plus municipality, province, region, category, and source links. The shared `basics` object supplies editable defaults for hours, rates, rules, and tips. Add three destination images to `public/images` and update that slug's entries in `src/destination-images.json`. Set `placeholder: false` for confirmed photographs and retain their attribution.

Destinations, in the order supplied by the client: Sto. Niño Cathedral; Silonay Mangrove Conservation Eco-Park; Oriental Mindoro Heritage Museum; Calapan Zoological and Recreational Park; Plaza del Gobernador; Calapan City Plaza; Aganhao Islet; Caluangan Lake; Baco Island; Suqui Beach.

Information includes source links and explicit notes where current schedules, fees, photos, and access need confirmation. The Heritage Museum in Ibaba East is distinct from the City Museum at City Hall; Plaza del Gobernador in Camilmil is distinct from City Plaza. Unverified coordinates remain `null`: the embedded map shows a Calapan overview without an invented marker, while Google Maps searches for the named destination. Lake/island reference pins are not visitor entrances. Their directions link to the tourism office for arranging a permitted departure or access point.

The client-supplied [Travel Oriental Mindoro portal](https://www.travelorientalmindoro.ph/) was reviewed on October 8, 2026. It supplies descriptions, listed admission, destination contacts, four additional map pins, local tourism-office contacts, and the Batangas–Calapan ferry approach. Further-reading links appear on every information page. The portal does not provide complete current hours or individual listings for all ten selected places; those gaps remain explicit. Review decisions and source discrepancies are recorded in `scripts/calapan-source-notes.md`.

## QR codes for real visitors
Open `/qr-directory` for all ten unique codes. Each offers Download QR (print-quality SVG) and Print QR (a destination-specific label). QR cards, popups, and the sample code on How It Works show no button or link that opens the destination; scan the code to open its information menu. QR cards, destination QR popups, and printed labels show the QR image and destination details without displaying the raw URL. QR codes are generated in the browser without a third-party QR API. Scanning opens `/destination/:id#information` directly at the destination information menu. Ordinary destination links still open the full destination page. Download or print fresh QR codes after this update; previously saved codes retain their original links.

By default, codes point to the origin where the site is open. A localhost URL is accessible only on that computer. Before printing permanent signs, deploy the site to a public HTTPS address. If the QR codes should use a fixed official address even in local previews, copy `.env.example` to `.env.local`:
```
VITE_PUBLIC_SITE_URL=https://your-public-domain.example
```
Restart Vite or rebuild after changing this value. Print codes from the final origin, then scan each with a separate phone. Visitors must be able to access the published site without an owner-only sign-in.

## Routes
- `/`
- `/destinations`
- `/destination/:idOrSlug`
- `/destination/:idOrSlug/:section`
- `/about`
- `/how-it-works`
- `/qr-directory`

All detail sections have a return link to the destination menu. Unknown pages show a useful recovery screen. On a static host, enable SPA fallback: requests that are not files must serve `index.html`. The root `vercel.json` configures the Vite build, `dist` output, and SPA rewrite on Vercel so direct QR links and page reloads load the React app. Set the Vercel project Root Directory to the repository root, where `package.json` and `vercel.json` are located. A standard `public/_redirects` file is included for other compatible hosts. Verify direct requests to `/destination/5` after deployment.

## Checks
```powershell
npm run check
node scripts/check-startup.mjs
node scripts/smoke.mjs
python scripts/check-qr.py
npm run build
```
The browser check uses the local URL `http://127.0.0.1:5173`. Start the dev server before it. It requires Playwright Chromium (`npx playwright install chromium` if absent). QR decoding verification uses Python OpenCV available in this workspace.

## Photography
Twenty-eight Calapan photos are stored locally: eight openly licensed Commons photos, twelve from the supplied tourism portal, and eight from Calapan community mapping, UPLB, Mindoro Travel Guide, and Philippine Information Agency MIMAROPA. Nine destinations now have three distinct sourced gallery photos each. Aganhao has one sourced aerial photo and two clearly labelled detail views of the same photograph: searches of the client-supplied portal for Aganhao, Aganahao, and Anaganahao returned no results. The shoreline and greenery details are displayed through self-contained SVG viewports that embed the unchanged source JPEG. They are identified as crops of the same aerial photograph, rather than separate photographs. All thirty gallery slots display destination imagery. All ten destination cards and heroes have real photographs. Older sample assets remain on disk for reference.

Current attribution, original source pages, and license details are listed at `/photo-credits.html` and in `scripts/calapan-photo-assets.json`. Sources without stated photographers or reuse licenses are credited to their original publishers without claiming a Commons license. Mia Valiente is credited for the Suqui Travel Guide photograph; Marie Cris De Jaro is credited for the 2022 Caluangan floating-cottage photograph. The Suqui gallery includes the Donnyland beachfront and private resort frontage in Barangay Suqui; neither establishes a public beach entrance, current resort operation, or current prices. The lightbox displays the individual photo caption, including historical dates and island-group names. Images are resized/compressed, with visual crops applied by the interface. Refresh the source assets with `python scripts/prepare-calapan-assets.py`; use `--local-only` to regenerate manifests, credits, and the Aganhao detail views without network access; use `--portal-only` to refresh only the portal photos or `--web-only` to refresh the supplementary source-photo manifest and the Commons Suqui photo. The workflow preserves existing local photos if a source is temporarily unavailable, but regenerates `src/destination-images.json`, so preserve manual manifest edits first. Source URLs are maintained in `scripts/calapan-portal-photo-sources.json` and `scripts/calapan-web-photo-sources.json`. Regenerate only the credit page with `python scripts/prepare-calapan-assets.py --credits-only`. The older `download-photos.py` and `photo-assets.json` concern the previous sample set and should not be used for the current content.

## Implementation
- `src/main.jsx`: page templates, routing, navigation, maps, information panels
- `src/features.jsx`: lightbox galleries and QR generation/download/print
- `src/destinations.js`: editable destination content
- `src/visitor-details.js`: destination-specific precautions, facilities/accessibility planning, fares and return-trip advice
- `src/styles.css`: feminine pink theme, responsive layouts, reduced-motion support
- `src/destination-images.json`: confirmed photos and clearly labelled Aganhao detail views
- `public/`: local photos, favicon, photo credits, static-host route fallback
- `public/branding/sulyap-logo.jpg`: the client's original Sulyap Calapan logo; the logo SVG and favicon embed this unchanged JPEG in a viewport that removes excess outer whitespace. The navigation logo uses a proportional image layout with a separate mobile size; the footer uses text without a logo.

Maps require network access to OpenStreetMap; directions open Google Maps. Fonts use Google Fonts with local system fallbacks. Destination content and photo assets do not depend on an external content API.

The seven client information requirements are mapped to the existing sections in `scripts/destination-information-requirements.md`. All ten destinations include specific precautions, transport and return arrangements, local tourism contact assistance, and facilities/accessibility questions. Unknown fees, schedules, and facilities remain clearly qualified rather than presented as confirmed. Tourism office opening hours are labelled separately from destination hours.
