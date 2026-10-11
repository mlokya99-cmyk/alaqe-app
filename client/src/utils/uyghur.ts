export function formatUyghurTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return 'ھازىرلا';
  }
  if (diffMin < 60) {
    return `${diffMin} مىنۇت بۇرۇن`;
  }

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // If today
  if (date.toDateString() === now.toDateString()) {
    return timeStr;
  }

  // If yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `تۈنۈگۈن ${timeStr}`;
  }

  // Same year
  if (date.getFullYear() === now.getFullYear()) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}-ئاينىڭ ${day}-كۈنى`;
  }

  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function normalizeUyghurText(text: string): string {
  if (!text) return '';
  return text
    .replace(/ك/g, 'ك')
    .replace(/ک/g, 'ك')
    .replace(/ي/g, 'ي')
    .replace(/ی/g, 'ي')
    .replace(/ى/g, 'ى')
    .replace(/أ/g, 'ئا')
    .replace(/إ/g, 'ئى')
    .replace(/آ/g, 'ئا')
    .replace(/ه/g, 'ە')
    .replace(/ة/g, 'ە')
    .replace(/\s+/g, ' ')
    .trim();
}
