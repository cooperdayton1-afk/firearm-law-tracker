"use client";

import { CATEGORIES } from "@/data/mockBills";

const LABEL = "font-data text-xs uppercase tracking-wide text-[#52616F] mb-2";

export default function FilterPanel({ filters, setFilters, emptyFilters, years, statuses }) {
  function toggle(key, value) {
    setFilters((prev) => {
      const has = prev[key].includes(value);
      return {
        ...prev,
        [key]: has ? prev[key].filter((v) => v !== value) : [...prev[key], value],
      };
    });
  }

  const hasActiveFilters =
    filters.search || filters.year !== "all" || filters.categories.length || filters.statuses.length;

  function yearButton(value, label) {
    const active = filters.year === value;
    return (
      <button
        key={label}
        onClick={() => setFilters((prev) => ({ ...prev, year: value }))}
        className={`font-data text-xs px-3 py-1.5 border transition-colors ${
          active
            ? "bg-[#1C2B3A] text-white border-[#1C2B3A]"
            : "bg-white text-[#1C2B3A] border-[#C9C2B2] hover:border-[#1C2B3A]"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="border border-[#C9C2B2] bg-white/40 p-5 md:sticky md:top-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg text-[#1C2B3A]">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={() => setFilters(emptyFilters)}
            className="font-data text-xs uppercase tracking-wide text-[#8B3A3A] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <p className={LABEL}>Year</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {yearButton("all", "All")}
        {years.map((y) => yearButton(y, String(y)))}
      </div>

      <p className={LABEL}>Search</p>
      <input
        type="text"
        value={filters.search}
        onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
        placeholder="Bill number or keyword"
        className="w-full border border-[#C9C2B2] bg-white px-3 py-2 mb-5 text-sm text-[#1C2B3A] focus:outline-none focus:ring-2 focus:ring-[#9C7A29]"
      />

      <p className={LABEL}>Status</p>
      <div className="space-y-2 mb-5">
        {statuses.map((status) => (
          <label key={status} className="flex items-center gap-2 text-sm text-[#1C2B3A] cursor-pointer">
            <input
              type="checkbox"
              checked={filters.statuses.includes(status)}
              onChange={() => toggle("statuses", status)}
              className="accent-[#9C7A29]"
            />
            {status}
          </label>
        ))}
      </div>

      <p className={LABEL}>Category</p>
      <div className="space-y-2">
        {CATEGORIES.map((cat) => (
          <label key={cat} className="flex items-center gap-2 text-sm text-[#1C2B3A] cursor-pointer">
            <input
              type="checkbox"
              checked={filters.categories.includes(cat)}
              onChange={() => toggle("categories", cat)}
              className="accent-[#9C7A29]"
            />
            {cat}
          </label>
        ))}
      </div>
    </div>
  );
}
