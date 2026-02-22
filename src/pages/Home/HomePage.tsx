import { useEffect, useMemo, useState } from "react";
import { CheckCircleIcon, ClockIcon, PlayCircleIcon, ScissorsIcon, StethoscopeIcon, XCircleIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useNaming } from "../../i18n/useNaming";
import { DateInputBR } from "../../components/DateInputBR/DateInputBR";
import { listAppointments } from "../../services/api/appointments.service";
import { listPets } from "../../services/api/pets.service";
import { listProducts } from "../../services/api/products.service";
import { getApiErrorMessage } from "../../services/api/errors";
import type { AppointmentResponse, AppointmentStatus, AppointmentType } from "../../services/api/types";
import { showMessage } from "../../store/message.store";
import styles from "./HomePage.module.css";

type StatusFilter = "OPEN" | "FINISHED" | "CANCELED" | "ALL";

type AgendaItem = {
  id: number;
  type: AppointmentType;
  petName: string;
  tutorName: string;
  serviceName?: string;
  scheduledDate: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes?: string;
};

function toDateInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}

function startOfDayIso(dateInput: string) {
  return new Date(`${dateInput}T00:00:00`).toISOString();
}

function endOfDayIso(dateInput: string) {
  return new Date(`${dateInput}T23:59:59`).toISOString();
}

const TODAY = toDateInputValue(new Date());

function getStatusClass(status: AppointmentStatus) {
  if (status === "FINISHED") return "finished";
  if (status === "CANCELED") return "canceled";
  return "open";
}

function getStatusLabel(naming: ReturnType<typeof useNaming>, status: AppointmentStatus) {
  if (status === "FINISHED") return naming.t("agenda.status.finished");
  if (status === "CANCELED") return naming.t("agenda.status.canceled");
  return naming.t("agenda.status.open");
}

function toAgendaItem(
  a: AppointmentResponse,
  petNameById: Map<number, string>,
  serviceById: Map<number, string>
): AgendaItem {
  const dt = new Date(a.scheduledStartAt);
  const date = Number.isNaN(dt.getTime()) ? TODAY : toDateInputValue(dt);
  const at = Number.isNaN(dt.getTime()) ? "--:--" : dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return {
    id: a.id,
    type: a.appointmentType,
    petName: petNameById.get(a.petId) ?? `Pet #${a.petId}`,
    tutorName: "-",
    serviceName: a.serviceProductId ? serviceById.get(a.serviceProductId) ?? `Serviço #${a.serviceProductId}` : undefined,
    scheduledDate: date,
    scheduledAt: at,
    status: a.status,
    notes: a.notes ?? undefined,
  };
}

