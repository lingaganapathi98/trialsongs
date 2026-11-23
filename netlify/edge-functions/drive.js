export default async function handler(request) {
  const key = Netlify.env.get('GOOGLE_API_KEY');
  const folder = Netlify.env.get('GOOGLE_FOLDER_ID');
  const error = (status, message) => Response.json({error:{message}}, {status, headers:{'Cache-Control':'no-store'}});
  if (!key || !folder || !/^[\w-]+$/.test(folder)) return error(500, 'Server configuration is missing or invalid.');
  if (request.method !== 'GET') return error(405, 'Method not allowed.');
  const url = new URL(request.url);
  const drive = (path, params = {}, range) => {
    const target = new URL(`https://www.googleapis.com/drive/v3/${path}`);
    for (const [name, value] of Object.entries(params)) if (value) target.searchParams.set(name, value);
    return fetch(target, {headers:{'X-Goog-Api-Key':key, ...(range ? {Range:range} : {})}});
  };
  try {
    let upstream;
    if (url.pathname === '/api/folder') {
      upstream = await drive(`files/${folder}`, {fields:'name,mimeType,trashed', supportsAllDrives:'true'});
    } else if (url.pathname === '/api/files') {
      upstream = await drive('files', {q:`'${folder}' in parents and trashed = false`, fields:'nextPageToken,files(id,name,mimeType,size,resourceKey)', pageSize:'100', orderBy:'name', spaces:'drive', supportsAllDrives:'true', includeItemsFromAllDrives:'true', pageToken:url.searchParams.get('pageToken')});
    } else {
      const match = url.pathname.match(/^\/api\/files\/([\w-]+)$/);
      if (!match) return error(404, 'Not found.');
      const id = match[1];
      const resourceKey = url.searchParams.get('resourceKey');
      const meta = await drive(`files/${id}`, {fields:'id,parents,trashed,resourceKey,capabilities(canDownload)', supportsAllDrives:'true', resourceKey});
      if (!meta.ok) upstream = meta;
      else {
        const data = await meta.json();
        if (data.trashed || !Array.isArray(data.parents) || !data.parents.includes(folder)) return error(403, 'This song is no longer in the configured folder.');
        if (url.searchParams.get('alt') === 'media') upstream = await drive(`files/${id}`, {alt:'media', resourceKey}, request.headers.get('range'));
        else { delete data.parents; return Response.json(data, {headers:{'Cache-Control':'no-store'}}); }
      }
    }
    const headers = new Headers({'Cache-Control':'no-store'});
    for (const name of ['content-type','content-length','content-range','accept-ranges']) { const value = upstream.headers.get(name); if (value) headers.set(name, value); }
    return new Response(upstream.body, {status:upstream.status, headers});
  } catch { return error(502, 'Unable to reach Google Drive.'); }
}
