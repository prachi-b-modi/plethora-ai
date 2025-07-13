const fs = require('fs');
const path = require('path');

// Path to the userscripts output directory
const USERSCRIPTS_DIR = path.join(__dirname, '..', 'extension', 'userscripts');
const STORAGE_FILE = path.join(__dirname, '..', 'userscripts-dev.json');

// Ensure the userscripts directory exists
if (!fs.existsSync(USERSCRIPTS_DIR)) {
  fs.mkdirSync(USERSCRIPTS_DIR, { recursive: true });
}

// Clean up old userscript files
const existingFiles = fs.readdirSync(USERSCRIPTS_DIR);
existingFiles.forEach(file => {
  if (file.endsWith('.js')) {
    fs.unlinkSync(path.join(USERSCRIPTS_DIR, file));
  }
});

// Load userscripts from storage file (for development)
let userscripts = [];
if (fs.existsSync(STORAGE_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
    userscripts = Object.values(data.scripts || {});
    console.log(`Loaded ${userscripts.length} userscripts from ${STORAGE_FILE}`);
  } catch (error) {
    console.error('Error loading userscripts:', error);
  }
}

// Extract script body (remove header)
function extractScriptBody(source) {
  return source.replace(/\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==\s*\n?/, '');
}

// Write each userscript to a file
userscripts.forEach(script => {
  if (script.enabled) {
    const scriptBody = extractScriptBody(script.source);
    const filePath = path.join(USERSCRIPTS_DIR, `${script.id}.js`);
    
    // Add a wrapper to catch errors
    const wrappedScript = `
// Userscript: ${script.metadata.name}
// Generated at: ${new Date().toISOString()}
(function() {
  'use strict';
  try {
    ${scriptBody}
  } catch (error) {
    console.error('[Userscript Error] ${script.metadata.name}:', error);
  }
})();
`;
    
    fs.writeFileSync(filePath, wrappedScript);
    console.log(`✓ Built userscript: ${script.metadata.name} (${script.id}.js)`);
  }
});

// Create an index file for reference
const indexContent = {
  generated: new Date().toISOString(),
  scripts: userscripts.map(s => ({
    id: s.id,
    name: s.metadata.name,
    enabled: s.enabled,
    matches: s.metadata.matches
  }))
};

fs.writeFileSync(
  path.join(USERSCRIPTS_DIR, 'index.json'),
  JSON.stringify(indexContent, null, 2)
);

console.log(`\nUserscripts build complete. Generated ${userscripts.filter(s => s.enabled).length} active scripts.`); 