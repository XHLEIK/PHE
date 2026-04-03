const fs = require('fs');
const path = require('path');

const files = [
  'app/api/complaints/[id]/reveal-contact/route.ts',
  'app/api/complaints/[id]/reanalyze/route.ts',
  'app/api/complaints/[id]/notes/route.ts',
  'app/api/complaints/[id]/escalate/route.ts',
  'app/api/complaints/[id]/assign/route.ts'
];

files.forEach(f => {
  const fullPath = path.join(__dirname, '..', f);
  if (!fs.existsSync(fullPath)) {
    console.log('Not found:', f);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');

  // Replace `const { id } = await params;`
  content = content.replace(
    /const \{ id \} = await params;/g,
    'const { id: rawId } = await params;\n    const id = decodeURIComponent(rawId);'
  );

  // Replace `const { id } = await context.params;`
  content = content.replace(
    /const \{ id \} = await context\.params;/g,
    'const { id: rawId } = await context.params;\n    const id = decodeURIComponent(rawId);'
  );

  fs.writeFileSync(fullPath, content);
  console.log('Fixed:', f);
});
