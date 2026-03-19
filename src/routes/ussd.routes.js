const express = require('express');
const router = express.Router();

// USSD callback endpoint (no authentication - telco calls this)
router.post('/callback', (req, res) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    // Simple USSD menu structure
    let response = '';

    if (text === '') {
      // First request
      response = 'CON Welcome to Charla Medics\n';
      response += '1. Book Consultation\n';
      response += '2. Check Appointment\n';
      response += '3. Contact Support';
    } else if (text === '1') {
      response = 'CON Select Specialty:\n';
      response += '1. General Practitioner\n';
      response += '2. Pediatrician\n';
      response += '3. Gynecologist';
    } else if (text === '2') {
      response = 'END Your next appointment: No appointments scheduled';
    } else if (text === '3') {
      response = 'END Call us: +255 123 456 789\nEmail: support@charlamedics.com';
    } else {
      response = 'END Thank you for using Charla Medics';
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (error) {
    console.error('USSD error:', error);
    res.send('END Service temporarily unavailable');
  }
});

module.exports = router;