export function HomePage() {
  const naming = useNaming();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN");
  const [loading, setLoading] = useState(false);

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [petNameById, setPetNameById] = useState<Map<number, string>>(new Map());
  const [serviceById, setServiceById] = useState<Map<number, string>>(new Map());

  const statusPills: Array<{ key: StatusFilter; label: string }> = [
    { key: "OPEN", label: naming.t("agenda.filters.showOpen") },
    { key: "FINISHED", label: naming.t("agenda.filters.showFinished") },
    { key: "CANCELED", label: naming.t("agenda.filters.showCanceled") },
    { key: "ALL", label: naming.t("agenda.filters.showAll") },
  ];

  function getStatusPillKindClass(key: StatusFilter) {
    if (key === "OPEN") return styles.pillOpen;
    if (key === "FINISHED") return styles.pillFinished;
    if (key === "CANCELED") return styles.pillCanceled;
    return styles.pillAll;
  }

  const filtered = useMemo(() => {
    return appointments
      .map((a) => toAgendaItem(a, petNameById, serviceById))
      .filter((item) => {
        if (item.scheduledDate !== selectedDate) return false;
        if (statusFilter === "ALL") return true;
        return item.status === statusFilter;
      });
  }, [appointments, petNameById, serviceById, selectedDate, statusFilter]);

  const vetAppointments = useMemo(() => filtered.filter((item) => item.type === "VET"), [filtered]);
  const petshopAppointments = useMemo(() => filtered.filter((item) => item.type === "PETSHOP"), [filtered]);

  useEffect(() => {
    document.title = `${naming.t("agenda.title")} • ${naming.getApp("name")}`;
  }, [naming]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [petsRes, productsRes] = await Promise.all([
          listPets({ page: 0, size: 400, sort: "name,asc", active: true }),
          listProducts({ page: 0, size: 400, sort: "name,asc", active: true }),
        ]);

        setPetNameById(new Map((petsRes.content ?? []).map((p) => [p.id, p.name])));
        setServiceById(new Map((productsRes.content ?? []).map((p) => [p.id, p.name])));
      } catch (err) {
        showMessage({ title: "Agenda", message: getApiErrorMessage(err), variant: "error" });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await listAppointments({
          page: 0,
          size: 300,
          sort: "scheduledStartAt,asc",
          scheduledFrom: startOfDayIso(selectedDate),
          scheduledTo: endOfDayIso(selectedDate),
          status: statusFilter === "ALL" ? undefined : statusFilter,
        });
        setAppointments(res.content ?? []);
      } catch (err) {
        showMessage({ title: "Agenda", message: getApiErrorMessage(err), variant: "error" });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [selectedDate, statusFilter]);

  function goToAttendimentos(action: "start" | "finish" | "cancel", item: AgendaItem) {
    navigate("/atendimentos", {
      state: {
        fromAgenda: true,
        action,
        appointmentId: item.id,
        type: item.type,
      },
    });
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{naming.t("agenda.title")}</h1>
          <p className={styles.subtitle}>{naming.t("agenda.subtitle")}</p>
        </div>
      </header>

      <section className={styles.filtersPanel}>
        <div className={styles.filterDateBlock}>
          <label htmlFor="agenda-date" className={styles.filterLabel}>{naming.t("agenda.filters.date")}</label>
          <div className={styles.dateControls}>
            <DateInputBR
              id="agenda-date"
              ariaLabel={naming.t("agenda.filters.date")}
              inputClassName={styles.dateInput}
              value={selectedDate}
              onChange={setSelectedDate}
            />
            <button className={styles.todayBtn} onClick={() => setSelectedDate(TODAY)}>
              {naming.t("agenda.filters.today")}
            </button>
          </div>
        </div>

        <div className={styles.filterStatusBlock}>
          <div className={styles.filterLabel}>{naming.t("agenda.filters.status")}</div>
          <div className={styles.statusPills}>
            {statusPills.map((pill) => (
              <button
                key={pill.key}
                className={`${styles.statusPill} ${getStatusPillKindClass(pill.key)} ${statusFilter === pill.key ? styles.statusPillActive : ""}`}
                onClick={() => setStatusFilter(pill.key)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.columns}>
        <section className={styles.column}>
          <div className={styles.columnHeader}>
            <div className={styles.columnTitleWrap}>
              <StethoscopeIcon size={18} />
              <h2>{naming.t("agenda.sections.vet")}</h2>
            </div>
            <span className={styles.count}>{vetAppointments.length}</span>
          </div>

          <div className={styles.cards}>
            {loading && <div className={styles.empty}>Carregando...</div>}
            {!loading && vetAppointments.length === 0 && <div className={styles.empty}>{naming.t("agenda.empty")}</div>}
            {vetAppointments.map((item) => (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <div className={styles.petName}>{item.petName}</div>
                    <div className={styles.meta}>{naming.t("agenda.labels.tutor")}: {item.tutorName}</div>
                  </div>
                  <div className={styles.timeBadge}>
                    <ClockIcon size={14} />
                    <span>{item.scheduledAt}</span>
                  </div>
                </div>

                <div className={`${styles.status} ${styles[getStatusClass(item.status)]}`}>{getStatusLabel(naming, item.status)}</div>
                {item.notes && <div className={styles.notes}>{item.notes}</div>}

                <div className={styles.actions}>
                  <button className={styles.primaryAction} onClick={() => goToAttendimentos("start", item)}>
                    <PlayCircleIcon size={16} />
                    <span>{naming.t("agenda.actions.start")}</span>
                  </button>
                  <button className={styles.secondaryAction} onClick={() => goToAttendimentos("finish", item)}>
                    <CheckCircleIcon size={16} />
                    <span>{naming.t("agenda.actions.finish")}</span>
                  </button>
                  <button className={styles.dangerAction} onClick={() => goToAttendimentos("cancel", item)}>
                    <XCircleIcon size={16} />
                    <span>{naming.t("agenda.actions.cancel")}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.column}>
          <div className={styles.columnHeader}>
            <div className={styles.columnTitleWrap}>
              <ScissorsIcon size={18} />
              <h2>{naming.t("agenda.sections.petshop")}</h2>
            </div>
            <span className={styles.count}>{petshopAppointments.length}</span>
          </div>

          <div className={styles.cards}>
            {loading && <div className={styles.empty}>Carregando...</div>}
            {!loading && petshopAppointments.length === 0 && <div className={styles.empty}>{naming.t("agenda.empty")}</div>}
            {petshopAppointments.map((item) => (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <div className={styles.petName}>{item.petName}</div>
                    <div className={styles.meta}>{naming.t("agenda.labels.tutor")}: {item.tutorName}</div>
                  </div>
                  <div className={styles.timeBadge}>
                    <ClockIcon size={14} />
                    <span>{item.scheduledAt}</span>
                  </div>
                </div>

                <div className={styles.meta}><strong>{naming.t("agenda.labels.service")}:</strong> {item.serviceName ?? "-"}</div>
                <div className={`${styles.status} ${styles[getStatusClass(item.status)]}`}>{getStatusLabel(naming, item.status)}</div>

                <div className={styles.actions}>
                  <button className={styles.primaryAction} onClick={() => goToAttendimentos("start", item)}>
                    <PlayCircleIcon size={16} />
                    <span>{naming.t("agenda.actions.start")}</span>
                  </button>
                  <button className={styles.secondaryAction} onClick={() => goToAttendimentos("finish", item)}>
                    <CheckCircleIcon size={16} />
                    <span>{naming.t("agenda.actions.finish")}</span>
                  </button>
                  <button className={styles.dangerAction} onClick={() => goToAttendimentos("cancel", item)}>
                    <XCircleIcon size={16} />
                    <span>{naming.t("agenda.actions.cancel")}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
