import { pgTable, text, serial, integer, boolean, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").default("doctor"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
});

// Patient schema
export const patientStatusEnum = pgEnum("patient_status", ["active", "inactive", "archived"]);

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  patientId: text("patient_id").notNull().unique(),
  dob: text("dob"),
  gender: text("gender"),
  status: patientStatusEnum("status").default("active"),
  medicalInfo: jsonb("medical_info"),
});

export const insertPatientSchema = createInsertSchema(patients).pick({
  patientId: true,
  dob: true,
  gender: true,
  status: true,
  medicalInfo: true,
});

// Medical Document schema
export const medicalDocuments = pgTable("medical_documents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  content: text("content").notNull(),
  documentType: text("document_type").default("letter"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const insertMedicalDocumentSchema = createInsertSchema(medicalDocuments).pick({
  patientId: true,
  content: true,
  documentType: true,
});

// Clinical Trial schema
export const clinicalTrials = pgTable("clinical_trials", {
  id: serial("id").primaryKey(),
  nctId: text("nct_id").notNull().unique(),
  title: text("title").notNull(),
  phase: text("phase"),
  status: text("status"),
  facility: text("facility"),
  distance: integer("distance"),
  primaryPurpose: text("primary_purpose"),
  intervention: text("intervention"),
  summary: text("summary"),
  eligibilityCriteria: jsonb("eligibility_criteria"),
});

export const insertClinicalTrialSchema = createInsertSchema(clinicalTrials).pick({
  nctId: true,
  title: true,
  phase: true,
  status: true,
  facility: true,
  distance: true,
  primaryPurpose: true,
  intervention: true,
  summary: true,
  eligibilityCriteria: true,
});

// Trial Match schema
export const trialMatches = pgTable("trial_matches", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  trialId: integer("trial_id").notNull(),
  matchScore: integer("match_score").notNull(),
  matchReasons: jsonb("match_reasons"),
  limitingFactors: jsonb("limiting_factors"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTrialMatchSchema = createInsertSchema(trialMatches).pick({
  patientId: true,
  trialId: true,
  matchScore: true,
  matchReasons: true,
  limitingFactors: true,
});

// Extracted Medical Information schema
export const extractedMedicalInfo = pgTable("extracted_medical_info", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  diagnosis: jsonb("diagnosis"),
  treatments: jsonb("treatments"),
  medicalHistory: jsonb("medical_history"),
  demographics: jsonb("demographics"),
  extractedAt: timestamp("extracted_at").defaultNow(),
});

export const insertExtractedMedicalInfoSchema = createInsertSchema(extractedMedicalInfo).pick({
  patientId: true,
  diagnosis: true,
  treatments: true,
  medicalHistory: true,
  demographics: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type MedicalDocument = typeof medicalDocuments.$inferSelect;
export type InsertMedicalDocument = z.infer<typeof insertMedicalDocumentSchema>;

export type ClinicalTrial = typeof clinicalTrials.$inferSelect;
export type InsertClinicalTrial = z.infer<typeof insertClinicalTrialSchema>;

export type TrialMatch = typeof trialMatches.$inferSelect;
export type InsertTrialMatch = z.infer<typeof insertTrialMatchSchema>;

export type ExtractedMedicalInfo = typeof extractedMedicalInfo.$inferSelect;
export type InsertExtractedMedicalInfo = z.infer<typeof insertExtractedMedicalInfoSchema>;
