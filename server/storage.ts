import {
  users, patients, medicalDocuments, clinicalTrials, trialMatches, extractedMedicalInfo,
  type User, type InsertUser,
  type Patient, type InsertPatient,
  type MedicalDocument, type InsertMedicalDocument,
  type ClinicalTrial, type InsertClinicalTrial,
  type TrialMatch, type InsertTrialMatch,
  type ExtractedMedicalInfo, type InsertExtractedMedicalInfo
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Patient operations
  getPatients(): Promise<Patient[]>;
  getPatientById(id: number): Promise<Patient | undefined>;
  getPatientByPatientId(patientId: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  
  // Medical document operations
  getMedicalDocuments(patientId: number): Promise<MedicalDocument[]>;
  createMedicalDocument(document: InsertMedicalDocument): Promise<MedicalDocument>;
  
  // Clinical trial operations
  getClinicalTrials(): Promise<ClinicalTrial[]>;
  getClinicalTrialById(id: number): Promise<ClinicalTrial | undefined>;
  getClinicalTrialByNctId(nctId: string): Promise<ClinicalTrial | undefined>;
  createClinicalTrial(trial: InsertClinicalTrial): Promise<ClinicalTrial>;
  
  // Trial match operations
  getTrialMatches(patientId: number): Promise<TrialMatch[]>;
  createTrialMatch(match: InsertTrialMatch): Promise<TrialMatch>;
  
  // Extracted medical info operations
  getExtractedMedicalInfo(patientId: number): Promise<ExtractedMedicalInfo | undefined>;
  createExtractedMedicalInfo(info: InsertExtractedMedicalInfo): Promise<ExtractedMedicalInfo>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private patients: Map<number, Patient>;
  private medicalDocuments: Map<number, MedicalDocument>;
  private clinicalTrials: Map<number, ClinicalTrial>;
  private trialMatches: Map<number, TrialMatch>;
  private extractedMedicalInfos: Map<number, ExtractedMedicalInfo>;
  
  private currentUserId: number;
  private currentPatientId: number;
  private currentDocumentId: number;
  private currentTrialId: number;
  private currentMatchId: number;
  private currentMedicalInfoId: number;
  
  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.medicalDocuments = new Map();
    this.clinicalTrials = new Map();
    this.trialMatches = new Map();
    this.extractedMedicalInfos = new Map();
    
    this.currentUserId = 1;
    this.currentPatientId = 1;
    this.currentDocumentId = 1;
    this.currentTrialId = 1;
    this.currentMatchId = 1;
    this.currentMedicalInfoId = 1;
    
    // Initialize with some clinical trials
    this.seedClinicalTrials();
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Patient operations
  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }
  
  async getPatientById(id: number): Promise<Patient | undefined> {
    return this.patients.get(id);
  }
  
  async getPatientByPatientId(patientId: string): Promise<Patient | undefined> {
    return Array.from(this.patients.values()).find(
      (patient) => patient.patientId === patientId,
    );
  }
  
  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = this.currentPatientId++;
    const patient: Patient = { ...insertPatient, id };
    this.patients.set(id, patient);
    return patient;
  }
  
  async updatePatient(id: number, patientUpdate: Partial<InsertPatient>): Promise<Patient | undefined> {
    const patient = this.patients.get(id);
    if (!patient) return undefined;
    
    const updatedPatient = { ...patient, ...patientUpdate };
    this.patients.set(id, updatedPatient);
    return updatedPatient;
  }
  
  // Medical document operations
  async getMedicalDocuments(patientId: number): Promise<MedicalDocument[]> {
    return Array.from(this.medicalDocuments.values()).filter(
      (doc) => doc.patientId === patientId,
    );
  }
  
  async createMedicalDocument(insertDocument: InsertMedicalDocument): Promise<MedicalDocument> {
    const id = this.currentDocumentId++;
    const now = new Date();
    const document: MedicalDocument = { 
      ...insertDocument, 
      id,
      uploadedAt: now,
    };
    this.medicalDocuments.set(id, document);
    return document;
  }
  
  // Clinical trial operations
  async getClinicalTrials(): Promise<ClinicalTrial[]> {
    return Array.from(this.clinicalTrials.values());
  }
  
  async getClinicalTrialById(id: number): Promise<ClinicalTrial | undefined> {
    return this.clinicalTrials.get(id);
  }
  
  async getClinicalTrialByNctId(nctId: string): Promise<ClinicalTrial | undefined> {
    return Array.from(this.clinicalTrials.values()).find(
      (trial) => trial.nctId === nctId,
    );
  }
  
  async createClinicalTrial(insertTrial: InsertClinicalTrial): Promise<ClinicalTrial> {
    const id = this.currentTrialId++;
    const trial: ClinicalTrial = { ...insertTrial, id };
    this.clinicalTrials.set(id, trial);
    return trial;
  }
  
  // Trial match operations
  async getTrialMatches(patientId: number): Promise<TrialMatch[]> {
    return Array.from(this.trialMatches.values()).filter(
      (match) => match.patientId === patientId,
    );
  }
  
  async createTrialMatch(insertMatch: InsertTrialMatch): Promise<TrialMatch> {
    const id = this.currentMatchId++;
    const now = new Date();
    const match: TrialMatch = { 
      ...insertMatch, 
      id,
      createdAt: now
    };
    this.trialMatches.set(id, match);
    return match;
  }
  
  // Extracted medical info operations
  async getExtractedMedicalInfo(patientId: number): Promise<ExtractedMedicalInfo | undefined> {
    return Array.from(this.extractedMedicalInfos.values()).find(
      (info) => info.patientId === patientId,
    );
  }
  
  async createExtractedMedicalInfo(insertInfo: InsertExtractedMedicalInfo): Promise<ExtractedMedicalInfo> {
    const id = this.currentMedicalInfoId++;
    const now = new Date();
    const info: ExtractedMedicalInfo = { 
      ...insertInfo, 
      id,
      extractedAt: now,
    };
    this.extractedMedicalInfos.set(id, info);
    return info;
  }
  
  // Seed clinical trials for demo purposes
  private seedClinicalTrials() {
    const trialData = [
      {
        nctId: "NCT02513394",
        title: "PALLAS: PALbociclib CoLlaborative Adjuvant Study",
        phase: "Phase 3",
        status: "Recruiting",
        facility: "University Medical Center",
        distance: 2,
        primaryPurpose: "Treatment",
        intervention: "Palbociclib + Standard Endocrine Therapy",
        summary: "A randomized phase III trial evaluating palbociclib with standard adjuvant endocrine therapy versus standard adjuvant endocrine therapy alone for hormone receptor positive (HR+) / human epidermal growth factor receptor 2 (HER2)-negative early breast cancer.",
        eligibilityCriteria: {
          inclusions: ["Stage 2", "HR+/HER2-", "Completed Surgery"],
          exclusions: ["Metastatic disease", "Previous CDK4/6 inhibitor treatment"]
        }
      },
      {
        nctId: "NCT03155997",
        title: "MonarchE: Abemaciclib and Hormone Therapy After Surgery",
        phase: "Phase 3",
        status: "Recruiting",
        facility: "Memorial Research Center",
        distance: 5,
        primaryPurpose: "Treatment",
        intervention: "Abemaciclib + Standard Endocrine Therapy",
        summary: "A study of abemaciclib in participants with high risk, node positive, early stage, hormone receptor positive, human epidermal growth factor receptor 2 negative breast cancer receiving adjuvant endocrine therapy.",
        eligibilityCriteria: {
          inclusions: ["HR+/HER2-", "Completed Surgery"],
          exclusions: ["Prior chemotherapy for current breast cancer"],
          preferred: ["Node-positive preferred"]
        }
      },
      {
        nctId: "NCT03701334",
        title: "NATALEE: Ribociclib With Endocrine Therapy",
        phase: "Phase 3",
        status: "Recruiting",
        facility: "University Hospital",
        distance: 8,
        primaryPurpose: "Treatment",
        intervention: "Ribociclib + Hormone Therapy",
        summary: "A phase III trial to evaluate efficacy and safety of ribociclib with endocrine therapy as adjuvant treatment in patients with HR+/HER2- early breast cancer.",
        eligibilityCriteria: {
          inclusions: ["HR+/HER2-", "Completed Surgery"],
          exclusions: ["Prior CDK4/6 inhibitor treatment"],
          limitations: ["Age limit 65+"]
        }
      },
      {
        nctId: "NCT04546009",
        title: "AMEERA-6: Amcenestrant as Adjuvant Endocrine Therapy",
        phase: "Phase 3",
        status: "Recruiting",
        facility: "City Cancer Institute",
        distance: 12,
        primaryPurpose: "Treatment",
        intervention: "Amcenestrant vs Tamoxifen",
        summary: "This is a Phase 3 study of amcenestrant versus tamoxifen for women with ER+, HER2- early breast cancer who have discontinued adjuvant aromatase inhibitor therapy due to toxicity.",
        eligibilityCriteria: {
          inclusions: ["HR+/HER2-", "Discontinued aromatase inhibitor due to toxicity"],
          exclusions: ["Metastatic disease", "Prior fulvestrant treatment"]
        }
      },
      {
        nctId: "NCT04774211",
        title: "PERSEE: Personalized Treatment Approach",
        phase: "Phase 2",
        status: "Recruiting",
        facility: "National Oncology Center",
        distance: 15,
        primaryPurpose: "Treatment",
        intervention: "Multiple based on tumor profile",
        summary: "A Phase 2 basket study investigating the efficacy of personalized treatment approaches based on molecular profiling in early-stage breast cancer patients.",
        eligibilityCriteria: {
          inclusions: ["Any breast cancer subtype", "Willing to undergo molecular testing"],
          exclusions: ["Prior targeted therapy"]
        }
      }
    ];
    
    trialData.forEach((trial, index) => {
      const id = this.currentTrialId++;
      this.clinicalTrials.set(id, { ...trial, id });
    });
  }
}

export const storage = new MemStorage();
