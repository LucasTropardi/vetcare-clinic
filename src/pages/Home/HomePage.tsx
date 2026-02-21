import { useEffect, useMemo, useState } from "react";
import { CheckCircleIcon, ClockIcon, PlayCircleIcon, ScissorsIcon, StethoscopeIcon, XCircleIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useNaming } from "../../i18n/useNaming";
import { DateInputBR } from "../../components/DateInputBR/DateInputBR";
import styles from "./HomePage.module.css";

type AgendaStatus = "OPEN" | "IN_PROGRESS" | "FINISHED" | "CANCELED";
type AgendaType = "VET" | "PETSHOP";
type StatusFilter = "OPEN" | "IN_PROGRESS" | "FINISHED" | "CANCELED" | "ALL";

type AgendaItem = {
  id: number;
  type: AgendaType;
  petName: string;
  tutorName: string;
  serviceName?: string;
  scheduledDate: string;
  scheduledAt: string;
  status: AgendaStatus;
  notes?: string;
};

function toDateInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}

const TODAY = toDateInputValue(new Date());
const TOMORROW = toDateInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000));

const MOCK_AGENDA: AgendaItem[] = [
  { id: 1051, type: "VET", petName: "Thor", tutorName: "Lucas Tropardi", scheduledDate: TODAY, scheduledAt: "09:00", status: "OPEN", notes: "Retorno pós-cirúrgico" },
  { id: 1052, type: "VET", petName: "Mia", tutorName: "Fernanda Silva", scheduledDate: TODAY, scheduledAt: "10:30", status: "IN_PROGRESS", notes: "Consulta dermatológica" },
  { id: 1053, type: "VET", petName: "Nina", tutorName: "Rodrigo Souza", scheduledDate: TODAY, scheduledAt: "11:40", status: "OPEN" },
  { id: 2061, type: "PETSHOP", petName: "Bob", tutorName: "Ana Beatriz", serviceName: "Banho e tosa", scheduledDate: TODAY, scheduledAt: "09:20", status: "OPEN" },
  { id: 2062, type: "PETSHOP", petName: "Luna", tutorName: "Carlos Lima", serviceName: "Hidratação", scheduledDate: TODAY, scheduledAt: "10:50", status: "FINISHED" },
  { id: 2063, type: "PETSHOP", petName: "Mel", tutorName: "Patrícia Alves", serviceName: "Tosa higiênica", scheduledDate: TODAY, scheduledAt: "13:10", status: "OPEN" },
  { id: 3074, type: "VET", petName: "Zeca", tutorName: "Bruna Melo", scheduledDate: TOMORROW, scheduledAt: "08:40", status: "OPEN", notes: "Vacinação anual" },
];

function getStatusClass(status: AgendaStatus) {
  if (status === "IN_PROGRESS") return "inProgress";
  if (status === "FINISHED") return "finished";
  if (status === "CANCELED") return "canceled";
  return "open";
}

function getStatusLabel(naming: ReturnType<typeof useNaming>, status: AgendaStatus) {
  if (status === "IN_PROGRESS") return naming.t("agenda.status.inProgress");
  if (status === "FINISHED") return naming.t("agenda.status.finished");
  if (status === "CANCELED") return naming.t("agenda.status.canceled");
  return naming.t("agenda.status.open");
}

export function HomePage() {
  const naming = useNaming();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN");

  const statusPills: Array<{ key: StatusFilter; label: string }> = [
    { key: "OPEN", label: naming.t("agenda.filters.showOpen") },
    { key: "IN_PROGRESS", label: naming.t("agenda.filters.showInProgress") },
    { key: "FINISHED", label: naming.t("agenda.filters.showFinished") },
    { key: "CANCELED", label: naming.t("agenda.filters.showCanceled") },
    { key: "ALL", label: naming.t("agenda.filters.showAll") },
  ];

  function getStatusPillKindClass(key: StatusFilter) {
    if (key === "OPEN") return styles.pillOpen;
    if (key === "IN_PROGRESS") return styles.pillInProgress;
    if (key === "FINISHED") return styles.pillFinished;
    if (key === "CANCELED") return styles.pillCanceled;
    return styles.pillAll;
  }

  const filtered = useMemo(() => {
    return MOCK_AGENDA.filter((item) => {
      if (item.scheduledDate !== selectedDate) return false;
      if (statusFilter === "ALL") return true;
      return item.status === statusFilter;
    });
  }, [selectedDate, statusFilter]);

  const vetAppointments = useMemo(() => filtered.filter((item) => item.type === "VET"), [filtered]);
  const petshopAppointments = useMemo(() => filtered.filter((item) => item.type === "PETSHOP"), [filtered]);

  useEffect(() => {
    document.title = `${naming.t("agenda.title")} • ${naming.getApp("name")}`;
  }, [naming]);

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
            {vetAppointments.length === 0 && <div className={styles.empty}>{naming.t("agenda.empty")}</div>}
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
            {petshopAppointments.length === 0 && <div className={styles.empty}>{naming.t("agenda.empty")}</div>}
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
