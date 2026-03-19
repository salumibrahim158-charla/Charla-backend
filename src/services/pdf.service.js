// PDF Generation Service for Medical Certificates
// Creates downloadable PDF certificates for patients

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { uploadToCloudinary } = require('./cloudinary.service');

// Generate Medical Certificate
const generateMedicalCertificate = async (certificateData) => {
  const {
    patientName,
    patientNida,
    doctorName,
    doctorLicense,
    diagnosis,
    recommendations,
    startDate,
    endDate,
    issueDate,
    certificateNumber,
  } = certificateData;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);
        
        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(
          { buffer: pdfData },
          'medical-certificates'
        );

        resolve({
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          bytes: uploadResult.bytes,
        });
      });

      // Header
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#059669')
        .text('MEDICAL CERTIFICATE', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Charla Medics Healthcare Platform', { align: 'center' })
        .moveDown(2);

      // Certificate Number
      doc
        .fontSize(10)
        .fillColor('#000000')
        .text(`Certificate No: ${certificateNumber}`, { align: 'right' })
        .text(`Issue Date: ${new Date(issueDate).toLocaleDateString()}`, { align: 'right' })
        .moveDown(2);

      // Body
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#000000')
        .text('This is to certify that:', { align: 'left' })
        .moveDown(0.5);

      // Patient Info
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(`Patient Name: ${patientName}`)
        .fontSize(12)
        .font('Helvetica')
        .text(`NIDA: ${patientNida}`)
        .moveDown(1);

      // Medical Info
      doc
        .fontSize(12)
        .text('Has been examined and found to be suffering from:', { align: 'left' })
        .moveDown(0.5)
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#059669')
        .text(diagnosis, { align: 'center' })
        .moveDown(1);

      // Recommendations
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#000000')
        .text('Medical Recommendation:', { align: 'left' })
        .moveDown(0.5)
        .text(recommendations, { align: 'justify', indent: 20 })
        .moveDown(1);

      // Rest Period
      if (startDate && endDate) {
        doc
          .fontSize(12)
          .text(`Recommended rest period: From ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`)
          .moveDown(2);
      }

      // Doctor Signature Section
      doc
        .moveDown(2)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`Dr. ${doctorName}`, 100, doc.y)
        .fontSize(10)
        .font('Helvetica')
        .text(`License No: ${doctorLicense}`, 100, doc.y)
        .text('Charla Medics Platform', 100, doc.y)
        .moveDown(1);

      // Signature line
      doc
        .moveTo(100, doc.y)
        .lineTo(300, doc.y)
        .stroke()
        .moveDown(0.3)
        .fontSize(9)
        .fillColor('#666666')
        .text('Doctor\'s Signature', 100, doc.y);

      // Footer
      doc
        .moveDown(3)
        .fontSize(8)
        .fillColor('#999999')
        .text(
          'This certificate is digitally generated and verified. For verification, visit charlamedics.co.tz/verify',
          { align: 'center' }
        );

      // QR Code (certificate verification)
      // TODO: Add QR code with certificate number

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Prescription PDF
const generatePrescriptionPDF = async (prescriptionData) => {
  const {
    patientName,
    doctorName,
    medications,
    instructions,
    issueDate,
    prescriptionNumber,
  } = prescriptionData;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);
        
        const uploadResult = await uploadToCloudinary(
          { buffer: pdfData },
          'prescriptions'
        );

        resolve({
          url: uploadResult.url,
          publicId: uploadResult.publicId,
        });
      });

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#059669')
        .text('MEDICAL PRESCRIPTION', { align: 'center' })
        .moveDown(2);

      // Prescription Number
      doc
        .fontSize(10)
        .fillColor('#000000')
        .text(`Rx No: ${prescriptionNumber}`, { align: 'right' })
        .text(`Date: ${new Date(issueDate).toLocaleDateString()}`, { align: 'right' })
        .moveDown(2);

      // Patient & Doctor
      doc
        .fontSize(12)
        .text(`Patient: ${patientName}`)
        .text(`Prescribed by: Dr. ${doctorName}`)
        .moveDown(2);

      // Medications Table
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Medications:')
        .moveDown(0.5);

      medications.forEach((med, index) => {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`${index + 1}. ${med.name}`)
          .fontSize(10)
          .font('Helvetica')
          .text(`   Dosage: ${med.dosage}`)
          .text(`   Frequency: ${med.frequency}`)
          .text(`   Duration: ${med.duration}`)
          .moveDown(0.5);
      });

      // Instructions
      if (instructions) {
        doc
          .moveDown(1)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Additional Instructions:')
          .fontSize(10)
          .font('Helvetica')
          .text(instructions, { align: 'justify' });
      }

      // Signature
      doc
        .moveDown(3)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Dr. ${doctorName}`, 100, doc.y);

      doc
        .moveTo(100, doc.y + 20)
        .lineTo(300, doc.y + 20)
        .stroke()
        .fontSize(8)
        .fillColor('#666666')
        .text('Doctor\'s Signature', 100, doc.y + 25);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Lab Test Report
const generateLabReportPDF = async (labData) => {
  const {
    patientName,
    testType,
    results,
    referenceRanges,
    labTechName,
    issueDate,
    reportNumber,
  } = labData;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);
        const uploadResult = await uploadToCloudinary({ buffer: pdfData }, 'lab-reports');
        resolve({ url: uploadResult.url, publicId: uploadResult.publicId });
      });

      // Header
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#059669')
        .text('LABORATORY TEST REPORT', { align: 'center' }).moveDown(2);

      // Report details
      doc.fontSize(10).fillColor('#000000')
        .text(`Report No: ${reportNumber}`, { align: 'right' })
        .text(`Date: ${new Date(issueDate).toLocaleDateString()}`, { align: 'right' }).moveDown(2);

      // Patient & Test info
      doc.fontSize(12).text(`Patient: ${patientName}`)
        .text(`Test Type: ${testType}`).moveDown(2);

      // Results table
      doc.fontSize(14).font('Helvetica-Bold').text('Test Results:').moveDown(0.5);

      results.forEach((result, index) => {
        const isAbnormal = result.value < result.min || result.value > result.max;
        doc.fontSize(11).font('Helvetica-Bold').text(`${result.parameter}`)
          .fontSize(10).font('Helvetica')
          .fillColor(isAbnormal ? '#dc2626' : '#000000')
          .text(`   Value: ${result.value} ${result.unit}`)
          .fillColor('#666666')
          .text(`   Reference Range: ${result.min} - ${result.max} ${result.unit}`)
          .fillColor('#000000')
          .moveDown(0.5);
      });

      // Lab tech signature
      doc.moveDown(3).fontSize(10).font('Helvetica-Bold').text(labTechName, 100);
      doc.moveTo(100, doc.y + 20).lineTo(300, doc.y + 20).stroke()
        .fontSize(8).fillColor('#666666').text('Lab Technician Signature', 100, doc.y + 25);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateMedicalCertificate,
  generatePrescriptionPDF,
  generateLabReportPDF,
};
