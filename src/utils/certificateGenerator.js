/**
 * Certificate Generator Utility - V1.2
 * Generates PDF medical certificates
 */

/**
 * Generate medical certificate PDF
 * @param {Object} certificateData - Certificate details
 * @returns {Promise<Buffer>} - PDF buffer
 */
exports.generate = async (certificateData) => {
  try {
    const {
      certificate_number,
      patient_name,
      doctor_name,
      diagnosis,
      recommendations,
      issue_date,
      valid_from,
      valid_until,
      digital_signature,
      reason,
      duration_days
    } = certificateData;

    // Format dates
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    };

    // Create simple HTML certificate
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2E75B6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2E75B6;
        }
        .subtitle {
            font-size: 18px;
            color: #666;
        }
        .cert-number {
            text-align: right;
            font-size: 14px;
            color: #666;
            margin-bottom: 30px;
        }
        .title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin: 30px 0;
            text-transform: uppercase;
        }
        .content {
            margin: 30px 0;
        }
        .field {
            margin: 15px 0;
        }
        .label {
            font-weight: bold;
            color: #333;
        }
        .value {
            color: #000;
        }
        .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
        }
        .signature {
            text-align: center;
        }
        .signature-line {
            border-top: 1px solid #000;
            width: 200px;
            margin: 10px auto;
        }
        .footer {
            margin-top: 60px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        .stamp {
            width: 150px;
            height: 150px;
            border: 2px solid #2E75B6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 14px;
            color: #2E75B6;
            margin: 20px auto;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">CHARLA MEDICS</div>
        <div class="subtitle">Digital Healthcare Platform</div>
        <div class="subtitle">www.charlamedics.com</div>
    </div>

    <div class="cert-number">
        Certificate No: <strong>${certificate_number}</strong>
    </div>

    <div class="title">Medical Certificate</div>

    <div class="content">
        <div class="field">
            <span class="label">This is to certify that:</span>
        </div>

        <div class="field">
            <span class="label">Patient Name:</span>
            <span class="value">${patient_name}</span>
        </div>

        <div class="field">
            <span class="label">Has been examined and found to be:</span>
        </div>

        <div class="field">
            <span class="label">Diagnosis:</span>
            <span class="value">${diagnosis || reason || 'Medical condition requiring rest'}</span>
        </div>

        <div class="field">
            <span class="label">Recommendations:</span>
            <span class="value">${recommendations || 'Rest and avoid strenuous activities'}</span>
        </div>

        <div class="field">
            <span class="label">Duration of Medical Leave:</span>
            <span class="value">${duration_days} days</span>
        </div>

        <div class="field">
            <span class="label">Valid From:</span>
            <span class="value">${formatDate(valid_from)}</span>
        </div>

        <div class="field">
            <span class="label">Valid Until:</span>
            <span class="value">${formatDate(valid_until)}</span>
        </div>

        <div class="field">
            <span class="label">Issue Date:</span>
            <span class="value">${formatDate(issue_date)}</span>
        </div>
    </div>

    <div class="signature-section">
        <div class="signature">
            <div class="signature-line"></div>
            <div>${digital_signature || doctor_name}</div>
            <div style="font-size: 12px; color: #666;">Medical Practitioner</div>
        </div>

        <div class="stamp">
            <div>
                <div style="font-weight: bold;">CHARLA</div>
                <div style="font-weight: bold;">MEDICS</div>
                <div style="font-size: 10px;">Digital Certificate</div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>This is a digitally generated certificate from Charla Medics platform.</p>
        <p>Verification Code: ${certificate_number}</p>
        <p>Verify at: www.charlamedics.com/verify/${certificate_number}</p>
        <p>&copy; ${new Date().getFullYear()} Charla Medics. All rights reserved.</p>
    </div>
</body>
</html>
    `;

    // In production, you would use a library like puppeteer or pdfkit to generate actual PDF
    // For now, we'll return the HTML as a buffer (which can be rendered as PDF by frontend)
    
    // Simple implementation - return HTML as buffer
    // In production, integrate with puppeteer:
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.setContent(html);
    // const pdf = await page.pdf({ format: 'A4' });
    // await browser.close();
    // return pdf;

    return Buffer.from(html, 'utf-8');

  } catch (error) {
    console.error('Certificate generation error:', error);
    throw error;
  }
};

/**
 * Validate certificate data
 * @param {Object} data - Certificate data
 * @returns {Object} - Validation result
 */
exports.validate = (data) => {
  const errors = [];

  if (!data.certificate_number) {
    errors.push('Certificate number is required');
  }

  if (!data.patient_name) {
    errors.push('Patient name is required');
  }

  if (!data.doctor_name) {
    errors.push('Doctor name is required');
  }

  if (!data.diagnosis && !data.reason) {
    errors.push('Diagnosis or reason is required');
  }

  if (!data.valid_from || !data.valid_until) {
    errors.push('Validity dates are required');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors: errors
    };
  }

  return {
    valid: true
  };
};

module.exports = exports;
