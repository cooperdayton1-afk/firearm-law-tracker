const STATUS_COLORS = {
  Introduced: "#52616F",
  "Passed One Chamber": "#9C7A29",
  "Passed Legislature": "#9C7A29",
  "Signed into Law": "#3F6B4F",
  Vetoed: "#8B3A3A",
  Failed: "#8B3A3A",
};

function formatDate(d) {
  if (!d) return null;
  const date = new Date(`${d}T00:00:00`);
  if (isNaN(date)) return d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function BillCard({ bill }) {
  const statusColor = STATUS_COLORS[bill.status] || "#52616F";
  const date = formatDate(bill.lastActionDate);
  const showDescription = bill.description && bill.description !== bill.title;

  return (
    <div className="border border-[#C9C2B2] bg-white/40 p-5 hover:bg-white/70 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-2">
        <span className="font-data text-xs uppercase tracking-wide text-[#52616F]">
          {bill.billNumber}
          {bill.year ? ` · ${bill.year}` : ""}
        </span>
        <span
          className="font-data text-xs uppercase tracking-wide px-2 py-0.5 border whitespace-nowrap"
          style={{ color: statusColor, borderColor: statusColor }}
        >
          {bill.status}
        </span>
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
          <span className="font-data text-xs uppercase tracking-wide">Last action: </span>
          {bill.lastAction}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="font-data text-xs uppercase tracking-wide text-[#9C7A29]">
          {bill.category}
        </span>
        {date && <span className="font-data text-xs text-[#52616F]">{date}</span>}
      </div>
    </div>
  );
}
