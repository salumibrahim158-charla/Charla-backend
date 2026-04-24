const fs = require('fs');

// Read current server.js
let content = fs.readFileSync('src/server.js', 'utf8');

// Fix 1: Add route requires
const webhookLine = "const webhookRoutes = require('./routes/webhook.routes');";
const newRequires = `const webhookRoutes = require('./routes/webhook.routes');
const prescriptionRoutes = require('./routes/prescription.routes');
const medicalhistoryRoutes = require('./routes/medicalhistory.routes');
const phlebotomistRoutes = require('./routes/phlebotomist.routes');
const moderationRoutes = require('./routes/moderation.routes');`;

content = content.replace(webhookLine, newRequires);

// Fix 2: Add route registrations
const ussdRegistration = "app.use('/api/v1/ussd', ussdRoutes);";
const newRegistrations = `app.use('/api/v1/ussd', ussdRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);
app.use('/api/v1/medical-history', medicalhistoryRoutes);
app.use('/api/v1/phlebotomist', phlebotomistRoutes);
app.use('/api/v1/moderation', moderationRoutes);`;

content = content.replace(ussdRegistration, newRegistrations);

// Write updated server.js
fs.writeFileSync('src/server.js', content);

console.log('✅ server.js updated successfully!');
console.log('');
console.log('Added 4 new routes:');
console.log('  - prescriptionRoutes');
console.log('  - medicalhistoryRoutes');
console.log('  - phlebotomistRoutes');
console.log('  - moderationRoutes');
