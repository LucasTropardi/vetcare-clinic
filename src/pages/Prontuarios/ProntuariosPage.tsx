import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ClockCounterClockwiseIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  PawPrintIcon,
  PrinterIcon,
  ScissorsIcon,
  StethoscopeIcon,
} from "@phosphor-icons/react";
import styles from "./ProntuariosPage.module.css";
import { showMessage } from "../../store/message.store";
import { getApiErrorMessage } from "../../services/api/errors";
import { useNaming } from "../../i18n/useNaming";
import { listPets } from "../../services/api/pets.service";
import { listProducts } from "../../services/api/products.service";
import { listUsers } from "../../services/api/users.service";
import {
  downloadPrescriptionPdf,
  getMedicalRecord,
  getPetshopRecord,
  listAppointments,
  listPrescriptions,
} from "../../services/api/appointments.service";
import type {
  AppointmentResponse,
  AppointmentStatus,
  AppointmentType,
  MedicalRecordResponse,
  PetListItemResponse,
  PetshopRecordResponse,
  PrescriptionResponse,
  ProductListItemResponse,
  UserResponseWithRole,
} from "../../services/api/types";

type StatusFilter = AppointmentStatus | "ALL";
type TypeFilter = AppointmentType | "ALL";

type AppointmentDetailsState = {
  loaded: boolean;
  loading: boolean;
  medical: MedicalRecordResponse | null;
  petshop: PetshopRecordResponse | null;
  prescriptions: PrescriptionResponse[];
  error?: string;
};

function formatDateTime(value?: string | null, locale = "pt-BR") {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString(locale);
  } catch {
    return value;
  }
}

function formatDate(value?: string | null, locale = "pt-BR") {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(locale);
  } catch {
    return value;
  }
}

function textOrDash(value?: string | number | null) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" && value.trim().length === 0) return "-";
  return String(value);
}

function getStatusLabel(status: AppointmentStatus, naming: ReturnType<typeof useNaming>) {
  if (status === "OPEN") return naming.t("prontuarios.timeline.status.open");
  if (status === "FINISHED") return naming.t("prontuarios.timeline.status.finished");
  return naming.t("prontuarios.timeline.status.canceled");
}

