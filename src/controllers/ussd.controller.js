const pool = require('../config/database');

// USSD menu handler
exports.handleUSSD = async (req, res) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    let response = '';
    const textArray = text ? text.split('*') : [];
    const level = textArray.length;

    // Create or update session
    await createOrUpdateSession(sessionId, phoneNumber, text);

    // Main menu
    if (text === '') {
      response = 'CON Karibu Charla Medics\n';
      response += '1. Jisajili\n';
      response += '2. Ongea na Daktari\n';
      response += '3. Angalia Cheti\n';
      response += '4. Dawa Zangu';
    }
    
    // Registration
    else if (text === '1') {
      response = 'CON Jaza NIDA yako:';
    }
    else if (text.startsWith('1*') && level === 2) {
      const nida = textArray[1];
      response = 'CON Jaza jina lako kamili:';
    }
    
    // Consultation
    else if (text === '2') {
      response = 'CON Chagua aina ya mazungumzo:\n';
      response += '1. Simu (Audio)\n';
      response += '2. Haraka (SMS)';
    }
    
    // Certificate lookup
    else if (text === '3') {
      response = 'CON Jaza namba ya cheti:';
    }
    else if (text.startsWith('3*') && level === 2) {
      const certNumber = textArray[1];
      const certInfo = await getCertificateInfo(certNumber);
      response = `END ${certInfo}`;
    }
    
    // Medications
    else if (text === '4') {
      response = 'END Taarifa za dawa zitakutumia kwa SMS';
    }
    
    // Default
    else {
      response = 'END Chaguo si sahihi';
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);

  } catch (error) {
    console.error('USSD error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('END Kuna tatizo. Jaribu tena.');
  }
};

async function createOrUpdateSession(sessionId, phoneNumber, text) {
  await pool.query(`
    INSERT INTO ussd_sessions (session_id, phone_number, current_menu, last_activity_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (session_id) DO UPDATE
    SET last_activity_at = NOW(), current_menu = $3
  `, [sessionId, phoneNumber, text]);
}

async function getCertificateInfo(certNumber) {
  try {
    const cert = await pool.query(
      'SELECT * FROM medical_certificates WHERE certificate_number = $1',
      [certNumber]
    );
    
    if (!cert.rows[0]) {
      return 'Cheti hakijapatikana';
    }

    return `Cheti: ${certNumber}\n` +
           `Mgonjwa: ${cert.rows[0].patient_name}\n` +
           `Hali: ${cert.rows[0].status}`;
  } catch (error) {
    return 'Hitilafu katika kupata cheti';
  }
}

module.exports = exports;
