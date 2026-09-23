
export enum TargetRole {
  // Axis 1: Technical Roles
  CLOUD_SECURITY = 'Cloud Security Engineer',
  CLOUD_ENGINEER = 'Cloud Engineer',
  DEVSECOPS = 'DevSecOps Engineer',
  IAM_ENGINEER = 'IAM Engineer',
  DEVOPS_ENGINEER = 'DevOps Engineer',
  AWS_CLOUD_ENGINEER = 'AWS Cloud Engineer',
  AZURE_CLOUD_ENGINEER = 'Azure Cloud Engineer',
  CLOUD_SOLUTION_ARCHITECT = 'Cloud Solution Architect',
  AZURE_CLOUD_ARCHITECT = 'Azure Cloud Architect',
  SITE_RELIABILITY_ENGINEER = 'Site Reliability Engineer',

  // Axis 2: Governance, Risk, and Compliance (GRC) Roles
  INFOSEC_GOVERNANCE = 'Information Security Governance',
  GRC_OPERATIONS = 'GRC Operations / Risk Management',
  CYBER_RISK_MANAGEMENT = 'Cybersecurity Risk Management',
  SENIOR_CYBER_RISK_MANAGEMENT = 'Senior Cybersecurity Risk Management',
  CYBERSECURITY_RISK_CONTROL = 'Cybersecurity Risk Control',
  INFOSEC_COMPLIANCE_RISK_MANAGEMENT = 'Information Security Compliance Risk Management',
  INFOSEC_RISK_COMPLIANCE = 'Information Security Risk and Compliance',
  COMPLIANCE_REGULATORY = 'Compliance & Regulatory Affairs',
  COMPLIANCE_ANALYST = 'Compliance Analyst',
  PRIVACY_DATA_PROTECTION = 'Privacy & Data Protection',
  THIRD_PARTY_RISK = 'Third-Party / Vendor Risk Management',
  IT_AUDIT_ASSURANCE = 'IT Audit & Controls Assurance',
  SENIOR_IT_AUDITOR = 'Senior IT Auditor',
  IAM_GRC = 'IAM Governance, Risk & Compliance',

  // Axis 3: Financial Crime & Investigation Roles
  SENIOR_AML_INVESTIGATOR = 'Senior AML / BSA & KYC Investigator',
  INVESTIGATIONS_OPS_ANALYST = 'Investigations Operations Analyst',
  FRAUD_ANALYST = 'Fraud Analyst',
  SAR_FILING_SPECIALIST = 'SAR Filing Specialist',
  KYC_ANALYST = 'Know Your Customer (KYC) Analyst',
  AML_COMPLIANCE_SPECIALIST = 'AML Compliance Specialist'
}

export const TECHNICAL_ROLES = [
  TargetRole.CLOUD_SECURITY,
  TargetRole.CLOUD_ENGINEER,
  TargetRole.DEVSECOPS,
  TargetRole.IAM_ENGINEER,
  TargetRole.DEVOPS_ENGINEER,
  TargetRole.AWS_CLOUD_ENGINEER,
  TargetRole.AZURE_CLOUD_ENGINEER,
  TargetRole.CLOUD_SOLUTION_ARCHITECT,
  TargetRole.AZURE_CLOUD_ARCHITECT,
  TargetRole.SITE_RELIABILITY_ENGINEER,
];

export const GRC_ROLES = [
  TargetRole.INFOSEC_GOVERNANCE,
  TargetRole.GRC_OPERATIONS,
  TargetRole.CYBER_RISK_MANAGEMENT,
  TargetRole.SENIOR_CYBER_RISK_MANAGEMENT,
  TargetRole.CYBERSECURITY_RISK_CONTROL,
  TargetRole.INFOSEC_COMPLIANCE_RISK_MANAGEMENT,
  TargetRole.INFOSEC_RISK_COMPLIANCE,
  TargetRole.COMPLIANCE_REGULATORY,
  TargetRole.COMPLIANCE_ANALYST,
  TargetRole.PRIVACY_DATA_PROTECTION,
  TargetRole.THIRD_PARTY_RISK,
  TargetRole.IT_AUDIT_ASSURANCE,
  TargetRole.SENIOR_IT_AUDITOR,
  TargetRole.IAM_GRC,
];

export const FINANCIAL_CRIME_ROLES = [
  TargetRole.SENIOR_AML_INVESTIGATOR,
  TargetRole.INVESTIGATIONS_OPS_ANALYST,
  TargetRole.FRAUD_ANALYST,
  TargetRole.SAR_FILING_SPECIALIST,
  TargetRole.KYC_ANALYST,
  TargetRole.AML_COMPLIANCE_SPECIALIST,
];

export interface WorkExperience {
  company: string;
  role: string;
  duration: string;
  bullets: string[];
}

export interface ResumeData {
  name: string;
  contact: {
    location: string;
    email: string;
    phone: string;
    linkedin: string;
  };
  summary: string;
  skills: string[];
  certifications: string[];
  education: string[];
  experience: WorkExperience[];
}

export interface TailoredResume {
  summary: string;
  skills: string[];
  certifications: string[];
  experience: WorkExperience[];
  analysis: {
    matchScore: number;
    keywordsUsed: string[];
    toneNotes: string;
  };
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  targetRole: TargetRole;
  jobDescription: string;
  jobLink?: string;
  tailoredResume: TailoredResume;
}