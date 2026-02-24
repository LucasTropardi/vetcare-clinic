export type Role = "ADMIN" | "VET" | "RECEPTION";

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type UserResponseWithRole = {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

export type AppointmentType = "VET" | "PETSHOP";
export type AppointmentStatus = "OPEN" | "FINISHED" | "CANCELED";

export type AppointmentResponse = {
  id: number;
  petId: number;
  appointmentType: AppointmentType;
  veterinarianUserId?: number | null;
  serviceProductId?: number | null;
  status: AppointmentStatus;
  scheduledStartAt: string;
  scheduledEndAt: string;
  notes?: string | null;
  openedAt: string;
  finishedAt?: string | null;
  canceledAt?: string | null;
  cancelReason?: string | null;
  createdBy?: number | null;
  finishedBy?: number | null;
  canceledBy?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type OpenAppointmentRequest = {
  petId: number;
  appointmentType: AppointmentType;
  veterinarianUserId?: number;
  serviceProductId?: number;
  scheduledStartAt: string;
  scheduledEndAt: string;
  notes?: string;
  chiefComplaint?: string;
};

export type MedicalRecordResponse = {
  id: number;
  appointmentId: number;
  chiefComplaint?: string | null;
  clinicalNotes?: string | null;
  attendedByUserId?: number | null;
  weightKg?: number | null;
  temperatureC?: number | null;
  heartRateBpm?: number | null;
  respiratoryRateRpm?: number | null;
  initialAssessment?: string | null;
  diagnosisSummary?: string | null;
  treatmentPlan?: string | null;
  usedMedications?: string | null;
  hospitalizationIndicated?: boolean | null;
  hospitalizationNotes?: string | null;
  dischargeInstructions?: string | null;
  followUpAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertMedicalRecordRequest = {
  chiefComplaint?: string;
  clinicalNotes?: string;
  weightKg?: number;
  temperatureC?: number;
  heartRateBpm?: number;
  respiratoryRateRpm?: number;
  initialAssessment?: string;
  diagnosisSummary?: string;
  treatmentPlan?: string;
  usedMedications?: string;
  hospitalizationIndicated?: boolean;
  hospitalizationNotes?: string;
  dischargeInstructions?: string;
  followUpAt?: string;
};

export type DiagnosisResponse = {
  id: number;
  medicalRecordId: number;
  code?: string | null;
  description: string;
  primary: boolean;
  createdAt: string;
};

export type ProcedureResponse = {
  id: number;
  medicalRecordId: number;
  description: string;
  notes?: string | null;
  performedAt?: string | null;
  createdAt: string;
};

export type PetshopRecordResponse = {
  id: number;
  appointmentId: number;
  attendedByUserId?: number | null;
  serviceReport?: string | null;
  productsUsed?: string | null;
  checkinNotes?: string | null;
  checkoutNotes?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertPetshopRecordRequest = {
  serviceReport?: string;
  productsUsed?: string;
  checkinNotes?: string;
  checkoutNotes?: string;
  startedAt?: string;
  finishedAt?: string;
};

export type PrescriptionItemResponse = {
  id: number;
  medicationName: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  route?: string | null;
  notes?: string | null;
};

export type PrescriptionResponse = {
  id: number;
  appointmentId: number;
  veterinarianUserId: number;
  title?: string | null;
  guidance?: string | null;
  validUntil?: string | null;
  createdAt: string;
  items: PrescriptionItemResponse[];
};

export type CreatePrescriptionItemRequest = {
  medicationName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  notes?: string;
};

export type CreatePrescriptionRequest = {
  title?: string;
  guidance?: string;
  validUntil?: string;
  items: CreatePrescriptionItemRequest[];
};

export type PetListItemResponse = {
  id: number;
  tutorId: number;
  tutorName?: string;
  name: string;
  species: string;
  active: boolean;
};

export type PetStatsResponse = {
  total: number;
  active: number;
  inactive: number;
  dogs: number;
  cats: number;
  others: number;
};

export type TutorListItemResponse = {
  id: number;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  active: boolean;
};

export type TutorStatsResponse = {
  total: number;
  active: number;
  inactive: number;
  withCompany: number;
  withPet: number;
  withoutContact: number;
};

export type ProductListItemResponse = {
  id: number;
  sku: string;
  name: string;
  active: boolean;
};

export type StockMovementType = "ENTRY_PURCHASE" | "EXIT_SALE" | "EXIT_VISIT_CONSUMPTION" | "ADJUSTMENT";

export type StockBalanceListItemResponse = {
  productId: number;
  sku: string;
  name: string;
  onHand: number;
  avgCost: number;
  minStock: number;
  belowMinStock: boolean;
};

export type StockMovementResponse = {
  id: number;
  productId: number;
  movementType: StockMovementType;
  quantity: number;
  unitCost?: number | null;
  notes?: string | null;
  referenceType?: string | null;
  referenceId?: number | null;
  createdBy?: number | null;
  createdAt: string;
};

export type CreateStockMovementRequest = {
  productId: number;
  movementType: StockMovementType;
  quantity: number;
  unitCost?: number;
  notes?: string;
  referenceType?: string;
  referenceId?: number;
};
