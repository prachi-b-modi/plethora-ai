export interface UserscriptMetadata {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  matches: string[];
  excludeMatches?: string[];
  runAt: 'document_start' | 'document_end' | 'document_idle';
  grant?: string[];
}

export function parseUserscriptHeader(source: string): UserscriptMetadata | null {
  // Extract the userscript header block
  const headerMatch = source.match(/\/\/\s*==UserScript==\s*\n([\s\S]*?)\n\/\/\s*==\/UserScript==/);
  if (!headerMatch) {
    return null;
  }

  const headerBlock = headerMatch[1];
  const metadata: UserscriptMetadata = {
    name: 'Unnamed Script',
    matches: [],
    runAt: 'document_idle'
  };

  // Parse each metadata line
  const lines = headerBlock.split('\n');
  for (const line of lines) {
    const match = line.match(/\/\/\s*@(\S+)\s+(.+)$/);
    if (!match) continue;

    const [, key, value] = match;
    const trimmedValue = value.trim();

    switch (key) {
      case 'name':
        metadata.name = trimmedValue;
        break;
      case 'description':
        metadata.description = trimmedValue;
        break;
      case 'version':
        metadata.version = trimmedValue;
        break;
      case 'author':
        metadata.author = trimmedValue;
        break;
      case 'match':
      case 'include':
        metadata.matches.push(convertToMatchPattern(trimmedValue));
        break;
      case 'exclude':
      case 'exclude-match':
        if (!metadata.excludeMatches) metadata.excludeMatches = [];
        metadata.excludeMatches.push(convertToMatchPattern(trimmedValue));
        break;
      case 'run-at':
        const runAt = trimmedValue.replace(/-/g, '_');
        if (['document_start', 'document_end', 'document_idle'].includes(runAt)) {
          metadata.runAt = runAt as 'document_start' | 'document_end' | 'document_idle';
        }
        break;
      case 'grant':
        if (!metadata.grant) metadata.grant = [];
        metadata.grant.push(trimmedValue);
        break;
    }
  }

  // Validate that we have at least one match pattern
  if (metadata.matches.length === 0) {
    return null;
  }

  return metadata;
}

// Convert Greasemonkey patterns to Chrome match patterns
function convertToMatchPattern(pattern: string): string {
  // If it's already a valid match pattern, return as-is
  if (pattern.match(/^(https?|\*):\/\//)) {
    return pattern;
  }

  // Convert simple wildcards to match patterns
  if (pattern.includes('*')) {
    // Replace * with .* for regex-like patterns
    pattern = pattern.replace(/\*/g, '.*');
  }

  // If no protocol specified, default to both http and https
  if (!pattern.includes('://')) {
    return `*://${pattern}`;
  }

  return pattern;
}

// Extract just the script body (without header)
export function extractScriptBody(source: string): string {
  return source.replace(/\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==\s*\n?/, '');
} 