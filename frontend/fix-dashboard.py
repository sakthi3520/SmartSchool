import os

path = r'c:\Users\DELL\OneDrive\Documents\Desktop\SmartSchool\frontend\app\page.tsx'

with open(path, 'r') as f:
    content = f.read()

# Find the new return statement (should reference 'students' and 'getStudents')
# The new content starts with '<main className="min-h-screen'
# The old return content has 'w-60 flex-col' (sidebar)
# We want everything from the new content onwards

# Find the position of the NEW content marker
new_marker = '<main className="min-h-screen bg-[#f5f7fb] p-4 text-slate-800 sm:p-8">'
old_marker = '<aside className="fixed left-0 top-0 z-20 hidden'

if new_marker in content and old_marker in content:
    new_pos = content.find(new_marker)
    old_pos = content.find(old_marker)
    
    if new_pos < old_pos:
        # New content exists AND old content comes after it - remove old part
        # Find the end of the old return statement (after the first return)
        # The old content ends with ')}' followed by the new content starting
        # Extract the new content from the new_marker onwards
        new_section = content[new_pos:]
        # Find where the new section ends (first '</main>' followed by ');' and '}')
        # The new content ends with '});\n}'
        end_pos = content.find('</main>', new_pos)
        if end_pos != -1:
            end_pos = content.find('});', end_pos)
            if end_pos != -1:
                end_pos += 3  # include '});'
                # The new content ends at end_pos, but we need to add the final '}'
                # Actually let's just keep everything from new_pos
                content = content[new_pos:]
                print(f'Removed old content. New file starts at line ~{content.count(chr(10))+1}')

with open(path, 'w') as f:
    f.write(content)

print('File updated.')