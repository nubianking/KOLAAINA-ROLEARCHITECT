import { GoogleGenAI, Type, Schema, ThinkingLevel } from "@google/genai";
import { ResumeData, TargetRole, TailoredResume } from '../types';

export const getApiKey = (): string => {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const envKey = 
    process.env.GEMINI_API_KEY || 
    process.env.API_KEY || 
    metaEnv?.VITE_GEMINI_API_KEY || 
    metaEnv?.GEMINI_API_KEY ||
    '';
  return envKey;
};

export const getAiClient = (): GoogleGenAI => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API Key is not linked. Please ensure GEMINI_API_KEY or API_KEY is configured in the environment.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Free tier models with verified availability and fast response times
const FREE_TIER_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3-flash-preview",
  "gemini-flash-latest"
];

function isQuotaOrRateLimitError(err: unknown): boolean {
  const errorObj = err as any;
  const message = String(errorObj?.message || err || '').toLowerCase();
  const status = errorObj?.status || errorObj?.code || errorObj?.statusCode;
  return (
    status === 429 ||
    status === 503 ||
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'UNAVAILABLE' ||
    message.includes('429') ||
    message.includes('503') ||
    message.includes('high demand') ||
    message.includes('temporarily unavailable') ||
    message.includes('quota') ||
    message.includes('resource_exhausted') ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  );
}

