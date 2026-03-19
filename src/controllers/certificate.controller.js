const pool = require('../config/database');
const certificateGenerator = require('../utils/certificateGenerator');
const { sendSMS } = require('../services/sms.service');

/**
 * Certificate Controller - V1.2
 * Medical certificate generation and management
 */

// Request medical certificate
exports.requestCertificate = async (req, res) => {
  const { consultation_id, reason, duration_days } = req.body;
  const patient_id = req.user.id;

  try {
    // Verify consultation exists and belongs to user
    const consultation = await pool.query(
      'SELECT c.*, u.full_name as doctor_name FROM consultations c JOIN users u ON c.doctor_id = u.id WHERE c.id = $1 AND c.patient_id = $2',
      [consultation_id, patient_id]
    );

    if (consultation.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    if (consultation.rows[0].status !== 'completed') {
      return res.status(400).json({ error: 'Certificate can only be requested for completed consultations' });
    }

    // Check if certificate already exists for this consultation
    const existing = await pool.query(
      'SELECT id FROM medical_certificates WHERE consultation_id = $1',
      [consultation_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Certificate already exists for this consultation' });
    }

    // Generate certificate number (CMC-2026-XXXXXX)
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    const certificate_number = `CMC-${year}-${random}`;

    // Calculate dates
    const issue_date = new Date();
    const valid_from = new Date();
    const valid_until = new Date();
    valid_until.setDate(valid_until.getDate() + (duration_days || 3));

    // Create certificate record
    const result = await pool.query(
      `INSERT INTO medical_certificates (
        certificate_number, consultation_id, patient_id, doctor_id, 
        reason, duration_days, issue_date, valid_from, valid_until, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *`,
      [
        certificate_number,
        consultation_id,
        patient_id,
        consultation.rows[0].doctor_id,
        reason,
        duration_days,
        issue_date,
        valid_from,
        valid_until
      ]
    );

    // Get patient details
    const patient = await pool.query(
      'SELECT full_name, phone FROM users WHERE id = $1',
      [patient_id]
    );

    // Send SMS notification
    if (patient.rows[0].phone) {
      await sendSMS(
        patient.rows[0].phone,
        `Charla Medics: Your medical certificate request (${certificate_number}) has been submitted. It will be reviewed by the doctor shortly.`
      );
    }

    res.status(201).json({
      message: 'Certificate requested successfully',
      certificate: result.rows[0]
    });
  } catch (error) {
    console.error('Request certificate error:', error);
    res.status(500).json({ error: 'Failed to request certificate' });
  }
};

// Approve certificate (doctor only)
exports.approveCertificate = async (req, res) => {
  const { id } = req.params;
  const { diagnosis, recommendations, digital_signature } = req.body;
  const doctor_id = req.user.id;

  try {
    // Verify certificate exists and belongs to this doctor
    const cert = await pool.query(
      'SELECT * FROM medical_certificates WHERE id = $1 AND doctor_id = $2',
      [id, doctor_id]
    );

    if (cert.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (cert.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Certificate already processed' });
    }

    // Generate PDF certificate
    const certificate = cert.rows[0];
    const pdfBuffer = await certificateGenerator.generate({
      ...certificate,
      diagnosis,
      recommendations,
      digital_signature: digital_signature || `Dr. ${req.user.full_name}`,
      approved_at: new Date()
    });

    // Update certificate
    const result = await pool.query(
      `UPDATE medical_certificates SET 
        status = 'approved',
        diagnosis = $1,
        recommendations = $2,
        digital_signature = $3,
        approved_at = NOW(),
        pdf_url = $4
      WHERE id = $5
      RETURNING *`,
      [
        diagnosis,
        recommendations,
        digital_signature || `Dr. ${req.user.full_name}`,
        `certificates/${certificate.certificate_number}.pdf`,
        id
      ]
    );

    // Get patient phone
    const patient = await pool.query(
      'SELECT phone FROM users WHERE id = $1',
      [certificate.patient_id]
    );

    // Send SMS notification
    if (patient.rows[0].phone) {
      await sendSMS(
        patient.rows[0].phone,
        `Charla Medics: Your medical certificate (${certificate.certificate_number}) has been approved and is ready for download.`
      );
    }

    res.json({
      message: 'Certificate approved successfully',
      certificate: result.rows[0],
      pdf: pdfBuffer.toString('base64')
    });
  } catch (error) {
    console.error('Approve certificate error:', error);
    res.status(500).json({ error: 'Failed to approve certificate' });
  }
};

// Reject certificate (doctor only)
exports.rejectCertificate = async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;
  const doctor_id = req.user.id;

  try {
    const cert = await pool.query(
      'SELECT * FROM medical_certificates WHERE id = $1 AND doctor_id = $2',
      [id, doctor_id]
    );

    if (cert.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const result = await pool.query(
      `UPDATE medical_certificates SET 
        status = 'rejected',
        rejection_reason = $1,
        rejected_at = NOW()
      WHERE id = $2
      RETURNING *`,
      [rejection_reason, id]
    );

    // Get patient phone
    const patient = await pool.query(
      'SELECT phone FROM users WHERE id = $1',
      [cert.rows[0].patient_id]
    );

    // Send SMS notification
    if (patient.rows[0].phone) {
      await sendSMS(
        patient.rows[0].phone,
        `Charla Medics: Your certificate request (${cert.rows[0].certificate_number}) was not approved. Reason: ${rejection_reason}`
      );
    }

    res.json({
      message: 'Certificate rejected',
      certificate: result.rows[0]
    });
  } catch (error) {
    console.error('Reject certificate error:', error);
    res.status(500).json({ error: 'Failed to reject certificate' });
  }
};

// Get patient certificates
exports.getPatientCertificates = async (req, res) => {
  const patient_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT mc.*, u.full_name as doctor_name 
       FROM medical_certificates mc
       JOIN users u ON mc.doctor_id = u.id
       WHERE mc.patient_id = $1
       ORDER BY mc.created_at DESC`,
      [patient_id]
    );

    res.json({ certificates: result.rows });
  } catch (error) {
    console.error('Get patient certificates error:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
};

// Get doctor certificates (pending approvals)
exports.getDoctorCertificates = async (req, res) => {
  const doctor_id = req.user.id;
  const { status } = req.query;

  try {
    let query = `
      SELECT mc.*, u.full_name as patient_name 
      FROM medical_certificates mc
      JOIN users u ON mc.patient_id = u.id
      WHERE mc.doctor_id = $1
    `;
    const params = [doctor_id];

    if (status) {
      query += ' AND mc.status = $2';
      params.push(status);
    }

    query += ' ORDER BY mc.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ certificates: result.rows });
  } catch (error) {
    console.error('Get doctor certificates error:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
};

// Download certificate PDF
exports.downloadCertificate = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    // Verify user has access (patient or doctor)
    const cert = await pool.query(
      'SELECT * FROM medical_certificates WHERE id = $1 AND (patient_id = $2 OR doctor_id = $2)',
      [id, user_id]
    );

    if (cert.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (cert.rows[0].status !== 'approved') {
      return res.status(400).json({ error: 'Certificate not approved yet' });
    }

    // Log access
    await pool.query(
      'INSERT INTO certificate_access_log (certificate_id, accessed_by, access_type) VALUES ($1, $2, $3)',
      [id, user_id, 'download']
    );

    // Generate PDF
    const pdfBuffer = await certificateGenerator.generate(cert.rows[0]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${cert.rows[0].certificate_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({ error: 'Failed to download certificate' });
  }
};

// Verify certificate (public endpoint)
exports.verifyCertificate = async (req, res) => {
  const { certificate_number } = req.params;

  try {
    const result = await pool.query(
      `SELECT mc.certificate_number, mc.status, mc.issue_date, mc.valid_from, mc.valid_until,
              mc.diagnosis, u.full_name as doctor_name
       FROM medical_certificates mc
       JOIN users u ON mc.doctor_id = u.id
       WHERE mc.certificate_number = $1`,
      [certificate_number]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        valid: false,
        message: 'Certificate not found' 
      });
    }

    const cert = result.rows[0];
    const now = new Date();
    const isValid = cert.status === 'approved' && 
                    new Date(cert.valid_from) <= now && 
                    new Date(cert.valid_until) >= now;

    res.json({
      valid: isValid,
      certificate: {
        number: cert.certificate_number,
        status: cert.status,
        issue_date: cert.issue_date,
        valid_from: cert.valid_from,
        valid_until: cert.valid_until,
        doctor_name: cert.doctor_name
      }
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
};

module.exports = exports;
