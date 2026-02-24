import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  PawPrintIcon,
  PhoneIcon,
  StethoscopeIcon,
  UserIcon,
} from "@phosphor-icons/react";
import styles from "./TutoresPage.module.css";
import { useNaming } from "../../i18n/useNaming";
import { showMessage } from "../../store/message.store";
import { getApiErrorMessage } from "../../services/api/errors";
import { listPets } from "../../services/api/pets.service";
import { getTutorStats, listTutors } from "../../services/api/tutors.service";
import type { PetListItemResponse, TutorListItemResponse, TutorStatsResponse } from "../../services/api/types";

type TutorStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type TutorInsightFilter = "ALL" | "WITH_PET" | "WITHOUT_CONTACT";

const PAGE_SIZE = 24;

function getSpeciesLabel(species: string, naming: ReturnType<typeof useNaming>) {
  if (species === "DOG") return naming.t("pacientes.species.dog");
  if (species === "CAT") return naming.t("pacientes.species.cat");
  return naming.t("pacientes.species.other");
}

export function TutoresPage() {
  const naming = useNaming();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const [tutors, setTutors] = useState<TutorListItemResponse[]>([]);
  const [stats, setStats] = useState<TutorStatsResponse | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TutorStatusFilter>("ALL");
  const [insightFilter, setInsightFilter] = useState<TutorInsightFilter>("ALL");

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [expandedTutorIds, setExpandedTutorIds] = useState<number[]>([]);
  const [petsByTutorId, setPetsByTutorId] = useState<Record<number, { loading: boolean; pets: PetListItemResponse[] }>>({});

  const loadingRef = useRef(false);
  const hasMore = page + 1 < totalPages;

  const withApiError = useCallback(async (action: () => Promise<void>, title: string) => {
    try {
      await action();
    } catch (err) {
      showMessage({
        title,
        message: getApiErrorMessage(err) ?? naming.getMessage("unknown"),
        variant: "error",
      });
    }
  }, [naming]);

  const loadTutors = useCallback(async (
    targetPage: number,
    targetQuery = query,
    targetStatusFilter = statusFilter,
    targetInsightFilter = insightFilter,
    append = false
  ) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    await withApiError(async () => {
      const response = await listTutors({
        page: targetPage,
        size: PAGE_SIZE,
        sort: "name,asc",
        query: targetQuery.trim() || undefined,
        active: targetStatusFilter === "ACTIVE" ? true : targetStatusFilter === "INACTIVE" ? false : undefined,
        hasPet: targetInsightFilter === "WITH_PET" ? true : undefined,
        hasContact: targetInsightFilter === "WITHOUT_CONTACT" ? false : undefined,
      });

      const content = response.content ?? [];
      setTutors((prev) => (append ? [...prev, ...content] : content));
      setPage(response.number ?? targetPage);
      setTotalPages(response.totalPages ?? 0);

      if (!append) {
        setExpandedTutorIds([]);
        setPetsByTutorId({});
      }
    }, naming.t("tutores.messages.loadListError"));
    setLoading(false);
    loadingRef.current = false;
  }, [insightFilter, naming, query, statusFilter, withApiError]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    await withApiError(async () => {
      const data = await getTutorStats();
      setStats(data);
    }, naming.t("tutores.messages.loadStatsError"));
    setStatsLoading(false);
  }, [naming, withApiError]);

  async function loadPetsOfTutor(tutorId: number) {
    const current = petsByTutorId[tutorId];
    if (current?.loading || current?.pets) return;

    setPetsByTutorId((prev) => ({ ...prev, [tutorId]: { loading: true, pets: [] } }));
    await withApiError(async () => {
      const response = await listPets({
        page: 0,
        size: 200,
        sort: "name,asc",
        tutorId,
      });
      setPetsByTutorId((prev) => ({
        ...prev,
        [tutorId]: { loading: false, pets: response.content ?? [] },
      }));
    }, naming.t("tutores.messages.loadPetsError"));
    setPetsByTutorId((prev) => {
      const existing = prev[tutorId];
      if (!existing?.loading) return prev;
      return { ...prev, [tutorId]: { loading: false, pets: [] } };
    });
  }

  function toggleTutor(tutorId: number) {
    const open = expandedTutorIds.includes(tutorId);
    setExpandedTutorIds((prev) => (open ? prev.filter((id) => id !== tutorId) : [...prev, tutorId]));
    if (!open) {
      void loadPetsOfTutor(tutorId);
    }
  }

  useEffect(() => {
    document.title = `${naming.t("tutores.title")} • ${naming.getApp("name")}`;
  }, [naming]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTutors(0, query, statusFilter, insightFilter);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, statusFilter, insightFilter, loadTutors]);

  const subtitleInfo = useMemo(() => {
    if (loading) return naming.t("tutores.states.loading");
    if (!tutors.length) return naming.t("tutores.states.noTutors");
    return naming.t("tutores.states.showingCount", { count: tutors.length });
  }, [loading, naming, tutors.length]);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{naming.t("tutores.title")}</h1>
          <p className={styles.subtitle}>{naming.t("tutores.subtitle")}</p>
        </div>
      </header>

      <section className={styles.topBar}>
        <label className={styles.searchField}>
          <MagnifyingGlassIcon size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={naming.t("tutores.searchPlaceholder")}
            aria-label={naming.t("tutores.searchAria")}
          />
        </label>

        <div className={styles.statsGrid}>
          <button
            type="button"
            aria-pressed={statusFilter === "ALL" && insightFilter === "ALL"}
            className={`${styles.statCard} ${statusFilter === "ALL" && insightFilter === "ALL" ? styles.statCardActive : ""}`}
            onClick={() => {
              setStatusFilter("ALL");
              setInsightFilter("ALL");
            }}
          >
            <span>{naming.t("tutores.stats.total")}</span>
            <strong>{statsLoading ? "-" : stats?.total ?? "-"}</strong>
          </button>

          <button
            type="button"
            aria-pressed={statusFilter === "ACTIVE"}
            className={`${styles.statCard} ${statusFilter === "ACTIVE" ? styles.statCardActive : ""}`}
            onClick={() => setStatusFilter((prev) => (prev === "ACTIVE" ? "ALL" : "ACTIVE"))}
          >
            <span>{naming.t("tutores.stats.active")}</span>
            <strong>{statsLoading ? "-" : stats?.active ?? "-"}</strong>
          </button>

          <button
            type="button"
            aria-pressed={statusFilter === "INACTIVE"}
            className={`${styles.statCard} ${statusFilter === "INACTIVE" ? styles.statCardActive : ""}`}
            onClick={() => setStatusFilter((prev) => (prev === "INACTIVE" ? "ALL" : "INACTIVE"))}
          >
            <span>{naming.t("tutores.stats.inactive")}</span>
            <strong>{statsLoading ? "-" : stats?.inactive ?? "-"}</strong>
          </button>

          <button
            type="button"
            aria-pressed={insightFilter === "WITH_PET"}
            className={`${styles.statCard} ${insightFilter === "WITH_PET" ? styles.statCardActive : ""}`}
            onClick={() => setInsightFilter((prev) => (prev === "WITH_PET" ? "ALL" : "WITH_PET"))}
          >
            <span>{naming.t("tutores.stats.withPet")}</span>
            <strong>{statsLoading ? "-" : stats?.withPet ?? "-"}</strong>
          </button>

          <button
            type="button"
            aria-pressed={insightFilter === "WITHOUT_CONTACT"}
            className={`${styles.statCard} ${insightFilter === "WITHOUT_CONTACT" ? styles.statCardActive : ""}`}
            onClick={() => setInsightFilter((prev) => (prev === "WITHOUT_CONTACT" ? "ALL" : "WITHOUT_CONTACT"))}
          >
            <span>{naming.t("tutores.stats.withoutContact")}</span>
            <strong>{statsLoading ? "-" : stats?.withoutContact ?? "-"}</strong>
          </button>
        </div>
      </section>

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <h2>{naming.t("tutores.listTitle")}</h2>
          <span>{subtitleInfo}</span>
        </div>

        {loading && tutors.length === 0 && <div className={styles.empty}>{naming.t("tutores.states.loading")}</div>}
        {!loading && tutors.length === 0 && <div className={styles.empty}>{naming.t("tutores.states.noTutors")}</div>}

        <div className={styles.grid}>
          {tutors.map((tutor) => {
            const open = expandedTutorIds.includes(tutor.id);
            const petsState = petsByTutorId[tutor.id];

            return (
              <article key={tutor.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <div className={styles.tutorName}>{tutor.name}</div>
                    <div className={styles.metaRow}>
                      <span><IdentificationCardIcon size={14} /> {tutor.document || "-"}</span>
                      <span><PhoneIcon size={14} /> {tutor.phone || "-"}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <span><UserIcon size={14} /> {tutor.email || "-"}</span>
                    </div>
                  </div>
                  <span className={`${styles.statusBadge} ${tutor.active ? styles.statusActive : styles.statusInactive}`}>
                    {tutor.active ? naming.t("tutores.status.active") : naming.t("tutores.status.inactive")}
                  </span>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => toggleTutor(tutor.id)}
                  >
                    <PawPrintIcon size={16} />
                    {open ? naming.t("tutores.actions.hidePets") : naming.t("tutores.actions.viewPets")}
                  </button>
                </div>

                {open && (
                  <div className={styles.petsPanel}>
                    {petsState?.loading && <div className={styles.emptySmall}>{naming.t("tutores.states.loadingPets")}</div>}
                    {!petsState?.loading && (petsState?.pets?.length ?? 0) === 0 && (
                      <div className={styles.emptySmall}>{naming.t("tutores.states.noPetsLinked")}</div>
                    )}

                    {!petsState?.loading && (petsState?.pets?.length ?? 0) > 0 && (
                      <div className={styles.petsList}>
                        {petsState.pets.map((pet) => (
                          <div key={pet.id} className={styles.petItem}>
                            <div>
                              <div className={styles.petName}>{pet.name}</div>
                              <div className={styles.petMeta}>{getSpeciesLabel(pet.species, naming)}</div>
                            </div>
                            <button
                              type="button"
                              className={styles.primaryBtn}
                              onClick={() => navigate("/prontuarios", { state: { petId: pet.id } })}
                            >
                              <StethoscopeIcon size={14} />
                              {naming.t("tutores.actions.openMedicalRecord")}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {hasMore && (
          <div className={styles.moreArea}>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={loading}
              onClick={() => void loadTutors(page + 1, query, statusFilter, insightFilter, true)}
            >
              {loading ? naming.t("tutores.states.loadingMore") : naming.t("tutores.actions.loadMore")}
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
