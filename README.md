# Folder Radio

A music player for a publicly shared Google Drive folder, hosted on Netlify. A Netlify Edge Function reads the configuration on the server and proxies Drive requests; the API key and folder ID are not included in the published page.

## Netlify setup

1. Enable the Google Drive API in Google Cloud and create an API key restricted to that API. Website referrer restrictions are not suitable for the server-side key; check Google Cloud's options for restricting server-side keys. Share the folder and audio files publicly with downloads enabled.
2. In Netlify, add `GOOGLE_API_KEY` and `GOOGLE_FOLDER_ID` under project environment variables. Use the folder ID from its Drive URL. If scopes are available, include **Functions**. Set values for each deploy context you use.
3. Deploy the repository with the included `netlify.toml`. The build copies the page into `dist`, and the Edge Function handles `/api/*`. Redeploy after changing environment variables. Do not put secrets into `netlify.toml`, the HTML, or a committed `.env` file.
4. For local development, use `netlify dev` with the Netlify CLI and set the environment variables in your shell or local `.env` file. The sample `.env.example` lists the variable names.

The folder and songs still need to be publicly accessible. Visitors can see song metadata and file IDs, and can use your public endpoint; use suitable access controls, quota monitoring, and rate limits if needed. The Edge Function validates folder membership before streaming and forwards byte range requests for seeking. Hosting and Drive usage limits apply.

If a key was previously exposed or committed, rotate or delete it in Google Cloud. Removing it from the current page does not revoke it or erase repository history.

## Use

Search or sort loaded songs, click a song to play, and use **+** to add songs to the queue. **Load more** fetches additional batches. Playback supports shuffle, repeat and seeking when the browser and Drive support it. Public sharing, download permissions, Drive quotas, network conditions and browser codec support affect playback.

Run client checks with `node test.cjs` and Edge Function checks with `node test-edge.cjs`.
