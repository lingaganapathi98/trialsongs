# Folder Radio

A responsive, dependency-free music player. Deploy `index.html` on any static HTTPS host. No build step, server, Google sign-in, or OAuth is required.

## Setup

1. In [Google Cloud Console](https://console.cloud.google.com/), select or create a project. Open **APIs & Services → Library**, find **Google Drive API**, and enable it.
2. Open **APIs & Services → Credentials → Create credentials → API key**. Edit the key: under **Application restrictions**, select **Websites (HTTP referrers)** and allow your website, for example `https://music.example.com/*`. Add each actual origin you use, including `https://www.example.com/*` if applicable. Under **API restrictions**, choose **Restrict key → Google Drive API**. Save. Restrictions can take a few minutes to apply.
3. Share the music folder as **Anyone with the link → Viewer**. Verify each song is also accessible without signing in and that downloading is allowed. Organization policies may prevent public sharing. This player does not bypass these policies.
4. Copy the folder ID from `https://drive.google.com/drive/folders/FOLDER_ID`. Use only the ID, not the URL. Nested folders and shortcuts are not followed. Link shares requiring additional resource keys may not work with this simple ID-only setup; use a public folder/files accessible with their IDs.
5. In `index.html`, find **ENTER YOUR CONFIGURATION HERE** at the top of the script and replace exactly these values:

   ```js
   const CONFIG = Object.freeze({
     API_KEY: 'YOUR_ACTUAL_API_KEY',
     FOLDER_ID: 'YOUR_ACTUAL_PUBLIC_FOLDER_ID'
   });
   ```

6. Upload `index.html` to your static website and open its HTTPS URL. For local development, serve it over HTTP (for example `npx http-server . -p 8080`) and add `http://localhost:8080/*` as a temporary allowed referrer. Opening `file://` directly will not work reliably with website key restrictions. Avoid a `no-referrer` site policy; Google needs the origin to validate referrer restrictions.

## Use

- Click a song to start a queue from the currently searched and sorted list. **+** appends a song (duplicates allowed); **×** removes queued entries other than the current one. Search/sort do not change an existing queue. Refresh updates the library; an existing queue stays available and each file’s folder membership is checked before playback.
- **Load more** requests the next batch of up to 100 folder entries. Non-audio entries are filtered out. Search and sorting apply to loaded audio; load additional pages to include more songs. Empty batches can still have another page.
- Previous restarts after three seconds; otherwise it returns through playback history. Next advances in queue order, or chooses another random song with shuffle enabled. Repeat cycles **off → all → one**; repeat one applies when a song ends. Shuffle can revisit songs. All controls work with Tab and Enter/Space; sliders support arrow keys. Some mobile browsers require device buttons for volume.

## Requests and limitations

Folder validation uses `GET /drive/v3/files/FOLDER_ID`. Listing always includes `q="'FOLDER_ID' in parents and trashed = false"` and uses `nextPageToken`; it never lists the whole Drive. MIME types beginning `audio/` qualify, with common audio filename extensions as a fallback. Workspace documents and shortcuts are excluded. Sizes are shown when Google supplies them.

Playback uses native `<audio>` with the documented `GET https://www.googleapis.com/drive/v3/files/FILE_ID?alt=media&key=API_KEY` endpoint. Metadata and error diagnostic requests send the key in `X-Goog-Api-Key`; native audio requires the query parameter because it cannot attach that header. The browser may buffer/cache audio normally, but the application never uploads, proxies, or persists songs or Google credentials. The browser API key is visible to visitors: restrict it to this site and the Drive API, and monitor quotas. Use a standard API key, not a service-account credential.

Public listing does not guarantee playback: individual file sharing, download restrictions, quotas, file changes, network conditions, and browser codec/range support can interfere. An error displays next steps and a normal Drive **view** link; there are no undocumented download URLs. MP3 or AAC/M4A are useful browser-compatible choices. Seek and duration become available after usable metadata arrives; a server/browser that cannot seek may limit scrubbing. The player stops on errors instead of skipping them silently. It does not automatically retry quota failures.

No live API key or folder is bundled. You must configure and test with your public files; availability and codecs depend on Google and the browser.

Official references: [public-folder search](https://developers.google.com/workspace/drive/api/guides/search-files), [files.list and pagination](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list), [documented media downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads), [API key restrictions](https://cloud.google.com/api-keys/docs/add-restrictions-api-keys).
