// CHARLA MEDICS - Complete Registration Requirements
// All documents and licenses required per category

const REGISTRATION_REQUIREMENTS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // PATIENT / WATEJA WA KAWAIDA
  // ═══════════════════════════════════════════════════════════════════════════
  patient: {
    personalInfo: {
      fullName: { required: true, type: 'text', sw: 'Jina Kamili' },
      dateOfBirth: { required: true, type: 'date', sw: 'Tarehe ya Kuzaliwa' },
      gender: { required: true, type: 'select', options: ['Male', 'Female'], sw: 'Jinsia' },
      nida: { required: true, type: 'text', pattern: /^\d{20}$/, sw: 'Namba ya NIDA' },
      phoneNumber: { required: true, type: 'tel', pattern: /^(255|0)[67]\d{8}$/, sw: 'Namba ya Simu' },
      email: { required: true, type: 'email', sw: 'Barua Pepe' },
    },
    location: {
      region: { required: true, type: 'select', sw: 'Mkoa' },
      district: { required: true, type: 'select', sw: 'Wilaya' },
      ward: { required: true, type: 'select', sw: 'Kata' },
      street: { required: false, type: 'text', sw: 'Mtaa' },
    },
    documents: {
      // Optional for patients
      nidaCopy: { required: false, type: 'image', maxSize: '5MB', sw: 'Nakala ya NIDA' },
    },
    verification: {
      phoneOTP: { required: true, sw: 'OTP ya Simu' },
      emailVerification: { required: true, sw: 'Thibitisha Barua Pepe' },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCTOR / DAKTARI
  // ═══════════════════════════════════════════════════════════════════════════
  doctor: {
    personalInfo: {
      fullName: { required: true, type: 'text', sw: 'Jina Kamili' },
      dateOfBirth: { required: true, type: 'date', sw: 'Tarehe ya Kuzaliwa' },
      gender: { required: true, type: 'select', options: ['Male', 'Female'], sw: 'Jinsia' },
      nida: { required: true, type: 'text', pattern: /^\d{20}$/, sw: 'Namba ya NIDA' },
      phoneNumber: { required: true, type: 'tel', sw: 'Namba ya Simu' },
      email: { required: true, type: 'email', sw: 'Barua Pepe' },
    },
    professionalInfo: {
      licenseNumber: { 
        required: true, 
        type: 'text', 
        pattern: /^MD\/\d{4}\/\d{4}$/, 
        example: 'MD/2020/1234',
        sw: 'Namba ya Leseni (MCT)',
        authority: 'Medical Council of Tanganyika',
      },
      specialty: { 
        required: true, 
        type: 'select',
        options: [
          'General Practice',
          'Internal Medicine', 
          'Pediatrics',
          'Obstetrics & Gynecology',
          'Surgery',
          'Cardiology',
          'Dermatology',
          'Psychiatry',
          'Ophthalmology',
          'ENT',
          'Orthopedics',
        ],
        sw: 'Utaalam',
      },
      yearsOfExperience: { required: true, type: 'number', min: 0, sw: 'Uzoefu (Miaka)' },
      medicalSchool: { required: true, type: 'text', sw: 'Chuo cha Dawa' },
      graduationYear: { required: true, type: 'number', min: 1950, max: new Date().getFullYear(), sw: 'Mwaka wa Kuhitimu' },
      currentWorkplace: { required: false, type: 'text', sw: 'Mahali pa Kazi Sasa' },
    },
    location: {
      region: { required: true, type: 'select', sw: 'Mkoa' },
      district: { required: true, type: 'select', sw: 'Wilaya' },
      ward: { required: true, type: 'select', sw: 'Kata' },
      street: { required: false, type: 'text', sw: 'Mtaa' },
    },
    documents: {
      // MANDATORY DOCUMENTS FOR DOCTORS
      medicalDegree: { 
        required: true, 
        type: 'pdf', 
        maxSize: '10MB',
        sw: 'Shahada ya Dawa (PDF)',
        description: 'MD/MBBS degree certificate',
      },
      mctLicense: { 
        required: true, 
        type: 'pdf', 
        maxSize: '5MB',
        sw: 'Leseni ya MCT (PDF)',
        description: 'Current Medical Council of Tanganyika registration certificate',
        mustBeValid: true,
      },
      nidaCopy: { 
        required: true, 
        type: 'image', 
        maxSize: '5MB',
        sw: 'Nakala ya NIDA',
      },
      profilePhoto: { 
        required: true, 
        type: 'image', 
        maxSize: '5MB',
        dimensions: { width: 400, height: 400 },
        sw: 'Picha ya Wasifu',
      },
      specialtyCertificate: { 
        required: false, 
        type: 'pdf', 
        maxSize: '10MB',
        sw: 'Cheti cha Utaalamu (Optional)',
      },
      criminalClearance: { 
        required: true, 
        type: 'pdf', 
        maxSize: '5MB',
        sw: 'Cheti cha Kukosa Makosa (Police Clearance)',
        validityMonths: 6,
      },
    },
    verification: {
      phoneOTP: { required: true },
      emailVerification: { required: true },
      licenseVerification: { required: true, authority: 'MCT', sw: 'Uthibitisho wa Leseni' },
      adminApproval: { required: true, sw: 'Idhini ya Msimamizi' },
    },
    pricing: {
      consultationFee: { required: true, type: 'number', min: 10000, max: 200000, sw: 'Ada ya Ushauri (TZS)' },
      emergencyFee: { required: true, type: 'number', min: 20000, max: 400000, sw: 'Ada ya Dharura (TZS)' },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NURSE / MUUGUZI
  // ═══════════════════════════════════════════════════════════════════════════
  nurse: {
    personalInfo: {
      fullName: { required: true, type: 'text', sw: 'Jina Kamili' },
      dateOfBirth: { required: true, type: 'date', sw: 'Tarehe ya Kuzaliwa' },
      gender: { required: true, type: 'select', options: ['Male', 'Female'], sw: 'Jinsia' },
      nida: { required: true, type: 'text', pattern: /^\d{20}$/, sw: 'Namba ya NIDA' },
      phoneNumber: { required: true, type: 'tel', sw: 'Namba ya Simu' },
      email: { required: true, type: 'email', sw: 'Barua Pepe' },
    },
    professionalInfo: {
      licenseNumber: { 
        required: true, 
        type: 'text', 
        pattern: /^RN\/\d{5}$/, 
        example: 'RN/12345',
        sw: 'Namba ya Leseni (NCTZ)',
        authority: 'Nursing Council of Tanzania',
      },
      qualification: {
        required: true,
        type: 'select',
        options: ['Certificate', 'Diploma', 'Degree', 'Masters'],
        sw: 'Elimu',
      },
      yearsOfExperience: { required: true, type: 'number', min: 0, sw: 'Uzoefu (Miaka)' },
      currentWorkplace: { required: false, type: 'text', sw: 'Mahali pa Kazi' },
    },
    location: {
      region: { required: true, type: 'select', sw: 'Mkoa' },
      district: { required: true, type: 'select', sw: 'Wilaya' },
      ward: { required: true, type: 'select', sw: 'Kata' },
    },
    documents: {
      nursingCertificate: { required: true, type: 'pdf', maxSize: '10MB', sw: 'Cheti cha Uuguzi' },
      nctzLicense: { required: true, type: 'pdf', maxSize: '5MB', sw: 'Leseni ya NCTZ', mustBeValid: true },
      nidaCopy: { required: true, type: 'image', maxSize: '5MB', sw: 'Nakala ya NIDA' },
      profilePhoto: { required: true, type: 'image', maxSize: '5MB', sw: 'Picha ya Wasifu' },
    },
    verification: {
      phoneOTP: { required: true },
      emailVerification: { required: true },
      licenseVerification: { required: true, authority: 'NCTZ' },
      adminApproval: { required: true },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHARMACIST / MFAMASIA
  // ═══════════════════════════════════════════════════════════════════════════
  pharmacist: {
    personalInfo: {
      fullName: { required: true, type: 'text', sw: 'Jina Kamili' },
      dateOfBirth: { required: true, type: 'date', sw: 'Tarehe ya Kuzaliwa' },
      gender: { required: true, type: 'select', options: ['Male', 'Female'], sw: 'Jinsia' },
      nida: { required: true, type: 'text', pattern: /^\d{20}$/, sw: 'Namba ya NIDA' },
      phoneNumber: { required: true, type: 'tel', sw: 'Namba ya Simu' },
      email: { required: true, type: 'email', sw: 'Barua Pepe' },
    },
    professionalInfo: {
      licenseNumber: { 
        required: true, 
        type: 'text', 
        pattern: /^PH\/\d{4}$/, 
        example: 'PH/1234',
        sw: 'Namba ya Leseni (TPB)',
        authority: 'Tanzania Pharmacy Board',
      },
      qualification: { required: true, type: 'text', sw: 'Elimu' },
      yearsOfExperience: { required: true, type: 'number', min: 0, sw: 'Uzoefu' },
    },
    location: {
      region: { required: true, type: 'select', sw: 'Mkoa' },
      district: { required: true, type: 'select', sw: 'Wilaya' },
    },
    documents: {
      pharmacyDegree: { required: true, type: 'pdf', maxSize: '10MB', sw: 'Shahada ya Famasia' },
      tpbLicense: { required: true, type: 'pdf', maxSize: '5MB', sw: 'Leseni ya TPB', mustBeValid: true },
      nidaCopy: { required: true, type: 'image', maxSize: '5MB', sw: 'Nakala ya NIDA' },
      profilePhoto: { required: true, type: 'image', maxSize: '5MB', sw: 'Picha' },
    },
    verification: {
      phoneOTP: { required: true },
      emailVerification: { required: true },
      licenseVerification: { required: true, authority: 'TPB' },
      adminApproval: { required: true },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LAB TECHNICIAN / MTAALAMU WA MAABARA
  // ═══════════════════════════════════════════════════════════════════════════
  lab_technician: {
    personalInfo: {
      fullName: { required: true, type: 'text', sw: 'Jina Kamili' },
      dateOfBirth: { required: true, type: 'date', sw: 'Tarehe ya Kuzaliwa' },
      gender: { required: true, type: 'select', options: ['Male', 'Female'], sw: 'Jinsia' },
      nida: { required: true, type: 'text', pattern: /^\d{20}$/, sw: 'Namba ya NIDA' },
      phoneNumber: { required: true, type: 'tel', sw: 'Namba ya Simu' },
      email: { required: true, type: 'email', sw: 'Barua Pepe' },
    },
    professionalInfo: {
      licenseNumber: { 
        required: true, 
        type: 'text', 
        pattern: /^LT\/\d{4}$/, 
        example: 'LT/5678',
        sw: 'Namba ya Leseni (LAHBTZ)',
        authority: 'Laboratory Health Board Tanzania',
      },
      qualification: { required: true, type: 'text', sw: 'Elimu' },
      yearsOfExperience: { required: true, type: 'number', min: 0, sw: 'Uzoefu' },
    },
    location: {
      region: { required: true, type: 'select', sw: 'Mkoa' },
      district: { required: true, type: 'select', sw: 'Wilaya' },
    },
    documents: {
      labCertificate: { required: true, type: 'pdf', maxSize: '10MB', sw: 'Cheti cha Maabara' },
      lahbtzLicense: { required: true, type: 'pdf', maxSize: '5MB', sw: 'Leseni ya LAHBTZ', mustBeValid: true },
      nidaCopy: { required: true, type: 'image', maxSize: '5MB', sw: 'Nakala ya NIDA' },
      profilePhoto: { required: true, type: 'image', maxSize: '5MB', sw: 'Picha' },
    },
    verification: {
      phoneOTP: { required: true },
      emailVerification: { required: true },
      licenseVerification: { required: true, authority: 'LAHBTZ' },
      adminApproval: { required: true },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HOSPITAL / HOSPITALI
  // ═══════════════════════════════════════════════════════════════════════════
  hospital: {
    facilityInfo: {
      facilityName: { required: true, type: 'text', sw: 'Jina la Hospitali' },
      facilityType: { required: true, type: 'select', options: ['Government', 'Private', 'Faith-Based'], sw: 'Aina' },
      registrationNumber: { 
        required: true, 
        type: 'text', 
        pattern: /^MF\/\d{6}$/, 
        example: 'MF/123456',
        sw: 'Namba ya Usajili (MOH)',
        authority: 'Ministry of Health',
      },
      bedCapacity: { required: true, type: 'number', min: 10, sw: 'Vitanda' },
      services: { required: true, type: 'multiselect', sw: 'Huduma Zinazopatikana' },
    },
    contactInfo: {
      phoneNumber: { required: true, type: 'tel', sw: 'Namba ya Simu' },
      email: { required: true, type: 'email', sw: 'Barua Pepe' },
      website: { required: false, type: 'url', sw: 'Tovuti' },
    },
    location: {
      region: { required: true, type: 'select', sw: 'Mkoa' },
      district: { required: true, type: 'select', sw: 'Wilaya' },
      ward: { required: true, type: 'select', sw: 'Kata' },
      street: { required: true, type: 'text', sw: 'Mtaa' },
      gpsCoordinates: { required: false, type: 'text', sw: 'GPS' },
    },
    documents: {
      mohRegistration: { required: true, type: 'pdf', maxSize: '10MB', sw: 'Cheti cha MOH', mustBeValid: true },
      businessLicense: { required: true, type: 'pdf', maxSize: '5MB', sw: 'Leseni ya Biashara (TRA)' },
      fireInspection: { required: true, type: 'pdf', maxSize: '5MB', sw: 'Cheti cha Moto', validityMonths: 12 },
      healthInspection: { required: true, type: 'pdf', maxSize: '5MB', sw: 'Cheti cha Afya', validityMonths: 12 },
      facilityPhotos: { required: true, type: 'images', maxCount: 5, maxSize: '5MB', sw: 'Picha za Kituo' },
    },
    verification: {
      phoneOTP: { required: true },
      emailVerification: { required: true },
      facilityInspection: { required: true, sw: 'Ukaguzi wa Kituo' },
      adminApproval: { required: true },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLINIC / KITUO CHA AFYA
  // ═══════════════════════════════════════════════════════════════════════════
  clinic: {
    facilityInfo: {
      facilityName: { required: true, type: 'text', sw: 'Jina la Kituo' },
      registrationNumber: { 
        required: true, 
        type: 'text', 
        pattern: /^CF\/\d{5}$/, 
        example: 'CF/12345',
        sw: 'Namba ya Usajili (PORALG)',
        authority: 'PORALG',
      },
      services: { required: true, type: 'multiselect', sw: 'Huduma' },
    },
    contactInfo: {
      phoneNumber: { required: true, type: 'tel', sw: 'Simu' },
      email: { required: true, type: 'email', sw: 'Barua Pepe' },
    },
    location: {
      region: { required: true, type: 'select', sw: 'Mkoa' },
      district: { required: true, type: 'select', sw: 'Wilaya' },
      ward: { required: true, type: 'select', sw: 'Kata' },
      street: { required: true, type: 'text', sw: 'Mtaa' },
    },
    documents: {
      registrationCertificate: { required: true, type: 'pdf', maxSize: '10MB', sw: 'Cheti cha Usajili', mustBeValid: true },
      businessLicense: { required: true, type: 'pdf', maxSize: '5MB', sw: 'Leseni ya Biashara' },
      healthInspection: { required: true, type: 'pdf', maxSize: '5MB', sw: 'Cheti cha Afya', validityMonths: 12 },
      facilityPhotos: { required: true, type: 'images', maxCount: 3, maxSize: '5MB', sw: 'Picha' },
    },
    verification: {
      phoneOTP: { required: true },
      emailVerification: { required: true },
      adminApproval: { required: true },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHARMACY / DUKA LA DAWA
  // ═══════════════════════════════════════════════════════════════════════════
  pharmacy: {
    facilityInfo: {
      pharmacyName: { required: true, type: 'text', sw: 'Jina la Duka' },
      registrationNumber: { 
        required: true, 
        type: 'text', 
        pattern: /^PH\/\d{4}$/, 
        example: 'PH/9876',
        sw: 'Namba ya Usajili (TPB)',
        authority: 'Tanzania Pharmacy Board',
      },
      pharmacyType: { required: true, type: 'select', options: ['Retail', 'Wholesale', 'Both'], sw: 'Aina' },
    },
    contactInfo: {
      phoneNumber: { required: true, type: 'tel', sw: 'Simu' },
      email: { required: true, type: 'email', sw: 'Barua Pepe' },
    },
    location: {
      region: { required: true, type: 'select', sw: 'Mkoa' },
      district: { required: true, type: 'select', sw: 'Wilaya' },
      ward: { required: true, type: 'select', sw: 'Kata' },
      street: { required: true, type: 'text', sw: 'Mtaa' },
    },
    documents: {
      tpbLicense: { required: true, type: 'pdf', maxSize: '10MB', sw: 'Leseni ya TPB', mustBeValid: true },
      businessLicense: { required: true, type: 'pdf', maxSize: '5MB', sw: 'Leseni ya Biashara' },
      pharmacistLicense: { required: true, type: 'pdf', maxSize: '5MB', sw: 'Leseni ya Mfamasia' },
      facilityPhotos: { required: true, type: 'images', maxCount: 3, maxSize: '5MB', sw: 'Picha' },
    },
    verification: {
      phoneOTP: { required: true },
      emailVerification: { required: true },
      adminApproval: { required: true },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LABORATORY / MAABARA
  // ═══════════════════════════════════════════════════════════════════════════
  laboratory: {
    facilityInfo: {
      labName: { required: true, type: 'text', sw: 'Jina la Maabara' },
      registrationNumber: { 
        required: true, 
        type: 'text', 
        pattern: /^LB\/\d{4}$/, 
        example: 'LB/5432',
        sw: 'Namba ya Usajili (LAHBTZ)',
        authority: 'LAHBTZ',
      },
      testTypes: { required: true, type: 'multiselect', sw: 'Aina za Vipimo' },
    },
    contactInfo: {
      phoneNumber: { required: true, type: 'tel', sw: 'Simu' },
      email: { required: true, type: 'email', sw: 'Barua Pepe' },
    },
    location: {
      region: { required: true, type: 'select', sw: 'Mkoa' },
      district: { required: true, type: 'select', sw: 'Wilaya' },
      ward: { required: true, type: 'select', sw: 'Kata' },
      street: { required: true, type: 'text', sw: 'Mtaa' },
    },
    documents: {
      lahbtzLicense: { required: true, type: 'pdf', maxSize: '10MB', sw: 'Leseni ya LAHBTZ', mustBeValid: true },
      businessLicense: { required: true, type: 'pdf', maxSize: '5MB', sw: 'Leseni ya Biashara' },
      qualityAssurance: { required: true, type: 'pdf', maxSize: '5MB', sw: 'Cheti cha Ubora' },
      facilityPhotos: { required: true, type: 'images', maxCount: 3, maxSize: '5MB', sw: 'Picha' },
    },
    verification: {
      phoneOTP: { required: true },
      emailVerification: { required: true },
      adminApproval: { required: true },
    },
  },
};

module.exports = { REGISTRATION_REQUIREMENTS };
