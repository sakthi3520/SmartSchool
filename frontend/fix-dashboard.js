const fs = require('fs');
const path = 'c:\\\\Users\\\\DELL\\\\OneDrive\\\\Documents\\\\Desktop\\\\SmartSchool\\\\frontend\\\\app\\\\page.tsx';

// Find the line where the new return statement starts (line with "return (")
const fileContent = fs.readFileSync(path, 'utf8');
const lines = fileContent.split('\\n');
let newContentStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'return (' && i > 100) {
    newContentStart = i;
    break;
  }
}

if (newContentStart === -1) {
  console.log('Could not find return statement');
  process.exit(1);
}

// The new content starts at newContentStart
const newContent = lines.slice(newContentStart);
fs.writeFileSync(path, newContent.join('\\n'));
console.log('File updated successfully.');