export function ProntuariosPage() {
  const naming = useNaming();
  const location = useLocation();
  const navigate = useNavigate();
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [pets, setPets] = useState<PetListItemResponse[]>([]);
  const [products, setProducts] = useState<ProductListItemResponse[]>([]);
  const [users, setUsers] = useState<UserResponseWithRole[]>([]);

  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [searchPet, setSearchPet] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [expandedAppointmentIds, setExpandedAppointmentIds] = useState<number[]>([]);
  const [detailsByAppointmentId, setDetailsByAppointmentId] = useState<Record<number, AppointmentDetailsState>>({});
  const dateLocale = naming.getLang() === "en" ? "en-US" : naming.getLang() === "es" ? "es-ES" : "pt-BR";

  const petsById = useMemo(() => new Map(pets.map((pet) => [pet.id, pet])), [pets]);
  const productNameById = useMemo(() => new Map(products.map((product) => [product.id, product.name])), [products]);
  const userNameById = useMemo(() => new Map(users.map((user) => [user.id, user.name])), [users]);

  const selectedPet = selectedPetId ? petsById.get(selectedPetId) : undefined;

  const visiblePets = useMemo(() => {
    const normalized = searchPet.trim().toLowerCase();
    if (!normalized) return pets;

    return pets.filter((pet) => {
      return (
        pet.name.toLowerCase().includes(normalized) ||
        (pet.tutorName ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [pets, searchPet]);

  const historyStats = useMemo(() => {
    return {
      total: appointments.length,
      vet: appointments.filter((a) => a.appointmentType === "VET").length,
      petshop: appointments.filter((a) => a.appointmentType === "PETSHOP").length,
      finished: appointments.filter((a) => a.status === "FINISHED").length,
    };
  }, [appointments]);

  const statusFilters: Array<{ key: StatusFilter; label: string }> = [
    { key: "ALL", label: naming.t("prontuarios.filters.status.all") },
    { key: "OPEN", label: naming.t("prontuarios.filters.status.open") },
    { key: "FINISHED", label: naming.t("prontuarios.filters.status.finished") },
    { key: "CANCELED", label: naming.t("prontuarios.filters.status.canceled") },
  ];

  const typeFilters: Array<{ key: TypeFilter; label: string }> = [
    { key: "ALL", label: naming.t("prontuarios.filters.type.all") },
    { key: "VET", label: naming.t("prontuarios.filters.type.vet") },
    { key: "PETSHOP", label: naming.t("prontuarios.filters.type.petshop") },
  ];

  const withApiError = useCallback(async (action: () => Promise<void>, title: string) => {
    try {
      await action();
    } catch (err) {
      const message = getApiErrorMessage(err) ?? naming.getMessage("unknown");
      showMessage({ title, message, variant: "error" });
    }
  }, [naming]);

  const loadReferences = useCallback(async () => {
    setLoadingRefs(true);
    await withApiError(async () => {
      const [petsResult, productsResult, usersResult] = await Promise.allSettled([
        listPets({ page: 0, size: 500, sort: "name,asc" }),
        listProducts({ page: 0, size: 500, sort: "name,asc" }),
        listUsers({ page: 0, size: 500, sort: "name,asc" }),
      ]);

      if (petsResult.status !== "fulfilled") {
        throw petsResult.reason;
      }
      if (productsResult.status !== "fulfilled") {
        throw productsResult.reason;
      }

      setPets(petsResult.value.content ?? []);
      setProducts(productsResult.value.content ?? []);

      if (usersResult.status === "fulfilled") {
        setUsers(usersResult.value.content ?? []);
      } else {
        setUsers([]);
      }
    }, naming.t("prontuarios.messages.loadRefsError"));
    setLoadingRefs(false);
  }, [naming, withApiError]);

  const loadAppointmentsHistory = useCallback(async (petId: number) => {
    setLoadingHistory(true);
    await withApiError(async () => {
      const size = 200;
      let page = 0;
      let totalPages = 1;
      const loaded: AppointmentResponse[] = [];

      while (page < totalPages) {
        const res = await listAppointments({
          page,
          size,
          sort: "scheduledStartAt,desc",
          petId,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          appointmentType: typeFilter === "ALL" ? undefined : typeFilter,
        });
        loaded.push(...(res.content ?? []));
        totalPages = res.totalPages ?? 0;
        page += 1;
      }

      loaded.sort((a, b) => new Date(b.scheduledStartAt).getTime() - new Date(a.scheduledStartAt).getTime());
      setAppointments(loaded);
      setExpandedAppointmentIds([]);
      setDetailsByAppointmentId({});
    }, naming.t("prontuarios.messages.loadHistoryError"));
    setLoadingHistory(false);
  }, [naming, statusFilter, typeFilter, withApiError]);

  useEffect(() => {
    document.title = `${naming.t("prontuarios.title")} • ${naming.getApp("name")}`;
  }, [naming]);

  useEffect(() => {
    void loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    if (!selectedPetId) return;
    void loadAppointmentsHistory(selectedPetId);
  }, [selectedPetId, loadAppointmentsHistory]);

  useEffect(() => {
    const state = (location.state as { petId?: number } | null) ?? null;
    if (!state?.petId) return;
    setSelectedPetId(state.petId);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  async function loadAppointmentDetails(appointment: AppointmentResponse) {
    const current = detailsByAppointmentId[appointment.id];
    if (current?.loading || current?.loaded) return;

    setDetailsByAppointmentId((prev) => ({
      ...prev,
      [appointment.id]: {
        loaded: false,
        loading: true,
        medical: null,
        petshop: null,
        prescriptions: [],
      },
    }));

    if (appointment.appointmentType === "VET") {
      const [medicalResult, prescriptionsResult] = await Promise.allSettled([
        getMedicalRecord(appointment.id),
        listPrescriptions(appointment.id),
      ]);

      setDetailsByAppointmentId((prev) => ({
        ...prev,
        [appointment.id]: {
          loaded: true,
          loading: false,
          medical: medicalResult.status === "fulfilled" ? medicalResult.value : null,
          petshop: null,
          prescriptions: prescriptionsResult.status === "fulfilled" ? prescriptionsResult.value : [],
          error:
            medicalResult.status === "rejected" && prescriptionsResult.status === "rejected"
              ? naming.t("prontuarios.messages.detailsUnavailableAppointment")
              : undefined,
        },
      }));
      return;
    }

    const petshopResult = await getPetshopRecord(appointment.id)
      .then((data) => ({ ok: true as const, data }))
      .catch(() => ({ ok: false as const }));

    setDetailsByAppointmentId((prev) => ({
      ...prev,
      [appointment.id]: {
        loaded: true,
        loading: false,
        medical: null,
        petshop: petshopResult.ok ? petshopResult.data : null,
        prescriptions: [],
        error: petshopResult.ok ? undefined : naming.t("prontuarios.messages.detailsUnavailableService"),
      },
    }));
  }

  function toggleAppointment(appointment: AppointmentResponse) {
    const isOpen = expandedAppointmentIds.includes(appointment.id);
    setExpandedAppointmentIds((prev) =>
      isOpen ? prev.filter((id) => id !== appointment.id) : [...prev, appointment.id]
    );

    if (!isOpen) {
      void loadAppointmentDetails(appointment);
    }
  }

  async function handleDownloadPrescription(appointmentId: number, prescriptionId: number) {
    await withApiError(async () => {
      const blob = await downloadPrescriptionPdf(appointmentId, prescriptionId, "attachment");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `receita-${appointmentId}-${prescriptionId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }, naming.t("prontuarios.messages.downloadPdfError"));
  }

  async function handlePrintPrescription(appointmentId: number, prescriptionId: number) {
    await withApiError(async () => {
      const blob = await downloadPrescriptionPdf(appointmentId, prescriptionId, "inline");
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
    }, naming.t("prontuarios.messages.printPdfError"));
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{naming.t("prontuarios.title")}</h1>
          <p className={styles.subtitle}>{naming.t("prontuarios.subtitle")}</p>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.petsPanel}>
          <div className={styles.petsHeader}>
            <h2>{naming.t("prontuarios.patients.title")}</h2>
            <span>{visiblePets.length}</span>
          </div>

          <label className={styles.searchField}>
            <MagnifyingGlassIcon size={16} />
            <input
              type="search"
              placeholder={naming.t("prontuarios.patients.searchPlaceholder")}
              value={searchPet}
              onChange={(e) => setSearchPet(e.target.value)}
            />
          </label>

          <div className={styles.petsList}>
            {loadingRefs && <div className={styles.emptyText}>{naming.t("prontuarios.states.loadingPatients")}</div>}
            {!loadingRefs && visiblePets.length === 0 && <div className={styles.emptyText}>{naming.t("prontuarios.states.noPatientsFound")}</div>}
            {!loadingRefs &&
              visiblePets.map((pet) => {
                const selected = pet.id === selectedPetId;
                return (
                  <button
                    key={pet.id}
                    type="button"
                    className={`${styles.petButton} ${selected ? styles.petButtonActive : ""}`}
                    onClick={() => setSelectedPetId(pet.id)}
                  >
                    <div className={styles.petTop}>
                      <span className={styles.petName}>{pet.name}</span>
                      <span className={styles.petSpecies}>{pet.species}</span>
                    </div>
                    <div className={styles.petMeta}>{naming.t("prontuarios.labels.tutor", { value: pet.tutorName ?? `#${pet.tutorId}` })}</div>
                  </button>
                );
              })}
          </div>
        </aside>

        <article className={styles.contentPanel}>
          {!selectedPet && (
            <div className={styles.emptyState}>
              <div>
                <PawPrintIcon size={45} />
                <h2>{naming.t("prontuarios.empty.selectPatientTitle")}</h2>
                <p>{naming.t("prontuarios.empty.selectPatientDescription")}</p>
              </div>
            </div>
          )}

          {selectedPet && (
            <>
              <section className={styles.contextBar}>
                <div className={styles.patientIdentity}>
                  <h2>{selectedPet.name}</h2>
                  <div>
                    <span>{selectedPet.species}</span>
                    <span>{naming.t("prontuarios.labels.tutor", { value: selectedPet.tutorName ?? `#${selectedPet.tutorId}` })}</span>
                  </div>
                </div>

                <div className={styles.filtersGroup}>
                  <div className={styles.filterRow}>
                    {statusFilters.map((filter) => (
                      <button
                        key={filter.key}
                        type="button"
                        className={`${styles.filterPill} ${statusFilter === filter.key ? styles.filterPillActive : ""}`}
                        onClick={() => setStatusFilter(filter.key)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <div className={styles.filterRow}>
                    {typeFilters.map((filter) => (
                      <button
                        key={filter.key}
                        type="button"
                        className={`${styles.filterPill} ${typeFilter === filter.key ? styles.filterPillActive : ""}`}
                        onClick={() => setTypeFilter(filter.key)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span>{naming.t("prontuarios.stats.totalHistory")}</span>
                  <strong>{historyStats.total}</strong>
                </div>
                <div className={styles.statCard}>
                  <span>{naming.t("prontuarios.stats.vetConsultations")}</span>
                  <strong>{historyStats.vet}</strong>
                </div>
                <div className={styles.statCard}>
                  <span>{naming.t("prontuarios.stats.petshopServices")}</span>
                  <strong>{historyStats.petshop}</strong>
                </div>
                <div className={styles.statCard}>
                  <span>{naming.t("prontuarios.stats.finished")}</span>
                  <strong>{historyStats.finished}</strong>
                </div>
              </section>

              <section className={styles.timeline}>
                {loadingHistory && <div className={styles.emptyText}>{naming.t("prontuarios.states.loadingHistory")}</div>}
                {!loadingHistory && appointments.length === 0 && (
                  <div className={styles.emptyText}>{naming.t("prontuarios.states.noHistoryForFilters")}</div>
                )}

                {!loadingHistory &&
                  appointments.map((appointment) => {
                    const details = detailsByAppointmentId[appointment.id];
                    const open = expandedAppointmentIds.includes(appointment.id);
                    const typeLabel = appointment.appointmentType === "VET"
                      ? naming.t("prontuarios.timeline.type.vet")
                      : naming.t("prontuarios.timeline.type.petshop");

                    return (
                      <article key={appointment.id} className={styles.timelineItem}>
                        <button type="button" className={styles.timelineButton} onClick={() => toggleAppointment(appointment)}>
                          <div className={styles.timelineHeading}>
                            <div className={styles.timelineBadges}>
                              <span className={styles.idBadge}>#{appointment.id}</span>
                              <span className={`${styles.kindBadge} ${appointment.appointmentType === "VET" ? styles.kindVet : styles.kindPetshop}`}>
                                {appointment.appointmentType === "VET" ? <StethoscopeIcon size={14} /> : <ScissorsIcon size={14} />}
                                {typeLabel}
                              </span>
                              <span
                                className={`${styles.statusBadge} ${
                                  appointment.status === "OPEN"
                                    ? styles.statusOpen
                                    : appointment.status === "FINISHED"
                                      ? styles.statusFinished
                                      : styles.statusCanceled
                                }`}
                              >
                                {getStatusLabel(appointment.status, naming)}
                              </span>
                            </div>
                            <span className={styles.when}>
                              <ClockCounterClockwiseIcon size={14} />
                              {formatDateTime(appointment.scheduledStartAt, dateLocale)}
                            </span>
                          </div>

                          <div className={styles.timelineMeta}>
                            <span>{naming.t("prontuarios.timeline.veterinarian", { value: appointment.veterinarianUserId ? userNameById.get(appointment.veterinarianUserId) ?? `#${appointment.veterinarianUserId}` : "-" })}</span>
                            <span>{naming.t("prontuarios.timeline.service", { value: appointment.serviceProductId ? productNameById.get(appointment.serviceProductId) ?? `#${appointment.serviceProductId}` : "-" })}</span>
                          </div>

                          {appointment.notes && <p className={styles.notes}>{naming.t("prontuarios.timeline.notes", { value: appointment.notes })}</p>}
                          {appointment.cancelReason && <p className={styles.notes}>{naming.t("prontuarios.timeline.cancelReason", { value: appointment.cancelReason })}</p>}

                          <span className={styles.expandHint}>
                            {open ? naming.t("prontuarios.timeline.hideDetails") : naming.t("prontuarios.timeline.showDetails")}
                          </span>
                        </button>

                        {open && (
                          <div className={styles.detailPanel}>
                            {details?.loading && <div className={styles.emptyText}>{naming.t("prontuarios.states.loadingDetails")}</div>}
                            {!details?.loading && details?.error && <div className={styles.warningText}>{details.error}</div>}

                            {!details?.loading && appointment.appointmentType === "VET" && (
                              <>
                                <section className={styles.detailSection}>
                                  <h3><FileTextIcon size={16} /> {naming.t("prontuarios.details.clinicalRecord")}</h3>
                                  <div className={styles.fieldGrid}>
                                    <div>
                                      <span>{naming.t("prontuarios.details.fields.chiefComplaint")}</span>
                                      <p>{textOrDash(details?.medical?.chiefComplaint)}</p>
                                    </div>
                                    <div>
                                      <span>{naming.t("prontuarios.details.fields.initialAssessment")}</span>
                                      <p>{textOrDash(details?.medical?.initialAssessment)}</p>
                                    </div>
                                    <div>
                                      <span>{naming.t("prontuarios.details.fields.diagnosis")}</span>
                                      <p>{textOrDash(details?.medical?.diagnosisSummary)}</p>
                                    </div>
                                    <div>
                                      <span>{naming.t("prontuarios.details.fields.treatmentPlan")}</span>
                                      <p>{textOrDash(details?.medical?.treatmentPlan)}</p>
                                    </div>
                                    <div>
                                      <span>{naming.t("prontuarios.details.fields.usedMedications")}</span>
                                      <p>{textOrDash(details?.medical?.usedMedications)}</p>
                                    </div>
                                    <div>
                                      <span>{naming.t("prontuarios.details.fields.dischargeInstructions")}</span>
                                      <p>{textOrDash(details?.medical?.dischargeInstructions)}</p>
                                    </div>
                                  </div>
                                  <div className={styles.metricsRow}>
                                    <span>{naming.t("prontuarios.details.metrics.weight", { value: details?.medical?.weightKg ? `${details.medical.weightKg} kg` : "-" })}</span>
                                    <span>{naming.t("prontuarios.details.metrics.temperature", { value: details?.medical?.temperatureC ? `${details.medical.temperatureC} °C` : "-" })}</span>
                                    <span>{naming.t("prontuarios.details.metrics.heartRate", { value: details?.medical?.heartRateBpm ? `${details.medical.heartRateBpm} bpm` : "-" })}</span>
                                    <span>{naming.t("prontuarios.details.metrics.respiratoryRate", { value: details?.medical?.respiratoryRateRpm ? `${details.medical.respiratoryRateRpm} rpm` : "-" })}</span>
                                    <span>{naming.t("prontuarios.details.metrics.followUp", { value: formatDate(details?.medical?.followUpAt, dateLocale) })}</span>
                                  </div>
                                </section>

                                <section className={styles.detailSection}>
                                  <h3>{naming.t("prontuarios.details.prescriptionsIssued")}</h3>
                                  {details?.prescriptions.length === 0 && (
                                    <div className={styles.emptyText}>{naming.t("prontuarios.states.noPrescriptionsInAppointment")}</div>
                                  )}

                                  {details?.prescriptions.map((prescription) => (
                                    <article key={prescription.id} className={styles.prescriptionCard}>
                                      <div className={styles.prescriptionTop}>
                                        <div>
                                          <strong>{prescription.title || naming.t("prontuarios.prescriptions.defaultTitle")}</strong>
                                          <p>
                                            {naming.t("prontuarios.prescriptions.createdAtValidity", {
                                              createdAt: formatDateTime(prescription.createdAt, dateLocale),
                                              validUntil: formatDate(prescription.validUntil, dateLocale),
                                            })}
                                          </p>
                                        </div>
                                        <div className={styles.inlineActions}>
                                          <button
                                            type="button"
                                            className={styles.secondaryBtn}
                                            onClick={() => void handleDownloadPrescription(appointment.id, prescription.id)}
                                          >
                                            <DownloadSimpleIcon size={15} />
                                            {naming.t("prontuarios.prescriptions.download")}
                                          </button>
                                          <button
                                            type="button"
                                            className={styles.primaryBtn}
                                            onClick={() => void handlePrintPrescription(appointment.id, prescription.id)}
                                          >
                                            <PrinterIcon size={15} />
                                            {naming.t("prontuarios.prescriptions.reprint")}
                                          </button>
                                        </div>
                                      </div>

                                      {prescription.guidance && (
                                        <div className={styles.guidance}>
                                          <span>{naming.t("prontuarios.prescriptions.guidanceLabel")}</span>
                                          <p>{prescription.guidance}</p>
                                        </div>
                                      )}

                                      <div className={styles.itemsList}>
                                        {prescription.items.map((item) => (
                                          <div key={item.id} className={styles.itemRow}>
                                            <strong>{item.medicationName}</strong>
                                            <span>
                                              {textOrDash(item.dosage)} • {textOrDash(item.frequency)} • {textOrDash(item.duration)}
                                            </span>
                                            <span>{naming.t("prontuarios.prescriptions.route", { value: textOrDash(item.route) })}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </article>
                                  ))}
                                </section>
                              </>
                            )}

                            {!details?.loading && appointment.appointmentType === "PETSHOP" && (
                              <section className={styles.detailSection}>
                                <h3><ScissorsIcon size={16} /> {naming.t("prontuarios.details.serviceRecord")}</h3>
                                <div className={styles.fieldGrid}>
                                  <div>
                                    <span>{naming.t("prontuarios.details.fields.checkinNotes")}</span>
                                    <p>{textOrDash(details?.petshop?.checkinNotes)}</p>
                                  </div>
                                  <div>
                                    <span>{naming.t("prontuarios.details.fields.serviceReport")}</span>
                                    <p>{textOrDash(details?.petshop?.serviceReport)}</p>
                                  </div>
                                  <div>
                                    <span>{naming.t("prontuarios.details.fields.productsUsed")}</span>
                                    <p>{textOrDash(details?.petshop?.productsUsed)}</p>
                                  </div>
                                  <div>
                                    <span>{naming.t("prontuarios.details.fields.checkoutNotes")}</span>
                                    <p>{textOrDash(details?.petshop?.checkoutNotes)}</p>
                                  </div>
                                </div>
                                <div className={styles.metricsRow}>
                                  <span>{naming.t("prontuarios.details.metrics.start", { value: formatDateTime(details?.petshop?.startedAt, dateLocale) })}</span>
                                  <span>{naming.t("prontuarios.details.metrics.end", { value: formatDateTime(details?.petshop?.finishedAt, dateLocale) })}</span>
                                  <span>
                                    {naming.t("prontuarios.details.metrics.responsible", { value: details?.petshop?.attendedByUserId ? userNameById.get(details.petshop.attendedByUserId) ?? `#${details.petshop.attendedByUserId}` : "-" })}
                                  </span>
                                </div>
                              </section>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
              </section>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
