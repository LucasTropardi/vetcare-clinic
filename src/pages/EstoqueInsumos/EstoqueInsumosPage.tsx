import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon, ScalesIcon } from "@phosphor-icons/react";
import { useSearchParams } from "react-router-dom";
import styles from "./EstoqueInsumosPage.module.css";
import { useNaming } from "../../i18n/useNaming";
import { showMessage } from "../../store/message.store";
import { getApiErrorMessage } from "../../services/api/errors";
import { createStockMovement, listStockBalances } from "../../services/api/stock.service";
import type { StockBalanceListItemResponse } from "../../services/api/types";

type StockFilter = "ALL" | "BELOW_MIN" | "WITH_STOCK" | "ZERO_STOCK";

const PAGE_SIZE = 24;

function toNumberInput(raw: string) {
  const normalized = raw.trim().replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(value ?? 0);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function EstoqueInsumosPage() {
  const naming = useNaming();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const [balances, setBalances] = useState<StockBalanceListItemResponse[]>([]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StockFilter>("ALL");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [usageOpenFor, setUsageOpenFor] = useState<number | null>(null);
  const [usageQty, setUsageQty] = useState("1");
  const [usageNotes, setUsageNotes] = useState("");

  const loadingRef = useRef(false);
  const hasMore = page + 1 < totalPages;
  const contextVisitId = useMemo(() => {
    const raw = searchParams.get("appointmentId");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
  }, [searchParams]);

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

  const loadBalances = useCallback(async (
    targetPage: number,
    targetQuery = query,
    targetFilter = filter,
    append = false
  ) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    await withApiError(async () => {
      const response = await listStockBalances({
        page: targetPage,
        size: PAGE_SIZE,
        sort: "name,asc",
        query: targetQuery.trim() || undefined,
        belowMinStock: targetFilter === "BELOW_MIN" ? true : undefined,
      });

      let content = response.content ?? [];
      if (targetFilter === "WITH_STOCK") {
        content = content.filter((item) => Number(item.onHand ?? 0) > 0);
      }
      if (targetFilter === "ZERO_STOCK") {
        content = content.filter((item) => Number(item.onHand ?? 0) <= 0);
      }

      setBalances((prev) => (append ? [...prev, ...content] : content));
      setPage(response.number ?? targetPage);
      setTotalPages(response.totalPages ?? 0);
    }, naming.t("estoque.messages.loadListError"));
    setLoading(false);
    loadingRef.current = false;
  }, [filter, naming, query, withApiError]);

  useEffect(() => {
    document.title = `${naming.t("estoque.title")} • ${naming.getApp("name")}`;
  }, [naming]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadBalances(0, query, filter);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, filter, loadBalances]);

  const stats = useMemo(() => {
    const total = balances.length;
    const below = balances.filter((item) => item.belowMinStock).length;
    const withStock = balances.filter((item) => Number(item.onHand ?? 0) > 0).length;
    const zero = balances.filter((item) => Number(item.onHand ?? 0) <= 0).length;
    return { total, below, withStock, zero };
  }, [balances]);

  const subtitleInfo = useMemo(() => {
    if (loading) return naming.t("estoque.states.loading");
    if (!balances.length) return naming.t("estoque.states.noItems");
    return naming.t("estoque.states.showingCount", { count: balances.length });
  }, [balances.length, loading, naming]);

  async function handleQuickUsage(product: StockBalanceListItemResponse) {
    const qty = toNumberInput(usageQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      showMessage({
        title: naming.t("estoque.messages.createUsageErrorTitle"),
        message: naming.t("estoque.messages.invalidQty"),
        variant: "warning",
      });
      return;
    }
    setSavingProductId(product.productId);
    await withApiError(async () => {
      await createStockMovement({
        productId: product.productId,
        movementType: "EXIT_VISIT_CONSUMPTION",
        quantity: -Math.abs(qty),
        notes: usageNotes.trim() || undefined,
        referenceType: contextVisitId ? "VISIT" : "MANUAL",
        referenceId: contextVisitId ?? undefined,
      });

      showMessage({
        title: naming.t("estoque.messages.createUsageSuccessTitle"),
        message: naming.t("estoque.messages.createUsageSuccessBody", { name: product.name }),
        variant: "success",
      });

      setUsageOpenFor(null);
      setUsageQty("1");
      setUsageNotes("");
      await loadBalances(0, query, filter);
    }, naming.t("estoque.messages.createUsageErrorTitle"));
    setSavingProductId(null);
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{naming.t("estoque.title")}</h1>
          <p className={styles.subtitle}>{naming.t("estoque.subtitle")}</p>
        </div>
      </header>

      <section className={styles.topBar}>
        <label className={styles.searchField}>
          <MagnifyingGlassIcon size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={naming.t("estoque.searchPlaceholder")}
            aria-label={naming.t("estoque.searchAria")}
          />
        </label>

        <div className={styles.statsGrid}>
          <button
            type="button"
            aria-pressed={filter === "ALL"}
            className={`${styles.statCard} ${filter === "ALL" ? styles.statCardActive : ""}`}
            onClick={() => setFilter("ALL")}
          >
            <span>{naming.t("estoque.stats.total")}</span>
            <strong>{stats.total}</strong>
          </button>

          <button
            type="button"
            aria-pressed={filter === "BELOW_MIN"}
            className={`${styles.statCard} ${filter === "BELOW_MIN" ? styles.statCardActive : ""}`}
            onClick={() => setFilter("BELOW_MIN")}
          >
            <span>{naming.t("estoque.stats.belowMin")}</span>
            <strong>{stats.below}</strong>
          </button>

          <button
            type="button"
            aria-pressed={filter === "WITH_STOCK"}
            className={`${styles.statCard} ${filter === "WITH_STOCK" ? styles.statCardActive : ""}`}
            onClick={() => setFilter("WITH_STOCK")}
          >
            <span>{naming.t("estoque.stats.withStock")}</span>
            <strong>{stats.withStock}</strong>
          </button>

          <button
            type="button"
            aria-pressed={filter === "ZERO_STOCK"}
            className={`${styles.statCard} ${filter === "ZERO_STOCK" ? styles.statCardActive : ""}`}
            onClick={() => setFilter("ZERO_STOCK")}
          >
            <span>{naming.t("estoque.stats.zeroStock")}</span>
            <strong>{stats.zero}</strong>
          </button>
        </div>
      </section>

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <h2>{naming.t("estoque.listTitle")}</h2>
          <span>{subtitleInfo}</span>
        </div>

        {loading && balances.length === 0 && <div className={styles.empty}>{naming.t("estoque.states.loading")}</div>}
        {!loading && balances.length === 0 && <div className={styles.empty}>{naming.t("estoque.states.noItems")}</div>}

        <div className={styles.grid}>
          {balances.map((item) => {
            const inLow = item.belowMinStock;
            const isUsageOpen = usageOpenFor === item.productId;
            const isSaving = savingProductId === item.productId;
            return (
              <article key={item.productId} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <div className={styles.productName}>{item.name}</div>
                    <div className={styles.meta}>{`${item.sku || "-"} • #${item.productId}`}</div>
                  </div>
                  <span className={`${styles.statusBadge} ${inLow ? styles.statusDanger : styles.statusOk}`}>
                    {inLow ? naming.t("estoque.status.belowMin") : naming.t("estoque.status.ok")}
                  </span>
                </div>

                <div className={styles.metrics}>
                  <div className={styles.metric}>
                    <div className={styles.metricLabel}>{naming.t("estoque.metrics.onHand")}</div>
                    <div className={styles.metricValue}>{formatDecimal(Number(item.onHand ?? 0))}</div>
                  </div>
                  <div className={styles.metric}>
                    <div className={styles.metricLabel}>{naming.t("estoque.metrics.minStock")}</div>
                    <div className={styles.metricValue}>{formatDecimal(Number(item.minStock ?? 0))}</div>
                  </div>
                  <div className={styles.metric}>
                    <div className={styles.metricLabel}>{naming.t("estoque.metrics.avgCost")}</div>
                    <div className={styles.metricValue}>{formatCurrency(Number(item.avgCost ?? 0))}</div>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => {
                      setUsageOpenFor((current) => (current === item.productId ? null : item.productId));
                      setUsageQty("1");
                      setUsageNotes("");
                    }}
                  >
                    <ScalesIcon size={16} />
                    {naming.t("estoque.actions.usage")}
                  </button>
                </div>

                {isUsageOpen && (
                  <div className={styles.usagePanel}>
                    <div className={styles.usageRow}>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={usageQty}
                        onChange={(e) => setUsageQty(e.target.value)}
                        className={styles.usageInput}
                        placeholder={naming.t("estoque.usage.qtyPlaceholder")}
                      />
                      <textarea
                        value={usageNotes}
                        onChange={(e) => setUsageNotes(e.target.value)}
                        className={styles.usageTextarea}
                        placeholder={naming.t("estoque.usage.notesPlaceholder")}
                      />
                    </div>
                    {contextVisitId && (
                      <div className={styles.referenceLocked}>
                        {naming.t("estoque.usage.linkedVisit", { id: contextVisitId })}
                      </div>
                    )}
                    <div className={styles.usageActions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => {
                          setUsageOpenFor(null);
                          setUsageQty("1");
                          setUsageNotes("");
                        }}
                        disabled={isSaving}
                      >
                        {naming.getLabel("cancel")}
                      </button>
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => void handleQuickUsage(item)}
                        disabled={isSaving}
                      >
                        {isSaving ? naming.t("estoque.states.saving") : naming.t("estoque.actions.confirmUsage")}
                      </button>
                    </div>
                    <div className={styles.muted}>{contextVisitId ? naming.t("estoque.usage.hintVisit") : naming.t("estoque.usage.hint")}</div>
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
              onClick={() => void loadBalances(page + 1, query, filter, true)}
            >
              {loading ? naming.t("estoque.states.loadingMore") : naming.t("estoque.actions.loadMore")}
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
