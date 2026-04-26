export function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:1.05em;font-weight:600;margin:1em 0 0.4em;color:#e4e4e7">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:1.2em;font-weight:700;margin:1.2em 0 0.5em;color:#e4e4e7">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:1.4em;font-weight:700;margin:1.2em 0 0.5em;color:#f4f4f5">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#222;padding:0.1em 0.4em;border-radius:4px;font-size:0.85em;font-family:monospace;color:#a3e635">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#2dd4bf;text-decoration:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^[-*] (.+)$/gm, '<li style="margin:0.2em 0 0.2em 1.4em;list-style-type:disc;color:#d4d4d8">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:0.2em 0 0.2em 1.4em;list-style-type:decimal;color:#d4d4d8">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin:0.7em 0;color:#d4d4d8">')
    .replace(/\n/g, '<br/>');
}
