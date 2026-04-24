const fs = require('fs');

// Fix each route file
const routeFiles = [
    'src/routes/prescription.routes.js',
    'src/routes/medicalhistory.routes.js',
    'src/routes/phlebotomist.routes.js',
    'src/routes/moderation.routes.js'
];

routeFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix 1: Change middleware import
    content = content.replace(
        "const { authenticate } = require('../middleware/auth.middleware');",
        "const { protect } = require('../middleware/auth.middleware');"
    );
    
    // Fix 2: Replace all uses of authenticate with protect
    content = content.replace(/\bauthenticate\b/g, 'protect');
    
    // Write back
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed: ${file}`);
});

console.log('');
console.log('All route files fixed!');
