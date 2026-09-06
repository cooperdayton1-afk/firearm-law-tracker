"use client";

import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { FIPS_TO_ABBR } from "@/data/fipsToAbbr";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

export default function USMap({ billCounts, selectedState, onSelectState }) {
  const counts = Object.values(billCounts);
  const maxCount = counts.length ? Math.max(...counts, 1) : 1;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <ComposableMap projection="geoAlbersUsa" className="w-full h-auto">
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const abbr = FIPS_TO_ABBR[geo.id];
              const count = billCounts[abbr] || 0;
              const intensity = count / maxCount;
              const isSelected = selectedState === abbr;

              const baseFill = isSelected
                ? "#1C2B3A"
                : count === 0
                ? "#DDD8C8"
                : `rgba(156, 122, 41, ${0.25 + intensity * 0.65})`;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() =>
                    onSelectState(abbr === selectedState ? null : abbr)
                  }
                  style={{
                    default: {
                      fill: baseFill,
                      stroke: "#EFEDE6",
                      strokeWidth: 0.75,
                      outline: "none",
                      cursor: "pointer",
                    },
                    hover: {
                      fill: isSelected ? "#1C2B3A" : "#9C7A29",
                      stroke: "#EFEDE6",
                      strokeWidth: 0.75,
                      outline: "none",
                      cursor: "pointer",
                    },
                    pressed: {
                      fill: "#1C2B3A",
                      outline: "none",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      <p className="font-data text-xs text-center mt-2 text-[#52616F] tracking-wide uppercase">
        {selectedState
          ? `Showing ${selectedState} — click again to clear`
          : "Click a state to filter by it"}
      </p>
    </div>
  );
}