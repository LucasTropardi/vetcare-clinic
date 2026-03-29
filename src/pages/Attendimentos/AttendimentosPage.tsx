import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./AttendimentosPage.module.css";
import { useAuthStore } from "../../store/auth.store";
import { useConfirmStore } from "../../store/confirm.store";
import { showMessage } from "../../store/message.store";
import {
  addDiagnosis,
  addProcedure,
  cancelAppointment,
  createAppointment,
  createPrescription,
  downloadPrescriptionPdf,
  finishAppointment,
  getAppointmentById,
  getMedicalRecord,
  getPetshopRecord,
  listAppointments,
  listPrescriptions,
  upsertMedicalRecord,
  upsertPetshopRecord,
} from "../../services/api/appointments.service";
import type {
  AppointmentResponse,
  AppointmentType,
  CreatePrescriptionItemRequest,
  MedicalRecordResponse,
  OpenAppointmentRequest,
  PetListItemResponse,
  PetshopRecordResponse,
  ProductListItemResponse,
  UserResponseWithRole,
} from "../../services/api/types";
import { listPets } from "../../services/api/pets.service";
import { listProducts } from "../../services/api/products.service";
import { listUsers } from "../../services/api/users.service";
import { getApiErrorMessage } from "../../services/api/errors";

function toDateInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

function startOfDayIso(dateInput: string) {
  return new Date(`${dateInput}T00:00:00`).toISOString();
}

