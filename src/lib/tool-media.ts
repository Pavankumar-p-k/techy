function parseHostname(input: string): string | null {
  try {
    return new URL(input).hostname;
  } catch {
    return null;
  }
}

export function getToolLogoUrl(logoUrl: string | null, toolUrl: string): string | null {
  if (logoUrl) {
    return logoUrl;
  }

  const hostname = parseHostname(toolUrl);
  if (!hostname) {
    return null;
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;
}