function isDailyOrExhaustedQuota(err: unknown): boolean {
  const errorObj = err as any;
  const message = String(errorObj?.message || err || '').toLowerCase();
  return message.includes('perday') || message.includes('exceeded your current quota') || message.includes('retry in 5') || message.includes('retry in 6');
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function executeWithFreeTierRetry<T>(
  requestFn: (ai: GoogleGenAI, model: string, extraConfig: Record<string, any>) => Promise<T>
): Promise<T> {
  const ai = getAiClient();
  let lastError: any = null;

  for (const model of FREE_TIER_MODELS) {
    const isGemini3 = model.startsWith("gemini-3") || model.includes("latest");
    // Minimize thinking tokens on free tier to conserve TPM/RPM quotas
    const extraConfig = isGemini3
      ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      : {};

    // Attempt up to 2 tries per model (immediate + 1 backoff on quota)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await requestFn(ai, model, extraConfig);
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Free Tier] Model ${model} attempt ${attempt + 1} failed:`, err?.message || err);

        if (isQuotaOrRateLimitError(err)) {
          // If the model reached its daily quota or long cooldown, fail over immediately to the next free tier model
          if (isDailyOrExhaustedQuota(err)) {
            break;
          }
          if (attempt === 0) {
            // Short rate limit pause before retry
            await sleep(1500);
            continue;
          }
          break;
        } else {
          // Non-quota error
          throw err;
        }
      }
    }
  }

  if (isQuotaOrRateLimitError(lastError)) {
    throw new Error(
      "Gemini Free Tier rate limit or quota exceeded. Please wait 30–60 seconds before trying again."
    );
  }

  throw lastError || new Error("Failed to process request with free tier Gemini models.");
}

const resumeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "Professional summary tailored to the role" },
    skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of relevant technical skills" },
    certifications: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of relevant certifications" },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          role: { type: Type.STRING },
          duration: { type: Type.STRING },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["company", "role", "duration", "bullets"]
      }
    },
    analysis: {
      type: Type.OBJECT,
      properties: {
        matchScore: { type: Type.NUMBER, description: "Score from 0-100 indicating fit" },
        keywordsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
        toneNotes: { type: Type.STRING, description: "Explanation of tone adjustments" }
      },
      required: ["matchScore", "keywordsUsed", "toneNotes"]
    }
  },
  required: ["summary", "skills", "certifications", "experience", "analysis"]
};

export const generateTailoredResume = async (
  jobDescription: string,
  targetRole: TargetRole,
  baseResume: ResumeData,
  jobLink?: string
): Promise<TailoredResume> => {
  const systemPrompt = `
    You are RoleArchitect, a sophisticated career strategist engine. 
    Your goal is to rewrite the candidate's experience to perfectly align with a specific Job Description (JD) and Role.
    
    TARGET ROLE: ${targetRole}

    CORE RULES:
    1. FACTUAL INTEGRITY: Do not invent experiences. Reframe and elaborate on existing facts using the JD's terminology.
    2. TECHNICAL DEPTH & CONTEXT: 
       - Maximize technical detail. Never simplify. 
       - Every bullet point must include specific tools, protocols, versions, or methodologies.
       - Context is king: Explain *why* a task was done, the *complexity* involved, and the *architectural impact*.
    3. QUANTITY & LENGTH: 
       - DO NOT remove experience. Keep all roles.
       - Generate AT LEAST 8 dense bullet points per role (ideally 10-12 for Senior roles).
       - The final output should be comprehensive and verbose enough to fill 2+ pages.
    4. TONE: Professional, authoritative, highly technical. Use "Senior/Architect" level language.
    5. ROLE INTELLIGENCE:
       - If Cloud Security: Focus on risk, governance, audit, IAM, WAF, Zero Trust, Compliance frameworks (NIST, SOC2).
       - If Cloud Engineer (General): Focus on reliability, scale, cost optimization, IaC patterns, multi-region architectures.
       - If DevSecOps: Focus on CI/CD security, container hardening, shift-left security, policy-as-code.
       - If IAM Engineer:
         * Focus on Identity Lifecycle (JML), Access Governance, AuthN/AuthZ (SAML/OIDC/OAuth), PAM, and Federation.
         * Frame experience using "Identity Control Action + System Scope + Governance Outcome".
         * Emphasize keywords: Azure AD/Entra ID, Okta, Ping, PIM, RBAC/ABAC, Access Reviews, Least Privilege.
         * Highlight audit readiness, segregation of duties, and evidence generation.
         * Suppress pipeline-centric/DevOps language unless explicitly requested; focus on control durability.
       - If DevOps Engineer:
         * Focus on CI/CD pipeline design, Infrastructure as Code (IaC), system reliability, and operational maturity.
         * Frame experience using "Automation/Reliability Action + Platform Scope + Operational Outcome".
         * Emphasize keywords: Jenkins, GitHub Actions, GitLab CI, Azure DevOps, Terraform, CloudFormation, Kubernetes, Helm, Docker, Prometheus, Grafana, ELK/OpenSearch.
         * Elevate operational maturity: MTTR reduction, incident response, rollbacks, and observability improvements.
         * Suppress security governance, audit, and identity-centric language. (Security is acknowledged but not foregrounded).
       - If AWS Cloud Engineer:
         * Focus on AWS core services (EC2, VPC, S3, RDS), infrastructure design, high availability, and cost optimization.
         * Frame experience using "AWS Service Action + Environment Scope + Reliability or Efficiency Outcome".
         * Emphasize keywords: EC2, Auto Scaling, ELB/ALB/NLB, VPC, Subnets, Route Tables, S3, CloudFormation, AWS CDK, CloudWatch, Systems Manager.
         * Elevate Well-Architected Framework principles: Reliability, Performance Efficiency, Cost Optimization.
         * Suppress CI/CD pipeline ownership framing (focus on infra support instead), Security Audit language, and Identity Governance depth.
       - If Azure Cloud Engineer:
         * Focus on Azure compute, networking, storage, VNets, high availability, and disaster recovery.
         * Frame experience using "Azure Service Action + Environment Scope + Reliability or Operational Outcome".
         * Emphasize keywords: Azure Virtual Machines, Azure App Service, AKS, Virtual Networks (VNets), Network Security Groups (NSGs), Azure Load Balancer, Application Gateway, Azure Storage, Azure SQL, ARM, Bicep, Azure Monitor, Log Analytics, Azure Cost Management, Microsoft Entra ID.
         * Elevate operational stability, monitoring, and enterprise/hybrid readiness (VPN, ExpressRoute).
         * Suppress CI/CD ownership, Security Audit language, and deep Identity Governance framing.
       - If Cloud Solution Architect:
         * Focus on end-to-end solution design, cloud patterns, multi-tier systems, NFRs (availability, scalability), and cost modeling.
         * Frame experience using "Architectural Responsibility + Business/Technical Context + Design Outcome".
         * Emphasize keywords: Cloud architecture, Solution design, Reference architectures, Landing zones, Well-Architected Framework, DR, Hybrid/multi-cloud, TOGAF.
         * Elevate stakeholder engagement, technical leadership, and security-by-design.
         * Suppress operational task lists, deep tool-level configuration details, and direct CI/CD/Incident ownership.
       - If Azure Cloud Architect:
         * Focus on Azure enterprise architecture, landing zones, management groups, governance, and platform design.
         * Frame experience using "Architectural Ownership + Azure Platform Scope + Business or Governance Outcome".
         * Emphasize keywords: Azure Landing Zones, Management Groups, Azure Policy, Azure Blueprints, Hub-and-spoke topology, Virtual Networks (VNets), Azure Firewall, Application Gateway, Microsoft Entra ID (Architecture), Azure Well-Architected Framework, Azure Advisor.
         * Elevate design authority, governance standards, policy-as-code, and long-term platform sustainability.
         * Suppress CI/CD pipeline ownership, operational incident response, and low-level infrastructure tasks.
       - If Site Reliability Engineer:
         * Focus on service reliability, uptime, SLIs/SLOs, error budgets, incident response, and observability.
         * Frame experience using "Reliability/Observability Action + Service Scope + Measurable/Operational Outcome".
         * Emphasize keywords: Prometheus, Grafana, Alertmanager, OpenTelemetry, Datadog, ELK/OpenSearch, PagerDuty/Opsgenie, Kubernetes, Linux, Terraform.
         * Elevate "Toil Reduction" via automation and self-healing systems.
         * Suppress feature delivery ownership, architecture-only abstraction, and security governance ownership.
       - If Information Security Governance:
         * Focus on governance frameworks, policy lifecycle management, risk appetite, and board-level reporting.
         * Frame experience using "Governance Activity + Enterprise Scope + Strategic Outcome".
         * Emphasize keywords: Information security governance, Governance frameworks, Policy lifecycle management, Risk appetite, Regulatory alignment, Governance committees.
         * Elevate strategic ownership, decision-making authority, and oversight of multiple security domains.
         * Suppress operational execution, technical risk analysis, audit testing language, and tool-heavy engineering tasks.
       - If GRC Operations / Risk Management:
         * Focus on integrated GRC language, control framework alignment (NIST, ISO, SOC 2), risk register governance, and cross-functional coordination.
         * Frame experience using "GRC Activity + Cross-Functional Scope + Risk/Compliance Outcome".
         * Emphasize keywords: Governance, Risk, and Compliance (GRC), Risk and compliance management, Control frameworks, Risk register, Regulatory compliance, Control gap analysis.
         * Elevate ownership of GRC programs, strategic coordination, and advisory input to leadership.
         * Suppress pure policy authorship, deep technical threat analysis, independent audit execution, and pure engineering implementation.
       - If Cybersecurity Risk Management:
         * Focus on inherent and residual risk assessments, threat modeling, vulnerability correlation, and control effectiveness evaluation.
         * Frame experience using "Risk Activity + Technical Context + Business Impact".
         * Emphasize keywords: Cybersecurity risk assessment, Inherent and residual risk, Risk treatment / mitigation, Control effectiveness, Threat and vulnerability analysis, Risk register, Security controls (NIST, ISO 27001, CIS).
         * Elevate decision-support language, cross-functional collaboration, and mapping technical findings to business impact.
         * Suppress governance policy ownership, pure compliance translation, audit execution phrasing, and deep engineering implementation.
       - If Senior Cybersecurity Risk Management:
         * Focus on enterprise-level technical risk assessment, threat modeling, risk quantification, and control effectiveness.
         * Frame experience using "Risk Activity + Technical Context + Business Impact".
         * Emphasize keywords: Cybersecurity risk assessment, Threat and vulnerability analysis, Inherent and residual risk, Risk mitigation strategies, Control effectiveness, Risk quantification.
         * Elevate ownership of risk assessment processes, advisory to senior stakeholders, and decision-support responsibility.
         * Suppress governance policy ownership, compliance execution focus, full GRC integration leadership, and independent audit testing.
       - If Cybersecurity Risk Control:
         * Focus on control design, validation, effectiveness language, risk-control mapping, and remediation tracking.
         * Frame experience using "Control Activity + Risk Context + Effectiveness Outcome".
         * Emphasize keywords: Security controls, Control effectiveness, Control design and implementation, Risk-control mapping, Control gap analysis, Remediation tracking, Control validation.
         * Align controls to frameworks (NIST, ISO 27001, CIS).
         * Suppress full risk ownership, independent audit authority, policy governance ownership, and pure compliance translation.
       - If Information Security Compliance Risk Management:
         * Focus on compliance execution, regulatory alignment language, compliance risk identification, and tracking.
         * Frame experience using "Compliance Execution + Regulatory Context + Risk/Control Outcome".
         * Emphasize keywords: Information security compliance, Compliance risk management, Regulatory requirements and standards, Control mapping, Policy enforcement, Audit readiness, Compliance reporting.
         * Elevate audit readiness and policy adherence, positioning as execution over strategy (support/coordination).
         * Suppress strategic governance ownership, full GRC program leadership, deep technical risk modeling, and independent audit authority.
       - If Information Security Risk and Compliance:
         * Focus on balanced risk and compliance execution language, control mapping, and gap analysis.
         * Frame experience using "Risk/Compliance Activity + Control/Regulatory Context + Outcome".
         * Emphasize keywords: Information security risk and compliance, Risk and compliance management, Control frameworks (NIST, ISO 27001, SOC 2), Control gap analysis, Audit readiness, Risk tracking and remediation.
         * Elevate execution and coordination over strategic ownership, linking risk findings with compliance actions.
         * Suppress strategic governance ownership, full GRC program leadership, deep technical risk modeling, and independent audit execution.
       - If Compliance & Regulatory Affairs:
         * Focus on regulatory mapping (NIST, ISO, GDPR), audit preparation, and documentation.
         * Frame experience using "Compliance Activity + Framework Alignment + Outcome".
         * Emphasize interpretation of controls.
       - If Compliance Analyst:
         * Focus on compliance monitoring, audit support language, policy adherence, and documentation management.
         * Frame experience using "Compliance Task + Regulatory/Control Context + Execution Outcome".
         * Emphasize keywords: Compliance monitoring, Regulatory requirements, Policy adherence, Audit support, Control validation, Compliance reporting, Documentation management.
         * Elevate execution and support tasks, positioning as a foundational role within the compliance function.
         * Suppress strategic governance ownership, GRC program leadership, technical risk modeling, and independent audit authority.
       - If Privacy & Data Protection:
         * Focus on data protection laws, privacy impact assessments, and data lifecycle governance.
         * Frame experience using "Privacy Control Activity + Data Scope + Compliance Outcome".
         * Distinguish from general compliance with legal/regulatory specialization.
       - If Third-Party / Vendor Risk Management:
         * Focus on vendor assessments, due diligence, and contract risk evaluation.
         * Frame experience using "Vendor Risk Activity + Assessment Scope + Risk Outcome".
         * Highlight SaaS / FedRAMP / external dependencies.
       - If Senior IT Auditor:
         * Focus on independent assurance, IT audit planning and execution, control design and effectiveness testing, and audit findings reporting.
         * Frame experience using "Audit Activity + Control Context + Assurance Outcome".
         * Emphasize keywords: IT audit, Control effectiveness testing, Audit findings, Internal controls / ITGC, SOX compliance, Audit documentation, Risk and control evaluation.
         * Elevate ownership of audit engagements, independence, objectivity, and direct communication with stakeholders.
         * Suppress control ownership, risk mitigation responsibility, compliance execution, and governance strategy ownership.
       - If IT Audit & Controls Assurance:
         * Focus on control testing, audit execution, and evidence validation.
         * Frame experience using "Audit Activity + Control Scope + Validation Outcome".
         * Position as independent assurance (3rd line).
       - If IAM Governance, Risk & Compliance:
         * Focus on access reviews, segregation of duties (SoD), and entitlement governance.
         * Frame experience using "Identity Governance Activity + Access Scope + Compliance Outcome".
         * Blend IAM technical depth with governance language.
       - If Senior AML / BSA & KYC Investigator:
         * Focus on conducting complex financial crime investigations, KYC/CDD/EDD reviews, transaction analysis, sanctions screening, and drafting high-quality Suspicious Activity Reports (SARs).
         * Frame experience using "Investigative Action + Account/Transactional Context + Regulatory/Compliance Outcome".
         * Emphasize keywords: Anti-Money Laundering (AML), Bank Secrecy Act (BSA), FinCEN, OFAC, USA PATRIOT Act, CDD, EDD, transaction monitoring, alert investigations, FCRM, alert review, 314(a)/314(b) sharing, risk assessment, quality assurance (QA).
         * Standard tools: NICE Actimize, Verafin, SAS AML, MOC, Interact, Quantified, Excel, SQL.
         * Highlight investigative analytical depth and regulatory alignment; translate weak phrases like "Reviewed AML alerts" into "Conducted complex AML investigations involving transaction analysis, customer due diligence, and financial intelligence gathering to identify suspicious activity and ensure compliance with BSA, AML, OFAC, and FinCEN regulatory requirements."
       - If Investigations Operations Analyst:
         * Focus on operational enablement, workflow optimization, capacity planning, KPIs, SLA monitoring, operational analytics, dashboard creation, quality control, and queue management.
         * Frame experience using "Operations/Analytics Action + Workflow/Data Scope + Operational/Governance Outcome".
         * Emphasize keywords: Investigation Operations, Case Management, Operational Excellence, Workflow Optimization, KPI Development, SLA Monitoring, Dashboard Development, Process Improvement, Continuous Improvement, Lean Six Sigma, SOP Development, Operational Efficiency.
         * Standard tools: Power BI, Tableau, SQL, Excel, ServiceNow, Jira, Confluence, SharePoint, Microsoft Power Platform.
         * Translate weak phrases like "Created reports" into "Developed executive operational dashboards and KPI reporting that improved investigation visibility, optimized case throughput, enhanced workflow efficiency, and supported regulatory compliance initiatives."
       - If Fraud Analyst:
         * Focus on detecting, investigating, preventing, and mitigating fraudulent activity across banking, payments, card fraud, and digital channels.
         * Frame experience using "Fraud Analysis Activity + Financial/Operational Context + Loss Prevention/Risk Outcome".
         * Emphasize keywords: Fraud Detection, Fraud Prevention, Fraud Investigation, Transaction Monitoring, Card Fraud, Payment Fraud, ACH/Wire Fraud, Account Takeover (ATO), Identity Theft, Anomaly Detection, Behavioral Analytics, Risk Assessment, Case Management, Fraud Controls, Financial Loss Prevention.
         * Standard tools/platforms: NICE Actimize, FICO Falcon, Feedzai, Featurespace, Verafin, LexisNexis Risk Solutions, BioCatch, ThreatMetrix, Sift, SAS, SQL, Excel, Power BI.
         * Translate weak phrases like "Reviewed suspicious transactions" into "Conducted risk-based investigations of suspicious transactions by leveraging fraud detection systems, behavioral analytics, and transaction monitoring tools to identify fraudulent activity, reduce financial losses, and ensure compliance with internal policies and regulatory requirements."
       - If SAR Filing Specialist:
         * Focus on investigating suspicious customer activity, preparing and filing high-quality Suspicious Activity Reports (SARs), ensuring regulatory compliance with BSA/AML obligations and FinCEN guidance.
         * Frame experience using "Investigation Activity + Financial Crime Context + Regulatory or Risk Outcome".
         * Emphasize keywords: Suspicious Activity Report (SAR), SAR Filing, Suspicious Activity Reporting, Financial Crime Investigation, AML Investigations, BSA Compliance, Regulatory Reporting, FinCEN, OFAC, CDD, EDD, KYC, Transaction Monitoring, Case Management, Smurfing, Layering, Structuring.
         * Standard tools/platforms: Verafin, NICE Actimize, Oracle Mantas, SAS AML, FICO Falcon, Feedzai, LexisNexis Risk Solutions, World-Check One, Refinitiv World-Check, Dow Jones Risk & Compliance, SQL, Excel, Power BI.
         * Translate weak phrases like "Filed SARs" into "Conducted end-to-end investigations into suspicious financial activities, documented investigative findings, and prepared comprehensive Suspicious Activity Reports (SARs) in compliance with Bank Secrecy Act (BSA), FinCEN guidance, and internal AML policies."
       - If Know Your Customer (KYC) Analyst:
         * Focus on customer onboarding, customer verification, Customer Due Diligence (CDD), Enhanced Due Diligence (EDD), customer risk profiling, sanctions/PEP/adverse media screening, and beneficial ownership verification.
         * Frame experience using "KYC Activity + Customer or Regulatory Context + Risk, Compliance, or Business Outcome".
         * Emphasize keywords: Know Your Customer (KYC), Customer Due Diligence (CDD), Enhanced Due Diligence (EDD), Customer Identification Program (CIP), Identity Verification, Client Onboarding, Risk Assessment, Sanctions Screening, PEP Screening, Beneficial Ownership, UBO, Adverse Media, Customer Risk Rating, AML Compliance, BSA Compliance.
         * Standard tools/platforms: Fenergo, NICE Actimize, LexisNexis Risk Solutions, World-Check One, Refinitiv World-Check, Dow Jones Risk & Compliance, ComplyAdvantage, Jumio, Onfido, Trulioo, Verafin, Oracle Mantas, SQL, Excel, Power BI.
         * Translate weak phrases like "Reviewed customer documents" into "Evaluated customer onboarding documentation by performing Know Your Customer (KYC) verification, Customer Due Diligence (CDD), identity validation, and risk assessments to ensure compliance with AML regulations and internal policies."
       - If AML Compliance Specialist:
         * Focus on AML governance, regulatory compliance, policy implementation, control testing, audit readiness, and financial crime risk management (BSA/AML, FinCEN, OFAC, FATF).
         * Frame experience using "AML Compliance Activity + Regulatory or Operational Context + Compliance, Risk, or Business Outcome".
         * Emphasize keywords: Anti-Money Laundering (AML), AML Compliance, Bank Secrecy Act (BSA), Financial Crime Compliance, Regulatory Compliance, AML Governance, Compliance Testing, AML Risk Assessment, Transaction Monitoring, Customer Due Diligence (CDD), Enhanced Due Diligence (EDD), Suspicious Activity Reports (SAR), Internal Controls, Audit Readiness, Risk Management.
         * Standard tools/platforms: NICE Actimize, Verafin, Oracle Mantas, SAS AML, FICO Falcon, Fenergo, LexisNexis Risk Solutions, World-Check One, Refinitiv World-Check, Dow Jones Risk & Compliance, ComplyAdvantage, SQL, Python, Power BI, Tableau, Excel.
         * Translate weak phrases like "Worked on AML compliance" into "Supported enterprise Anti-Money Laundering (AML) compliance initiatives by conducting risk assessments, evaluating control effectiveness, maintaining AML policies, and ensuring compliance with Bank Secrecy Act (BSA), FinCEN guidance, and global regulatory requirements."

    INPUT DATA:
    ${JSON.stringify(baseResume)}
  `;

  const userPrompt = `
    JOB CONTEXT:
    ${jobLink ? `Job Link: ${jobLink}` : ''}
    
    JOB DESCRIPTION:
    ${jobDescription}

    INSTRUCTIONS:
    1. Analyze the JD for key technical requirements and soft skills.
    2. Rewrite the "Summary" to be a comprehensive, technical executive summary (4-6 sentences).
    3. Reconstruct the "Experience" bullets:
       - EXPAND on the base resume's points. Do not summarize.
       - Ensure a minimum of 8 high-quality, dense bullet points per job role.
       - For every point, strictly follow: Action Verb -> Deep Technical Context -> Specific Tools Used -> Quantitative Business Impact.
       - Make all conversions extremely technical (e.g., instead of "fixed server", use "remediated high-latency EC2 instances via auto-scaling policy adjustments").
    4. Curate the "Skills" and "Certifications" sections. Ensure relevant certifications from the input are included.
    5. Return JSON only.
  `;

  return executeWithFreeTierRetry(async (ai, model, extraConfig) => {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: resumeSchema,
        temperature: 0.4,
        ...extraConfig
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as TailoredResume;
    }
    throw new Error("No response content generated");
  });
};

export const optimizeTailoredResume = async (
  currentResume: TailoredResume,
  userPrompt: string,
  jobDescription: string,
  targetRole: TargetRole
): Promise<TailoredResume> => {
  const systemPrompt = `
    You are RoleArchitect, a sophisticated career strategist engine. 
    Your goal is to update and optimize the candidate's tailored resume based on the user's specific request.
    
    TARGET ROLE: ${targetRole}
    
    CURRENT RESUME JSON:
    ${JSON.stringify(currentResume)}
    
    JOB DESCRIPTION:
    ${jobDescription}

    USER REQUEST:
    ${userPrompt}

    INSTRUCTIONS:
    1. Modify the CURRENT RESUME JSON to fulfill the USER REQUEST.
    2. Maintain the factual integrity of the resume. Do not invent experiences unless asked to rephrase existing ones.
    3. Ensure the output strictly follows the JSON schema.
    4. Update the "analysis.toneNotes" to briefly explain what you changed based on the user's request.
    5. Return JSON only.
  `;

  return executeWithFreeTierRetry(async (ai, model, extraConfig) => {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: resumeSchema,
        temperature: 0.4,
        ...extraConfig
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as TailoredResume;
    }
    throw new Error("No response content generated");
  });
};

interface ApplicationAnswerResponse {
  generated_answer: string;
  confidence_note: string;
  intent_detected: string;
}

export const generateApplicationAnswer = async (
  question: string,
  targetRole: TargetRole,
  baseResume: ResumeData,
  wordLimit?: number,
  jobDescription?: string,
  jobLink?: string
): Promise<ApplicationAnswerResponse> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      generated_answer: { type: Type.STRING },
      confidence_note: { type: Type.STRING },
      intent_detected: { type: Type.STRING, description: "Technical, Behavioral, Governance, or Role Fit" }
    },
    required: ["generated_answer", "confidence_note", "intent_detected"]
  };

  const systemPrompt = `
    You are an intelligent Application Question Assistant.
    Your task is to answer employer application questions based on a candidate's profile.

    TARGET ROLE: ${targetRole}
    WORD LIMIT: ${wordLimit ? wordLimit + " words" : "Concise (approx 200 words)"}

    QUESTION INTENT CLASSIFICATION RULES:
    1. Technical (Tools, systems): Answer with experience-driven, factual depth.
    2. Behavioral ("Describe a time..."): Use STAR-aligned but concise structure.
    3. Governance (Risk, compliance): Focus on control, audit, and rigor.
    4. Role Fit ("Why this role?"): Focus on alignment and competence, NOT enthusiasm or marketing fluff.

    TONE SUPPRESSION RULES:
    - NO overly polished transitions ("Furthermore", "Moreover").
    - NO marketing language ("Thrilled", "Excited", "Passionate").
    - NO generic claims.
    - Style: Neutral, evidence-based, professionally understated.
    - Format: Plain text, no bullets, no markdown.

    ROLE INTELLIGENCE:
    - Cloud Security: Risk, Governance, NIST, WAF.
    - IAM: Identity Control Action + System Scope + Governance Outcome. (No DevOps fluff).
    - Cloud Engineer: Scale, Reliability, Cost.
    - DevSecOps: Pipeline security, Automation.
    - DevOps Engineer: Delivery pipelines, reliability, IaC, automation, observability. (Suppress security/compliance focus).
    - AWS Cloud Engineer: AWS-native architecture, core services (EC2/VPC/S3), reliability, cost-optimization. (Suppress pipeline ownership/audit).
    - Azure Cloud Engineer: Azure-native enterprise architecture, VNet/VMs/AKS, reliability, operational stability. (Suppress pipeline/audit).
    - Cloud Solution Architect: Design ownership, business alignment, architectural decision-making. (Suppress operational tasks).
    - Azure Cloud Architect: Focus on design ownership, Azure enterprise standards, landing zones, and governance. (Suppress operational tasks).
    - Site Reliability Engineer: Focus on reliability outcomes, incident management, toil reduction, and observability. (Suppress feature delivery).
    - Information Security Governance: Focus on governance frameworks, policy lifecycle management, risk appetite, and board-level reporting. (Suppress operational execution and technical risk analysis).
    - GRC Operations / Risk Management: Focus on integrated GRC language, control framework alignment (NIST, ISO, SOC 2), and cross-functional coordination. (Suppress deep technical threat analysis and standalone audit execution).
    - Cybersecurity Risk Management: Focus on inherent and residual risk assessments, threat modeling, and control effectiveness. (Suppress policy ownership and audit execution).
    - Senior Cybersecurity Risk Management: Focus on enterprise-level technical risk assessments, risk quantification, and threat analysis. (Suppress governance policy ownership and compliance execution).
    - Cybersecurity Risk Control: Focus on control design, validation, risk-control mapping, and remediation tracking. (Suppress full risk ownership and independent audit).
    - Information Security Compliance Risk Management: Focus on compliance execution, regulatory alignment, and compliance risk tracking. (Suppress strategic governance ownership and deep technical risk modeling).
    - Information Security Risk and Compliance: Focus on balanced risk and compliance execution, control mapping, and audit readiness. (Suppress strategic governance ownership and deep technical risk modeling).
    - Compliance & Regulatory Affairs: Focus on regulatory mapping (NIST, ISO, GDPR) and audit preparation.
    - Compliance Analyst: Focus on compliance monitoring, audit support, and policy adherence tracking. (Suppress strategic governance ownership and deep technical risk modeling).
    - Privacy & Data Protection: Focus on data protection laws, privacy impact assessments, and data lifecycle governance.
    - Third-Party / Vendor Risk Management: Focus on vendor assessments, due diligence, and contract risk evaluation.
    - Senior IT Auditor: Focus on independent control assurance, IT audit execution, control effectiveness testing, and audit findings reporting. (Suppress control ownership and risk mitigation responsibility).
    - IT Audit & Controls Assurance: Focus on control testing, audit execution, and evidence validation.
    - IAM Governance, Risk & Compliance: Focus on access reviews, segregation of duties (SoD), and entitlement governance.
    - Senior AML / BSA & KYC Investigator: Focus on complex financial crime investigations, KYC/CDD/EDD, BSA compliance, SAR preparation, alert reviews, and transaction monitoring. Emphasize analytical depth, FCRM, and FinCEN/OFAC compliance.
    - Investigations Operations Analyst: Focus on operational support, workflow optimization, operational metrics, dashboard creation, capacity planning, and KPI/SLA monitoring.
    - Fraud Analyst: Focus on fraud detection, fraud investigations, loss mitigation, transaction monitoring, behavioral analytics, and fraud risk controls.
    - SAR Filing Specialist: Focus on suspicious activity investigations, SAR preparation and filing, BSA/AML regulatory compliance, FinCEN guidance, and financial intelligence analysis.
    - Know Your Customer (KYC) Analyst: Focus on customer due diligence (CDD/EDD), identity verification, risk profiling, customer onboarding, sanctions/PEP screening, and AML regulatory compliance.
    - AML Compliance Specialist: Focus on AML governance, compliance programs, regulatory adherence (BSA/AML, FinCEN, FATF), control testing, risk assessments, and audit readiness.

    CANDIDATE PROFILE:
    ${JSON.stringify(baseResume)}

    JOB CONTEXT:
    ${jobLink ? `Job Link: ${jobLink}` : ''}
    ${jobDescription ? `Job Description:\n${jobDescription}` : ''}
  `;

  const userPrompt = `
    APPLICATION QUESTION:
    "${question}"

    Generate a tailored answer following the rules above.
  `;

  return executeWithFreeTierRetry(async (ai, model, extraConfig) => {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3,
        ...extraConfig
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ApplicationAnswerResponse;
    }
    throw new Error("No response generated");
  });
};

export interface CoverLetterResponse {
  content: string;
}

export const generateCoverLetter = async (
  companyName: string,
  hiringManager: string,
  targetRole: TargetRole,
  baseResume: ResumeData,
  jobDescription?: string,
): Promise<CoverLetterResponse> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "The full markdown formatted cover letter" },
    },
    required: ["content"]
  };

  const systemPrompt = `
    You are an Executive Career Strategist.
    Write a highly tailored Cover Letter.

    TARGET ROLE: ${targetRole}
    COMPANY: ${companyName}
    HIRING MANAGER: ${hiringManager || "Hiring Manager"}

    TONE & STYLE:
    - Confidence without arrogance.
    - Evidence-based statements (cite specific technical wins from the resume).
    - "Hook" opening that addresses the company's specific needs found in the JD.
    - No generic fluff ("I am a hard worker").
    - Use Role-Specific vocabulary (see Role Intelligence below).

    ROLE INTELLIGENCE:
    - Cloud Solution Architect: Focus on "Strategic Alignment", "Cost/Scale Optimization", and "End-to-End Design Ownership".
    - Azure Cloud Architect: Focus on "Enterprise Azure Strategy", "Landing Zone Governance", and "Scalable Platform Design".
    - Cloud Security: Focus on "Risk Mitigation", "Compliance as Code", and "Security Posture Improvement".
    - DevOps/Cloud Engineer: Focus on "Operational Excellence", "Automation ROI", and "Reliability".
    - Site Reliability Engineer: Focus on "Service Reliability", "Toil Reduction", and "Observability".
    - Information Security Governance: Focus on "Governance Frameworks", "Policy Lifecycle Management", and "Strategic Alignment".
    - GRC Operations / Risk Management: Focus on "Integrated GRC Strategy", "Control Framework Alignment", and "Cross-functional Compliance Coordination".
    - Cybersecurity Risk Management: Focus on "Inherent/Residual Risk Assessments", "Control Effectiveness", and "Risk Mitigation Strategies".
    - Senior Cybersecurity Risk Management: Focus on "Cybersecurity Risk Assessment", "Risk Quantification", and "Threat and Vulnerability Analysis".
    - Cybersecurity Risk Control: Focus on "Control Effectiveness", "Risk-Control Mapping", and "Remediation Tracking".
    - Information Security Compliance Risk Management: Focus on "Compliance Execution", "Regulatory Requirements", and "Audit Readiness".
    - Information Security Risk and Compliance: Focus on "Risk and Compliance Execution", "Control Gap Analysis", and "Audit Readiness".
    - Compliance & Regulatory Affairs: Focus on "Regulatory Alignment", "Audit Readiness", and "Framework Mapping".
    - Compliance Analyst: Focus on "Compliance Monitoring", "Audit Support", and "Policy Adherence".
    - Privacy & Data Protection: Focus on "Data Lifecycle Governance", "Privacy Impact Assessments", and "Regulatory Compliance".
    - Third-Party / Vendor Risk Management: Focus on "Vendor Due Diligence", "Supply Chain Security", and "Contract Risk".
    - Senior IT Auditor: Focus on "IT Audit Execution", "Control Effectiveness Testing", and "Independent Assurance".
    - IT Audit & Controls Assurance: Focus on "Independent Validation", "Control Testing", and "Audit Execution".
    - IAM Governance, Risk & Compliance: Focus on "Access Governance", "Segregation of Duties", and "Entitlement Reviews".
    - Senior AML / BSA & KYC Investigator: Focus on "Financial Crime Detection", "Factual SAR Drafting", "CDD/EDD Rigor", and "BSA/AML Regulatory Standards".
    - Investigations Operations Analyst: Focus on "Operational Enablement", "Workflow Performance Optimization", "Metrics/KPI Tracking", and "SLA Management".
    - Fraud Analyst: Focus on "Fraud Loss Prevention", "Transaction Monitoring Analytics", "Investigation Excellence", and "Fraud Risk Mitigation".
    - SAR Filing Specialist: Focus on "Regulatory SAR Quality", "BSA/AML Compliance Rigor", "Investigative Documentation", and "FinCEN Reporting Excellence".
    - Know Your Customer (KYC) Analyst: Focus on "Customer Due Diligence (CDD/EDD)", "Identity Verification & Onboarding", "Sanctions & PEP Screening", and "AML Customer Risk Assessment".
    - AML Compliance Specialist: Focus on "AML Governance & Program Compliance", "BSA/AML Regulatory Standards", "Compliance Testing & Control Assurance", and "Audit Readiness & Risk Management".

    STRUCTURE:
    1. Header (Standard business format)
    2. Salutation
    3. The Hook: Why this specific role + company? Connect to a specific JD requirement.
    4. The Value Prop: 2 specific technical achievements from the resume that prove you can solve their problems.
    5. The Closing: Professional call to action.

    CANDIDATE DATA:
    ${JSON.stringify(baseResume)}

    JOB DESCRIPTION (Source of Truth for Requirements):
    ${jobDescription || "No specific JD provided, focus on general role excellence."}
  `;

  return executeWithFreeTierRetry(async (ai, model, extraConfig) => {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.4,
        ...extraConfig
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as CoverLetterResponse;
    }
    throw new Error("No response generated");
  });
};

export const parseResumeFromText = async (text: string): Promise<ResumeData> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        contact: {
            type: Type.OBJECT,
            properties: {
                location: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                linkedin: { type: Type.STRING },
            },
            required: ["location", "email"]
        },
        summary: { type: Type.STRING },
        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
        certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
        education: { type: Type.ARRAY, items: { type: Type.STRING } },
        experience: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    company: { type: Type.STRING },
                    role: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    bullets: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["company", "role", "duration", "bullets"]
            }
        }
    },
    required: ["name", "contact", "summary", "skills", "experience"]
  };

  const prompt = `
    Extract structured resume data from the text below. 
    Map it to the JSON schema strictly.
    Ensure "bullets" in experience are preserved as individual points from the source text.
    
    RESUME TEXT:
    ${text}
  `;

  return executeWithFreeTierRetry(async (ai, model, extraConfig) => {
    const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            ...extraConfig
        }
    });

    if (response.text) {
        return JSON.parse(response.text) as ResumeData;
    }
    throw new Error("No response content generated");
  });
};