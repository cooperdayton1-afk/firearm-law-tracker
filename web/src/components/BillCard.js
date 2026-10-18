"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/data/mockBills";
import { POSITIONS, positionInfo } from "@/lib/billInfo";

const STATUS_COLORS = {
  Introduced: "#52616F",
  "Passed One Chamber": "#9C7A29",
  "Passed Legislature": "#9C7A29",
  "Signed into Law": "#3F6B4F",
  Vetoed: "#8B3A3A",
  Failed: "#8B3A3A",
};

const LABEL = "font-data text-xs uppercase tracking-wide text-[#52616F]";
const SMALL_BTN =
  "font-data text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors";

function formatDate(d) {
  if (!d) return null;
  const date = new Date(String(d).length === 10 ? `${d}T00:00:00` : d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// A text box that saves itself when you click away from it
function AutoSaveField({ label, value, placeholder, onSave }) {
  const [draft, setDraft] = useState(value || "");
  const [state, setState] = useState("idle"); // idle | saving | saved

  // If someone else's edit arrives, show it (unless you're mid-edit)
  useEffect(() => {
    if (state !== "editing") setDraft(value || "");
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleBlur() {
    if (draft === (value || "")) {
      setState("idle");
      return;
    }
    setState("saving");
    const ok = await onSave(draft);
    setState(ok ? "saved" : "idle");
    if (ok) setTimeout(() => setState("idle"), 1500);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={LABEL}>{label}</span>
        <span className="font-data text-xs text-[#9C7A29]">
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
        </span>
      </div>
      <textarea
        value={draft}
        onFocus={() => setState("editing")}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={3}
        className="w-full border border-[#C9C2B2] bg-white px-3 py-2 text-sm text-[#1C2B3A] focus:outline-none focus:ring-2 focus:ring-[#9C7A29]"
      />
    </div>
  );
}

function PositionBadge({ position }) {
  const info = positionInfo(position);
  if (!info) return null;
  return (
    <span
      className="font-data text-xs uppercase tracking-wide px-2 py-0.5 text-white whitespace-nowrap"
      style={{ backgroundColor: info.color }}
    >
      We {info.label === "Neutral" ? "are neutral" : info.label.toLowerCase()}
    </span>
  );
}

// What the public sees for a watchlist bill
function PublicDetails({ bill }) {
  if (!bill.plainSummary && !bill.benefits && !bill.risks) return null;
  return (
    <div className="border-t border-[#C9C2B2] pt-3 mt-3 space-y-3">
      {bill.plainSummary && (
        <div>
          <p className={`${LABEL} mb-1`}>In plain language</p>
          <p className="text-sm text-[#1C2B3A] whitespace-pre-line">{bill.plainSummary}</p>
        </div>
      )}
      {(bill.benefits || bill.risks) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bill.benefits && (
            <div>
              <p className={`${LABEL} mb-1 !text-[#3F6B4F]`}>Benefits</p>
              <p className="text-sm text-[#1C2B3A] whitespace-pre-line">{bill.benefits}</p>
            </div>
          )}
          {bill.risks && (
            <div>
              <p className={`${LABEL} mb-1 !text-[#8B3A3A]`}>Risks</p>
              <p className="text-sm text-[#1C2B3A] whitespace-pre-line">{bill.risks}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Staff controls for a watchlist bill
function WatchlistEditor({ bill, onUpdate }) {
  const [open, setOpen] = useState(false);
  const missing = !bill.position || !bill.plainSummary;

  return (
    <div className="border-t border-[#C9C2B2] pt-3 mt-3 space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className={LABEL}>Position</span>
          <div className="flex">
            {POSITIONS.map((p) => {
              const active = bill.position === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => onUpdate(bill.id, { position: active ? null : p.value })}
                  className={`${SMALL_BTN} -ml-px first:ml-0`}
                  style={
                    active
                      ? { backgroundColor: p.color, borderColor: p.color, color: "white" }
                      : { borderColor: "#C9C2B2", color: "#1C2B3A", backgroundColor: "white" }
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2">
          <span className={LABEL}>Category</span>
          <select
            value={bill.manualCategory || ""}
            onChange={(e) => onUpdate(bill.id, { manualCategory: e.target.value })}
            className="border border-[#C9C2B2] bg-white px-2 py-1.5 text-sm text-[#1C2B3A] focus:outline-none focus:ring-2 focus:ring-[#9C7A29]"
          >
            <option value="">Choose… (suggested: {bill.autoCategory})</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        className="font-data text-xs uppercase tracking-wide text-[#1C2B3A] hover:underline"
      >
        {open ? "▾ Hide write-up" : "▸ Edit write-up"}
        {!open && missing && <span className="ml-2 normal-case text-[#9C7A29]">needs a position or summary</span>}
      </button>

      {!open && <PublicDetails bill={bill} />}

      {open && (
        <div className="space-y-4">
          <AutoSaveField
            label="Plain-language explanation"
            value={bill.plainSummary}
            placeholder="Explain what this bill does in everyday terms…"
            onSave={(v) => onUpdate(bill.id, { plainSummary: v })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AutoSaveField
              label="Benefits"
              value={bill.benefits}
              placeholder="What this bill would improve…"
              onSave={(v) => onUpdate(bill.id, { benefits: v })}
            />
            <AutoSaveField
              label="Risks"
              value={bill.risks}
              placeholder="Concerns or downsides…"
              onSave={(v) => onUpdate(bill.id, { risks: v })}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => onUpdate(bill.id, { watchlistStatus: "archived" })}
          className="font-data text-xs uppercase tracking-wide text-[#8B3A3A] hover:underline"
        >
          Remove from watchlist
        </button>
        {bill.lastEditedBy && (
          <span className="font-data text-xs text-[#52616F]">
            Last edited by {bill.lastEditedBy}
            {bill.lastEditedAt ? `, ${formatDate(bill.lastEditedAt)}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// Staff buttons for moving a bill between lists
function TriageButtons({ bill, onUpdate }) {
  const toWatch = (
    <button
      onClick={() => onUpdate(bill.id, { watchlistStatus: "watch" })}
      className={`${SMALL_BTN} bg-[#1C2B3A] text-white border-[#1C2B3A] hover:bg-[#2c3f52]`}
    >
      Add to watchlist
    </button>
  );
  return (
    <div className="border-t border-[#C9C2B2] pt-3 mt-3 flex flex-wrap gap-2">
      {toWatch}
      {bill.watchlistStatus === "pending" ? (
        <button
          onClick={() => onUpdate(bill.id, { watchlistStatus: "archived" })}
          className={`${SMALL_BTN} bg-white text-[#1C2B3A] border-[#C9C2B2] hover:border-[#1C2B3A]`}
        >
          Not on watchlist
        </button>
      ) : (
        <button
          onClick={() => onUpdate(bill.id, { watchlistStatus: "pending" })}
          className={`${SMALL_BTN} bg-white text-[#1C2B3A] border-[#C9C2B2] hover:border-[#1C2B3A]`}
        >
          Move back to review
        </button>
      )}
    </div>
  );
}

export default function BillCard({ bill, isStaff = false, onUpdate }) {
  const statusColor = STATUS_COLORS[bill.status] || "#52616F";
  const date = formatDate(bill.lastActionDate);
  const showDescription = bill.description && bill.description !== bill.title;
  const onWatchlist = bill.watchlistStatus === "watch";

  return (
    <div className="border border-[#C9C2B2] bg-white/40 p-5 hover:bg-white/70 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-2">
        <span className="font-data text-xs uppercase tracking-wide text-[#52616F]">
          {bill.billNumber}
          {bill.year ? ` · ${bill.year}` : ""}
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          {onWatchlist && <PositionBadge position={bill.position} />}
          <span
            className="font-data text-xs uppercase tracking-wide px-2 py-0.5 border whitespace-nowrap"
            style={{ color: statusColor, borderColor: statusColor }}
          >
            {bill.status}
          </span>
        </div>
      </div>
      <h3 className="font-display text-lg text-[#1C2B3A] mb-1 leading-snug">
        {bill.url ? (
          <a href={bill.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {bill.title}
          </a>
        ) : (
          bill.title
        )}
      </h3>
      {showDescription && <p className="text-sm text-[#3A4653] mb-3">{bill.description}</p>}
      {bill.lastAction && (
        <p className="text-sm text-[#52616F] mb-3">
          <span className={LABEL}>Last action: </span>
          {bill.lastAction}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="font-data text-xs uppercase tracking-wide text-[#9C7A29]">
          {bill.category}
          {isStaff && onWatchlist && !bill.manualCategory && (
            <span className="normal-case text-[#52616F]"> (suggested)</span>
          )}
        </span>
        {date && <span className="font-data text-xs text-[#52616F]">{date}</span>}
      </div>

      {onWatchlist && !isStaff && <PublicDetails bill={bill} />}
      {onWatchlist && isStaff && <WatchlistEditor bill={bill} onUpdate={onUpdate} />}
      {!onWatchlist && isStaff && <TriageButtons bill={bill} onUpdate={onUpdate} />}
    </div>
  );
}
