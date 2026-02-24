import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon, StethoscopeIcon } from "@phosphor-icons/react";
import styles from "./PacientesPage.module.css";
import { useNaming } from "../../i18n/useNaming";
import { showMessage } from "../../store/message.store";
import { getApiErrorMessage } from "../../services/api/errors";
import { getPetStats, listPets } from "../../services/api/pets.service";
import type { PetListItemResponse, PetStatsResponse } from "../../services/api/types";

type PetStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type PetSpeciesFilter = "ALL" | "DOG" | "CAT" | "OTHER";

const PAGE_SIZE = 24;

function getSpeciesLabel(species: string, naming: ReturnType<typeof useNaming>) {
  if (species === "DOG") return naming.t("pacientes.species.dog");
  if (species === "CAT") return naming.t("pacientes.species.cat");
  return naming.t("pacientes.species.other");
}

export function PacientesPage() {
  const naming = useNaming();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const [pets, setPets] = useState<PetListItemResponse[]>([]);
  const [stats, setStats] = useState<PetStatsResponse | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PetStatusFilter>("ALL");
  const [speciesFilter, setSpeciesFilter] = useState<PetSpeciesFilter>("ALL");

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

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

  const loadPets = useCallback(async (
    targetPage: number,
    targetQuery = query,
    targetStatusFilter = statusFilter,
    targetSpeciesFilter = speciesFilter,
    append = false
  ) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    await withApiError(async () => {
      const response = await listPets({
        page: targetPage,
        size: PAGE_SIZE,
        sort: "name,asc",
        query: targetQuery.trim() || undefined,
        active: targetStatusFilter === "ACTIVE" ? true : targetStatusFilter === "INACTIVE" ? false : undefined,
        species: targetSpeciesFilter === "DOG" ? "DOG" : targetSpeciesFilter === "CAT" ? "CAT" : undefined,
        othersSpecies: targetSpeciesFilter === "OTHER" ? true : undefined,
      });

      const content = response.content ?? [];
      setPets((prev) => (append ? [...prev, ...content] : content));
      setPage(response.number ?? targetPage);
      setTotalPages(response.totalPages ?? 0);
    }, naming.t("pacientes.messages.loadListError"));
    setLoading(false);
    loadingRef.current = false;
  }, [naming, query, speciesFilter, statusFilter, withApiError]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    await withApiError(async () => {
      const data = await getPetStats();
      setStats(data);
    }, naming.t("pacientes.messages.loadStatsError"));
    setStatsLoading(false);
  }, [naming, withApiError]);

  useEffect(() => {
    document.title = `${naming.t("pacientes.title")} • ${naming.getApp("name")}`;
  }, [naming]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPets(0, query, statusFilter, speciesFilter);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, statusFilter, speciesFilter, loadPets]);

  const headerSubtitle = useMemo(() => {
    if (loading) return naming.t("pacientes.states.loading");
    if (!pets.length) return naming.t("pacientes.states.noPatients");
    return naming.t("pacientes.states.showingCount", { count: pets.length });
  }, [loading, naming, pets.length]);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{naming.t("pacientes.title")}</h1>
          <p className={styles.subtitle}>{naming.t("pacientes.subtitle")}</p>
        </div>
      </header>

      <section className={styles.topBar}>
        <label className={styles.searchField}>
          <MagnifyingGlassIcon size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={naming.t("pacientes.searchPlaceholder")}
            aria-label={naming.t("pacientes.searchAria")}
          />
        </label>
        <div className={styles.statsGrid}>
          <button
            type="button"
            aria-pressed={statusFilter === "ALL" && speciesFilter === "ALL"}
            className={`${styles.statCard} ${statusFilter === "ALL" && speciesFilter === "ALL" ? styles.statCardActive : ""}`}
            onClick={() => {
              setStatusFilter("ALL");
              setSpeciesFilter("ALL");
            }}
          >
            <span>{naming.t("pacientes.stats.total")}</span>
            <strong>{statsLoading ? "-" : stats?.total ?? "-"}</strong>
          </button>

          <button
            type="button"
            aria-pressed={statusFilter === "ACTIVE"}
            className={`${styles.statCard} ${statusFilter === "ACTIVE" ? styles.statCardActive : ""}`}
            onClick={() => setStatusFilter((prev) => (prev === "ACTIVE" ? "ALL" : "ACTIVE"))}
          >
            <span>{naming.t("pacientes.stats.active")}</span>
            <strong>{statsLoading ? "-" : stats?.active ?? "-"}</strong>
          </button>

          <button
            type="button"
            aria-pressed={statusFilter === "INACTIVE"}
            className={`${styles.statCard} ${statusFilter === "INACTIVE" ? styles.statCardActive : ""}`}
            onClick={() => setStatusFilter((prev) => (prev === "INACTIVE" ? "ALL" : "INACTIVE"))}
          >
            <span>{naming.t("pacientes.stats.inactive")}</span>
            <strong>{statsLoading ? "-" : stats?.inactive ?? "-"}</strong>
          </button>

          <button
            type="button"
            aria-pressed={speciesFilter === "DOG"}
            className={`${styles.statCard} ${speciesFilter === "DOG" ? styles.statCardActive : ""}`}
            onClick={() => setSpeciesFilter((prev) => (prev === "DOG" ? "ALL" : "DOG"))}
          >
            <span>{naming.t("pacientes.stats.dogs")}</span>
            <strong>{statsLoading ? "-" : stats?.dogs ?? "-"}</strong>
          </button>

          <button
            type="button"
            aria-pressed={speciesFilter === "CAT"}
            className={`${styles.statCard} ${speciesFilter === "CAT" ? styles.statCardActive : ""}`}
            onClick={() => setSpeciesFilter((prev) => (prev === "CAT" ? "ALL" : "CAT"))}
          >
            <span>{naming.t("pacientes.stats.cats")}</span>
            <strong>{statsLoading ? "-" : stats?.cats ?? "-"}</strong>
          </button>

          <button
            type="button"
            aria-pressed={speciesFilter === "OTHER"}
            className={`${styles.statCard} ${speciesFilter === "OTHER" ? styles.statCardActive : ""}`}
            onClick={() => setSpeciesFilter((prev) => (prev === "OTHER" ? "ALL" : "OTHER"))}
          >
            <span>{naming.t("pacientes.stats.others")}</span>
            <strong>{statsLoading ? "-" : stats?.others ?? "-"}</strong>
          </button>
        </div>
      </section>

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <h2>{naming.t("pacientes.listTitle")}</h2>
          <span>{headerSubtitle}</span>
        </div>

        {loading && pets.length === 0 && <div className={styles.empty}>{naming.t("pacientes.states.loading")}</div>}
        {!loading && pets.length === 0 && <div className={styles.empty}>{naming.t("pacientes.states.noPatients")}</div>}

        <div className={styles.grid}>
          {pets.map((pet) => (
            <article key={pet.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <div className={styles.petName}>{pet.name}</div>
                  <div className={styles.meta}>{naming.t("pacientes.labels.tutor", { value: pet.tutorName ?? `#${pet.tutorId}` })}</div>
                </div>
                <span className={`${styles.statusBadge} ${pet.active ? styles.statusActive : styles.statusInactive}`}>
                  {pet.active ? naming.t("pacientes.status.active") : naming.t("pacientes.status.inactive")}
                </span>
              </div>

              <div className={styles.pillRow}>
                <span className={styles.pill}>{getSpeciesLabel(pet.species, naming)}</span>
                <span className={styles.pill}>#{pet.id}</span>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => navigate("/prontuarios", { state: { petId: pet.id } })}
                >
                  <StethoscopeIcon size={16} />
                  {naming.t("pacientes.actions.openMedicalRecord")}
                </button>
              </div>
            </article>
          ))}
        </div>

        {hasMore && (
          <div className={styles.moreArea}>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={loading}
              onClick={() => void loadPets(page + 1, query, statusFilter, speciesFilter, true)}
            >
              {loading ? naming.t("pacientes.states.loadingMore") : naming.t("pacientes.actions.loadMore")}
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
