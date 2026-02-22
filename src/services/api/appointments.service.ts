import { http } from "./http";
import type {
  AppointmentResponse,
  AppointmentStatus,
  AppointmentType,
  CreatePrescriptionRequest,
  DiagnosisResponse,
  MedicalRecordResponse,
  OpenAppointmentRequest,
  PageResponse,
  PetshopRecordResponse,
  PrescriptionResponse,
  ProcedureResponse,
  UpsertMedicalRecordRequest,
  UpsertPetshopRecordRequest,
} from "./types";

export type ListAppointmentsParams = {
  page?: number;
  size?: number;
  sort?: string | string[];
  petId?: number;
  vetUserId?: number;
  serviceProductId?: number;
  appointmentType?: AppointmentType;
  status?: AppointmentStatus;
  scheduledFrom?: string;
  scheduledTo?: string;
};

export type AddDiagnosisRequest = {
  code?: string;
  description: string;
  primary?: boolean;
};

export type AddProcedureRequest = {
  description: string;
  notes?: string;
  performedAt?: string;
};

export async function listAppointments(params?: ListAppointmentsParams): Promise<PageResponse<AppointmentResponse>> {
  const { data } = await http.get<PageResponse<AppointmentResponse>>("/api/appointments", { params });
  return data;
}

export async function createAppointment(payload: OpenAppointmentRequest): Promise<AppointmentResponse> {
  const { data } = await http.post<AppointmentResponse>("/api/appointments", payload);
  return data;
}

export async function getAppointmentById(id: number): Promise<AppointmentResponse> {
  const { data } = await http.get<AppointmentResponse>(`/api/appointments/${id}`);
  return data;
}

export async function assignAppointmentVet(appointmentId: number, veterinarianUserId: number): Promise<AppointmentResponse> {
  const { data } = await http.patch<AppointmentResponse>(`/api/appointments/${appointmentId}/assign-vet`, null, {
    params: { veterinarianUserId },
  });
  return data;
}

export async function finishAppointment(appointmentId: number): Promise<AppointmentResponse> {
  const { data } = await http.patch<AppointmentResponse>(`/api/appointments/${appointmentId}/finish`);
  return data;
}

export async function cancelAppointment(appointmentId: number, reason: string): Promise<AppointmentResponse> {
  const { data } = await http.patch<AppointmentResponse>(`/api/appointments/${appointmentId}/cancel`, { reason });
  return data;
}

export async function getMedicalRecord(appointmentId: number): Promise<MedicalRecordResponse> {
  const { data } = await http.get<MedicalRecordResponse>(`/api/appointments/${appointmentId}/medical-record`);
  return data;
}

export async function upsertMedicalRecord(appointmentId: number, payload: UpsertMedicalRecordRequest): Promise<MedicalRecordResponse> {
  const { data } = await http.put<MedicalRecordResponse>(`/api/appointments/${appointmentId}/medical-record`, payload);
  return data;
}

export async function addDiagnosis(appointmentId: number, payload: AddDiagnosisRequest): Promise<DiagnosisResponse> {
  const { data } = await http.post<DiagnosisResponse>(`/api/appointments/${appointmentId}/diagnoses`, payload);
  return data;
}

export async function addProcedure(appointmentId: number, payload: AddProcedureRequest): Promise<ProcedureResponse> {
  const { data } = await http.post<ProcedureResponse>(`/api/appointments/${appointmentId}/procedures`, payload);
  return data;
}

export async function getPetshopRecord(appointmentId: number): Promise<PetshopRecordResponse> {
  const { data } = await http.get<PetshopRecordResponse>(`/api/appointments/${appointmentId}/petshop-record`);
  return data;
}

export async function upsertPetshopRecord(appointmentId: number, payload: UpsertPetshopRecordRequest): Promise<PetshopRecordResponse> {
  const { data } = await http.put<PetshopRecordResponse>(`/api/appointments/${appointmentId}/petshop-record`, payload);
  return data;
}

export async function listPrescriptions(appointmentId: number): Promise<PrescriptionResponse[]> {
  const { data } = await http.get<PrescriptionResponse[]>(`/api/appointments/${appointmentId}/prescriptions`);
  return data;
}

export async function createPrescription(appointmentId: number, payload: CreatePrescriptionRequest): Promise<PrescriptionResponse> {
  const { data } = await http.post<PrescriptionResponse>(`/api/appointments/${appointmentId}/prescriptions`, payload);
  return data;
}

export async function downloadPrescriptionPdf(
  appointmentId: number,
  prescriptionId: number,
  disposition: "inline" | "attachment" = "attachment"
): Promise<Blob> {
  const { data } = await http.get<Blob>(`/api/appointments/${appointmentId}/prescriptions/${prescriptionId}/pdf`, {
    params: { disposition },
    responseType: "blob",
  });
  return data;
}
