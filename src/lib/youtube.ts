// Handles both youtu.be/ID and youtube.com/watch?v=ID; returns null when the
// URL has no extractable video ID (e.g. a youtube.com/results search-query
// link, which YouTube refuses to render inside an iframe or thumbnail).
export function getYouTubeVideoId(url: string): string | null {
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];
  const longMatch = url.match(/[?&]v=([^?&]+)/);
  if (longMatch) return longMatch[1];
  return null;
}

export function toEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export function toThumbnailUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
