"use client";

import { CATEGORIES, STATUSES } from "@/data/mockBills";

export default function FilterPanel({ filters, setFilters }) {
  function toggleCategory(cat) {
    setFilters((prev) => {
      const has = prev.categories.includes(cat);
      return {
        ...prev,
        categories: has
          ? prev.categories.filter((c) => c !== cat)
          : [...prev.categories, cat],
      };
    });
  }

  function toggleStatus(status) {
    setFilters((prev) => {
      const has = prev.statuses.includes(status);
      return {
        ...prev,
        statuses: has
          ? prev.statuses.filter((s) => s !== status)
          : [...prev.statuses, status],
      };
    });
  }

  function clearAll() {
    setFilters({ search: "", categories: [], statuses: [] });
  }

  const hasActiveFilters =
    filters.search || filters.categories.length || filters.statuses.length;

  return (
    <div className="border border-[#C9C2B2] bg-white/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg text-[#1C2B3A]">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="font-data text-xs uppercase tracking-wide text-[#8B3A3A] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <label className="block font-data text-xs uppercase tracking-wide text-[#52616F] mb-1">
        Search
      </label>
      <input
        type="text"
        value={filters.search}
        onChange={(e) =>
          setFilters((prev) => ({ ...prev, search: e.target.value }))
        }
        placeholder="Bill number or keyword"
        className="w-full border border-[#C9C2B2] bg-white px-3 py-2 mb-5 text-sm text-[#1C2B3A] focus:outline-none focus:ring-2 focus:ring-[#9C7A29]"
      />

      <p className="font-data text-xs uppercase tracking-wide text-[#52616F] mb-2">
        Category
      </p>
      <div className="space-y-2 mb-5">
        {CATEGORIES.map((cat) => (
          <label key={cat} className="flex items-center gap-2 text-sm text-[#1C2B3A] cursor-pointer">
            <input
              type="checkbox"
              checked={filters.categories.includes(cat)}
              onChange={() => toggleCategory(cat)}
              className="accent-[#9C7A29]"
            />
            {cat}
          </label>
        ))}
      </div>

      <p className="font-data text-xs uppercase tracking-wide text-[#52616F] mb-2">
        Status
      </p>
      <div className="space-y-2">
        {STATUSES.map((status) => (
          <label key={status} className="flex items-center gap-2 text-sm text-[#1C2B3A] cursor-pointer">
            <input
              type="checkbox"
              checked={filters.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
              className="accent-[#9C7A29]"
            />
            {status}
          </label>
        ))}
      </div>
    </div>
  );
}