function endOfDayIso(dateInput: string) {
  return new Date(`${dateInput}T23:59:59`).toISOString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

type LocationState = {
  fromAgenda?: boolean;
  action?: "start" | "finish" | "cancel";
  appointmentId?: number;
  type?: AppointmentType;
};

export function AttendimentosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirmStore((s) => s.confirm);
  const me = useAuthStore((s) => s.me);

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [pets, setPets] = useState<PetListItemResponse[]>([]);
  const [services, setServices] = useState<ProductListItemResponse[]>([]);
  const [vets, setVets] = useState<UserResponseWithRole[]>([]);

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponse | null>(null);

  const [medical, setMedical] = useState<Partial<MedicalRecordResponse>>({});
  const [petshopRecord, setPetshopRecord] = useState<Partial<PetshopRecordResponse>>({});
  const [prescriptions, setPrescriptions] = useState<Array<{ id: number; title?: string | null; createdAt: string; itemCount: number }>>([]);

  const [newDiagnosis, setNewDiagnosis] = useState("");
  const [newProcedure, setNewProcedure] = useState("");
  const [newProcedureNotes, setNewProcedureNotes] = useState("");

  const [showManualModal, setShowManualModal] = useState(false);
  const [listVisible, setListVisible] = useState(false);
  const [manualType, setManualType] = useState<AppointmentType>("VET");
  const [manualPetId, setManualPetId] = useState("");
  const [manualVetId, setManualVetId] = useState("");
  const [manualServiceId, setManualServiceId] = useState("");
  const [manualStart, setManualStart] = useState(toDateTimeLocalValue(new Date()));
  const [manualDuration, setManualDuration] = useState("30");
  const [manualNotes, setManualNotes] = useState("");

  const [newPrescriptionTitle, setNewPrescriptionTitle] = useState("");
  const [newPrescriptionGuidance, setNewPrescriptionGuidance] = useState("");
  const [newPrescriptionItems, setNewPrescriptionItems] = useState<CreatePrescriptionItemRequest[]>([
    { medicationName: "", dosage: "", frequency: "", duration: "", route: "", notes: "" },
  ]);

  const petNameById = useMemo(() => new Map(pets.map((p) => [p.id, p.name])), [pets]);
  const serviceNameById = useMemo(() => new Map(services.map((s) => [s.id, s.name])), [services]);
  const vetNameById = useMemo(() => new Map(vets.map((v) => [v.id, v.name])), [vets]);

  const state = (location.state as LocationState | null) ?? null;

  const selectedType = selectedAppointment?.appointmentType;
  const selectedPetName = selectedAppointment?.petId ? petNameById.get(selectedAppointment.petId) : "-";

  function canHandle(type: AppointmentType) {
    if (!me?.role) return false;
    if (type === "VET") return me.role === "VET" || me.role === "ADMIN";
    return me.role === "RECEPTION" || me.role === "ADMIN" || me.role === "VET";
  }

  async function withApiError(action: () => Promise<void>, title: string) {
    try {
      await action();
    } catch (err) {
      showMessage({ title, message: getApiErrorMessage(err) ?? "Erro desconhecido", variant: "error" });
    }
  }

  async function loadReferences() {
    const [petsResult, productsResult, usersResult] = await Promise.allSettled([
      listPets({ page: 0, size: 300, sort: "name,asc", active: true }),
      listProducts({ page: 0, size: 300, sort: "name,asc", active: true }),
      listUsers({ page: 0, size: 300, sort: "name,asc", active: true }),
    ]);

    if (petsResult.status !== "fulfilled") {
      throw petsResult.reason;
    }
    if (productsResult.status !== "fulfilled") {
      throw productsResult.reason;
    }

    setPets(petsResult.value.content ?? []);
    setServices(productsResult.value.content ?? []);

    if (usersResult.status === "fulfilled") {
      setVets((usersResult.value.content ?? []).filter((u) => u.role === "VET" && u.active));
    } else if (me?.role === "VET" && me.active) {
      setVets([me]);
    } else {
      setVets([]);
    }
  }

  async function loadAppointmentsOfToday() {
    const today = toDateInputValue(new Date());
    const res = await listAppointments({
      page: 0,
      size: 200,
      sort: "scheduledStartAt,asc",
      scheduledFrom: startOfDayIso(today),
      scheduledTo: endOfDayIso(today),
      status: "OPEN",
    });

    setAppointments(res.content ?? []);
  }

  async function selectAppointment(id: number) {
    const appointment = await getAppointmentById(id);

    if (!canHandle(appointment.appointmentType)) {
      showMessage({ title: "Permissão", message: "Seu perfil não pode iniciar este tipo de atendimento.", variant: "warning" });
      return;
    }

    setSelectedAppointmentId(id);
    setSelectedAppointment(appointment);
    if (typeof window !== "undefined" && window.innerWidth < 1500) {
      setListVisible(false);
    }

    if (appointment.appointmentType === "VET") {
      try {
        const [mr, rx] = await Promise.all([getMedicalRecord(id), listPrescriptions(id)]);
        setMedical(mr);
        setPrescriptions((rx ?? []).map((r) => ({ id: r.id, title: r.title, createdAt: r.createdAt, itemCount: r.items?.length ?? 0 })));
      } catch {
        setMedical({});
        setPrescriptions([]);
      }
      setPetshopRecord({});
    } else {
      try {
        const rec = await getPetshopRecord(id);
        setPetshopRecord(rec);
      } catch {
        setPetshopRecord({});
      }
      setMedical({});
      setPrescriptions([]);
    }
  }

  async function handleLocationAction() {
    if (!state?.appointmentId || !state.action) return;

    if (state.action === "finish") {
      await finishAppointmentFlow(state.appointmentId!, { successMessage: "Atendimento finalizado com sucesso." });
      navigate("/agenda", { replace: true });
      return;
    }

    if (state.action === "cancel") {
      const ok = await confirm({
        title: "Desmarcar atendimento",
        message: "Deseja realmente desmarcar este atendimento?",
        confirmText: "Desmarcar",
        cancelText: "Cancelar",
        danger: true,
      });
      if (!ok) {
        navigate("/agenda", { replace: true });
        return;
      }

      await cancelAppointmentFlow(state.appointmentId!, {
        reason: "Cancelado pelo usuário na agenda",
        successMessage: "Atendimento desmarcado.",
      });
      navigate("/agenda", { replace: true });
      return;
    }

    await withApiError(async () => {
      await selectAppointment(state.appointmentId!);
    }, "Falha ao abrir atendimento");

    navigate(location.pathname, { replace: true, state: null });
  }

  useEffect(() => {
    document.title = "Atendimentos • VetCare Clinic";
  }, []);

  useEffect(() => {
    withApiError(async () => {
      await loadReferences();
      await loadAppointmentsOfToday();
      await handleLocationAction();
    }, "Falha ao carregar atendimento");
  }, []);

  async function finishAppointmentFlow(appointmentId: number, options?: { successMessage?: string }) {
    await withApiError(async () => {
      await finishAppointment(appointmentId);
      showMessage({ title: "Atendimento", message: options?.successMessage ?? "Atendimento finalizado.", variant: "success" });
    }, "Falha ao finalizar atendimento");
  }

  async function cancelAppointmentFlow(appointmentId: number, options: { reason: string; successMessage?: string }) {
    await withApiError(async () => {
      await cancelAppointment(appointmentId, options.reason);
      showMessage({ title: "Atendimento", message: options.successMessage ?? "Atendimento desmarcado.", variant: "success" });
    }, "Falha ao desmarcar atendimento");
  }

  async function handleFinishSelectedAppointment() {
    if (!selectedAppointment) return;
    await finishAppointmentFlow(selectedAppointment.id);
    await loadAppointmentsOfToday();
    setSelectedAppointment(null);
    setSelectedAppointmentId(null);
  }

  async function handleCancelSelectedAppointment() {
    if (!selectedAppointment) return;
    await cancelAppointmentFlow(selectedAppointment.id, { reason: "Cancelado no fluxo de atendimento" });
    await loadAppointmentsOfToday();
    setSelectedAppointment(null);
    setSelectedAppointmentId(null);
  }

  async function handleManualCreate() {
    const petId = Number(manualPetId);
    if (!petId) {
      showMessage({ title: "Atendimento manual", message: "Selecione um pet.", variant: "warning" });
      return;
    }

    if (!canHandle(manualType)) {
      showMessage({ title: "Permissão", message: "Seu perfil não pode iniciar este tipo de atendimento.", variant: "warning" });
      return;
    }

    const start = new Date(manualStart);
    const duration = Number(manualDuration || "30");
    const end = new Date(start.getTime() + duration * 60_000);

    const payload: OpenAppointmentRequest = {
      petId,
      appointmentType: manualType,
      scheduledStartAt: start.toISOString(),
      scheduledEndAt: end.toISOString(),
      notes: manualNotes.trim() || undefined,
      veterinarianUserId: manualType === "VET" ? (manualVetId ? Number(manualVetId) : me?.role === "VET" ? me.id : undefined) : undefined,
      serviceProductId: manualType === "PETSHOP" ? Number(manualServiceId || "0") || undefined : undefined,
      chiefComplaint: manualType === "VET" ? manualNotes.trim() || undefined : undefined,
    };

    await withApiError(async () => {
      const created = await createAppointment(payload);
      setShowManualModal(false);
      await loadAppointmentsOfToday();
      await selectAppointment(created.id);
      showMessage({ title: "Atendimento manual", message: "Atendimento criado e aberto.", variant: "success" });
    }, "Falha ao abrir atendimento manual");
  }

  async function handleSaveVetRecord() {
    if (!selectedAppointmentId) return;

    await withApiError(async () => {
      const saved = await upsertMedicalRecord(selectedAppointmentId, {
        chiefComplaint: medical.chiefComplaint ?? "",
        clinicalNotes: medical.clinicalNotes ?? "",
        weightKg: medical.weightKg ?? undefined,
        temperatureC: medical.temperatureC ?? undefined,
        heartRateBpm: medical.heartRateBpm ?? undefined,
        respiratoryRateRpm: medical.respiratoryRateRpm ?? undefined,
        initialAssessment: medical.initialAssessment ?? "",
        diagnosisSummary: medical.diagnosisSummary ?? "",
        treatmentPlan: medical.treatmentPlan ?? "",
        usedMedications: medical.usedMedications ?? "",
        hospitalizationIndicated: medical.hospitalizationIndicated ?? false,
        hospitalizationNotes: medical.hospitalizationNotes ?? "",
        dischargeInstructions: medical.dischargeInstructions ?? "",
        followUpAt: medical.followUpAt ?? undefined,
      });
      setMedical(saved);
      showMessage({ title: "Prontuário", message: "Prontuário atualizado.", variant: "success" });
    }, "Falha ao salvar prontuário");
  }

  async function handleSavePetshopRecord() {
    if (!selectedAppointmentId) return;

    await withApiError(async () => {
      const saved = await upsertPetshopRecord(selectedAppointmentId, {
        serviceReport: petshopRecord.serviceReport ?? "",
        productsUsed: petshopRecord.productsUsed ?? "",
        checkinNotes: petshopRecord.checkinNotes ?? "",
        checkoutNotes: petshopRecord.checkoutNotes ?? "",
        startedAt: petshopRecord.startedAt ?? undefined,
        finishedAt: petshopRecord.finishedAt ?? undefined,
      });
      setPetshopRecord(saved);
      showMessage({ title: "Serviço petshop", message: "Registro atualizado.", variant: "success" });
    }, "Falha ao salvar registro petshop");
  }

  async function handleAddDiagnosis() {
    if (!selectedAppointmentId || !newDiagnosis.trim()) return;

    await withApiError(async () => {
      await addDiagnosis(selectedAppointmentId, { description: newDiagnosis.trim(), primary: false });
      setNewDiagnosis("");
      showMessage({ title: "Prontuário", message: "Diagnóstico incluído.", variant: "success" });
    }, "Falha ao incluir diagnóstico");
  }

  async function handleAddProcedure() {
    if (!selectedAppointmentId || !newProcedure.trim()) return;

    await withApiError(async () => {
      await addProcedure(selectedAppointmentId, {
        description: newProcedure.trim(),
        notes: newProcedureNotes.trim() || undefined,
        performedAt: new Date().toISOString(),
      });
      setNewProcedure("");
      setNewProcedureNotes("");
      showMessage({ title: "Prontuário", message: "Procedimento incluído.", variant: "success" });
    }, "Falha ao incluir procedimento");
  }

  async function handleCreatePrescription() {
    if (!selectedAppointmentId) return;

    const validItems = newPrescriptionItems.filter((i) => i.medicationName.trim());
    if (validItems.length === 0) {
      showMessage({ title: "Receituário", message: "Informe pelo menos um medicamento.", variant: "warning" });
      return;
    }

    await withApiError(async () => {
      const created = await createPrescription(selectedAppointmentId, {
        title: newPrescriptionTitle.trim() || undefined,
        guidance: newPrescriptionGuidance.trim() || undefined,
        items: validItems,
      });
      setPrescriptions((prev) => [{ id: created.id, title: created.title, createdAt: created.createdAt, itemCount: created.items.length }, ...prev]);
      setNewPrescriptionTitle("");
      setNewPrescriptionGuidance("");
      setNewPrescriptionItems([{ medicationName: "", dosage: "", frequency: "", duration: "", route: "", notes: "" }]);
      showMessage({ title: "Receituário", message: "Prescrição criada.", variant: "success" });
    }, "Falha ao criar prescrição");
  }

  async function handleDownloadPrescription(prescriptionId: number) {
    if (!selectedAppointmentId) return;

    await withApiError(async () => {
      const blob = await downloadPrescriptionPdf(selectedAppointmentId, prescriptionId, "attachment");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `receita-${selectedAppointmentId}-${prescriptionId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }, "Falha ao baixar receita PDF");
  }

  async function handlePrintPrescription(prescriptionId: number) {
    if (!selectedAppointmentId) return;

    await withApiError(async () => {
      const blob = await downloadPrescriptionPdf(selectedAppointmentId, prescriptionId, "inline");
      const url = URL.createObjectURL(blob);
      const frame = document.createElement("iframe");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      frame.src = url;
      document.body.appendChild(frame);
      frame.onload = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          frame.remove();
        }, 1500);
      };
    }, "Falha ao imprimir receita PDF");
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerIntro}>
          <h1 className={styles.title}>Atendimentos</h1>
          <p className={styles.subtitle}>Fluxo clínico de consulta veterinária e execução de serviço petshop.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.secondaryBtn}
            onClick={() => navigate(`/estoque-insumos${selectedAppointmentId ? `?appointmentId=${selectedAppointmentId}` : ""}`)}
          >
            Consulta de estoque
          </button>
          <button className={styles.secondaryBtn} onClick={() => setListVisible((v) => !v)}>
            {listVisible ? "Ocultar lista" : "Mostrar lista"}
          </button>
          <button className={styles.primaryBtn} onClick={() => setShowManualModal(true)}>Atendimento manual</button>
        </div>
      </header>

      <div className={styles.workspace}>
        <article className={styles.content}>
          {!selectedAppointment && (
            <div className={styles.empty}>
              Selecione um atendimento aberto para iniciar.
            </div>
          )}

          {selectedAppointment && (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Resumo do atendimento</h2>
                <div className={styles.grid3}>
                  <div>
                    <div className={styles.pill}>#{selectedAppointment.id}</div>
                  </div>
                  <div>
                    <strong>Tipo:</strong> {selectedAppointment.appointmentType === "VET" ? "Consulta veterinária" : "Serviço petshop"}
                  </div>
                  <div>
                    <strong>Horário:</strong> {formatDateTime(selectedAppointment.scheduledStartAt)}
                  </div>
                  <div>
                    <strong>Pet:</strong> {selectedPetName ?? "-"}
                  </div>
                  <div>
                    <strong>Veterinário:</strong> {selectedAppointment.veterinarianUserId ? vetNameById.get(selectedAppointment.veterinarianUserId) ?? `#${selectedAppointment.veterinarianUserId}` : "-"}
                  </div>
                  <div>
                    <strong>Serviço:</strong> {selectedAppointment.serviceProductId ? serviceNameById.get(selectedAppointment.serviceProductId) ?? `#${selectedAppointment.serviceProductId}` : "-"}
                  </div>
                </div>
                <div className={styles.inlineActions}>
                  <button className={styles.secondaryBtn} onClick={() => void handleFinishSelectedAppointment()}>Finalizar</button>
                  <button className={styles.dangerBtn} onClick={() => void handleCancelSelectedAppointment()}>Desmarcar</button>
                </div>
              </section>

              {selectedType === "VET" && (
                <>
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Prontuário veterinário</h2>
                    <div className={styles.grid3}>
                      <label className={styles.field}>
                        <span>Peso (kg)</span>
                        <input
                          type="number"
                          step="0.001"
                          value={medical.weightKg ?? ""}
                          onChange={(e) => setMedical((prev) => ({ ...prev, weightKg: Number(e.target.value) || undefined }))}
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Temperatura (°C)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={medical.temperatureC ?? ""}
                          onChange={(e) => setMedical((prev) => ({ ...prev, temperatureC: Number(e.target.value) || undefined }))}
                        />
                      </label>
                      <label className={styles.field}>
                        <span>FC (bpm)</span>
                        <input
                          type="number"
                          value={medical.heartRateBpm ?? ""}
                          onChange={(e) => setMedical((prev) => ({ ...prev, heartRateBpm: Number(e.target.value) || undefined }))}
                        />
                      </label>
                    </div>

                    <div className={styles.grid2}>
                      <label className={styles.field}>
                        <span>Queixa principal</span>
                        <textarea value={medical.chiefComplaint ?? ""} onChange={(e) => setMedical((prev) => ({ ...prev, chiefComplaint: e.target.value }))} />
                      </label>
                      <label className={styles.field}>
                        <span>Cenário inicial / exame</span>
                        <textarea value={medical.initialAssessment ?? ""} onChange={(e) => setMedical((prev) => ({ ...prev, initialAssessment: e.target.value }))} />
                      </label>
                      <label className={styles.field}>
                        <span>Diagnóstico</span>
                        <textarea value={medical.diagnosisSummary ?? ""} onChange={(e) => setMedical((prev) => ({ ...prev, diagnosisSummary: e.target.value }))} />
                      </label>
                      <label className={styles.field}>
                        <span>Plano terapêutico</span>
                        <textarea value={medical.treatmentPlan ?? ""} onChange={(e) => setMedical((prev) => ({ ...prev, treatmentPlan: e.target.value }))} />
                      </label>
                      <label className={styles.field}>
                        <span>Medicações utilizadas</span>
                        <textarea value={medical.usedMedications ?? ""} onChange={(e) => setMedical((prev) => ({ ...prev, usedMedications: e.target.value }))} />
                      </label>
                      <label className={styles.field}>
                        <span>Orientações de alta</span>
                        <textarea value={medical.dischargeInstructions ?? ""} onChange={(e) => setMedical((prev) => ({ ...prev, dischargeInstructions: e.target.value }))} />
                      </label>
                    </div>

                    <div className={styles.inlineActions}>
                      <button className={styles.primaryBtn} onClick={handleSaveVetRecord}>Salvar prontuário</button>
                    </div>
                  </section>

                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Diagnóstico e procedimentos</h2>
                    <div className={styles.grid2}>
                      <label className={styles.field}>
                        <span>Novo diagnóstico</span>
                        <input value={newDiagnosis} onChange={(e) => setNewDiagnosis(e.target.value)} placeholder="Ex.: Dermatite alérgica" />
                      </label>
                      <div className={styles.inlineActions}>
                        <button className={styles.secondaryBtn} onClick={handleAddDiagnosis}>Adicionar diagnóstico</button>
                      </div>
                      <label className={styles.field}>
                        <span>Novo procedimento</span>
                        <input value={newProcedure} onChange={(e) => setNewProcedure(e.target.value)} placeholder="Ex.: Curativo" />
                      </label>
                      <label className={styles.field}>
                        <span>Notas do procedimento</span>
                        <input value={newProcedureNotes} onChange={(e) => setNewProcedureNotes(e.target.value)} placeholder="Detalhes" />
                      </label>
                    </div>
                    <div className={styles.inlineActions}>
                      <button className={styles.secondaryBtn} onClick={handleAddProcedure}>Adicionar procedimento</button>
                    </div>
                  </section>

                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Receituário</h2>
                    <label className={styles.field}>
                      <span>Título</span>
                      <input value={newPrescriptionTitle} onChange={(e) => setNewPrescriptionTitle(e.target.value)} placeholder="Receita clínica" />
                    </label>
                    <label className={styles.field}>
                      <span>Orientações gerais</span>
                      <textarea value={newPrescriptionGuidance} onChange={(e) => setNewPrescriptionGuidance(e.target.value)} placeholder="Recomendações para tutor" />
                    </label>

                    {newPrescriptionItems.map((item, idx) => (
                      <div key={idx} className={styles.grid3}>
                        <label className={styles.field}>
                          <span>Medicamento</span>
                          <input
                            value={item.medicationName}
                            onChange={(e) => setNewPrescriptionItems((prev) => prev.map((p, i) => (i === idx ? { ...p, medicationName: e.target.value } : p)))}
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Dosagem</span>
                          <input
                            value={item.dosage ?? ""}
                            onChange={(e) => setNewPrescriptionItems((prev) => prev.map((p, i) => (i === idx ? { ...p, dosage: e.target.value } : p)))}
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Frequência</span>
                          <input
                            value={item.frequency ?? ""}
                            onChange={(e) => setNewPrescriptionItems((prev) => prev.map((p, i) => (i === idx ? { ...p, frequency: e.target.value } : p)))}
                          />
                        </label>
                      </div>
                    ))}

                    <div className={styles.inlineActions}>
                      <button className={styles.primaryBtn} onClick={() => setNewPrescriptionItems((prev) => [...prev, { medicationName: "", dosage: "", frequency: "", duration: "", route: "", notes: "" }])}>Adicionar item</button>
                      <button className={styles.secondaryBtn} onClick={handleCreatePrescription}>Salvar prescrição</button>
                    </div>

                    <div>
                      {prescriptions.map((p) => (
                        <div key={p.id} className={styles.prescriptionRow}>
                          <div className={styles.pill}>#{p.id} • {p.title || "Sem título"} • {p.itemCount} itens • {formatDateTime(p.createdAt)}</div>
                          <div className={styles.inlineActions}>
                            <button className={styles.secondaryBtn} type="button" onClick={() => void handleDownloadPrescription(p.id)}>
                              Baixar PDF
                            </button>
                            <button className={styles.primaryBtn} type="button" onClick={() => void handlePrintPrescription(p.id)}>
                              Imprimir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {selectedType === "PETSHOP" && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Execução do serviço petshop</h2>
                  <div className={styles.grid2}>
                    <label className={styles.field}>
                      <span>Condição na entrada</span>
                      <textarea value={petshopRecord.checkinNotes ?? ""} onChange={(e) => setPetshopRecord((prev) => ({ ...prev, checkinNotes: e.target.value }))} />
                    </label>
                    <label className={styles.field}>
                      <span>Relato do serviço executado</span>
                      <textarea value={petshopRecord.serviceReport ?? ""} onChange={(e) => setPetshopRecord((prev) => ({ ...prev, serviceReport: e.target.value }))} />
                    </label>
                    <label className={styles.field}>
                      <span>Produtos/insumos usados</span>
                      <textarea value={petshopRecord.productsUsed ?? ""} onChange={(e) => setPetshopRecord((prev) => ({ ...prev, productsUsed: e.target.value }))} />
                    </label>
                    <label className={styles.field}>
                      <span>Condição na saída</span>
                      <textarea value={petshopRecord.checkoutNotes ?? ""} onChange={(e) => setPetshopRecord((prev) => ({ ...prev, checkoutNotes: e.target.value }))} />
                    </label>
                    <label className={styles.field}>
                      <span>Início</span>
                      <input type="datetime-local" value={petshopRecord.startedAt ? toDateTimeLocalValue(new Date(petshopRecord.startedAt)) : ""} onChange={(e) => setPetshopRecord((prev) => ({ ...prev, startedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} />
                    </label>
                    <label className={styles.field}>
                      <span>Fim</span>
                      <input type="datetime-local" value={petshopRecord.finishedAt ? toDateTimeLocalValue(new Date(petshopRecord.finishedAt)) : ""} onChange={(e) => setPetshopRecord((prev) => ({ ...prev, finishedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} />
                    </label>
                  </div>

                  <div className={styles.inlineActions}>
                    <button className={styles.primaryBtn} onClick={handleSavePetshopRecord}>Salvar execução do serviço</button>
                  </div>
                </section>
              )}
            </>
          )}
        </article>
      </div>

      {listVisible && <button className={styles.drawerBackdrop} onClick={() => setListVisible(false)} aria-label="Fechar lista" />}

      <aside className={`${styles.drawer} ${listVisible ? styles.drawerOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <span>Abertos hoje</span>
          <button className={styles.secondaryBtn} onClick={() => setListVisible(false)}>Fechar</button>
        </div>
        <div className={styles.list}>
          {appointments.length === 0 && <div className={styles.empty}>Sem atendimentos abertos para hoje.</div>}
          {appointments.map((a) => (
            <button
              key={a.id}
              className={`${styles.item} ${selectedAppointmentId === a.id ? styles.itemActive : ""}`}
              onClick={() => withApiError(async () => selectAppointment(a.id), "Falha ao abrir atendimento")}
            >
              <div className={styles.itemTop}>
                <span>#{a.id}</span>
                <span>{a.appointmentType === "VET" ? "VET" : "PETSHOP"}</span>
              </div>
              <div className={styles.itemPet}>{petNameById.get(a.petId) ?? `Pet #${a.petId}`}</div>
              <div className={styles.itemMeta}>{formatDateTime(a.scheduledStartAt)}</div>
            </button>
          ))}
        </div>
      </aside>

      {showManualModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h2 className={styles.sectionTitle}>Novo atendimento manual</h2>

            <div className={styles.grid2}>
              <label className={styles.field}>
                <span>Tipo</span>
                <select value={manualType} onChange={(e) => setManualType(e.target.value as AppointmentType)}>
                  <option value="VET">Consulta veterinária</option>
                  <option value="PETSHOP">Serviço petshop</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Pet</span>
                <select value={manualPetId} onChange={(e) => setManualPetId(e.target.value)}>
                  <option value="">Selecione</option>
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>

              {manualType === "VET" && (
                <label className={styles.field}>
                  <span>Veterinário (opcional)</span>
                  <select value={manualVetId} onChange={(e) => setManualVetId(e.target.value)}>
                    <option value="">Automático / não atribuído</option>
                    {vets.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {manualType === "PETSHOP" && (
                <label className={styles.field}>
                  <span>Serviço</span>
                  <select value={manualServiceId} onChange={(e) => setManualServiceId(e.target.value)}>
                    <option value="">Selecione</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </label>
              )}

              <label className={styles.field}>
                <span>Início</span>
                <input type="datetime-local" value={manualStart} onChange={(e) => setManualStart(e.target.value)} />
              </label>

              <label className={styles.field}>
                <span>Duração (min)</span>
                <input type="number" min={10} step={5} value={manualDuration} onChange={(e) => setManualDuration(e.target.value)} />
              </label>
            </div>

            <label className={styles.field}>
              <span>Observações</span>
              <textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} />
            </label>

            <div className={styles.inlineActions}>
              <button className={styles.primaryBtn} onClick={handleManualCreate}>Abrir atendimento</button>
              <button className={styles.dangerBtn} onClick={() => setShowManualModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
