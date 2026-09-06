const STATUS_COLORS = {
  Introduced: "#52616F",
  "In Committee": "#9C7A29",
  Passed: "#3F6B4F",
  Signed: "#3F6B4F",
  Failed: "#8B3A3A",
};

export default function BillCard({ bill }) {
  const statusColor = STATUS_COLORS[bill.status] || "#52616F";

  return (
    <div className="border border-[#C9C2B2] bg-white/40 p-5 hover:bg-white/70 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-2">
        <span className="font-data text-xs uppercase tracking-wide text-[#52616F]">
          {bill.state} · {bill.billNumber}
        </span>
        <span
          className="font-data text-xs uppercase tracking-wide px-2 py-0.5 border"
          style={{ color: statusColor, borderColor: statusColor }}
        >
          {bill.status}
        </span>
      </div>
      <h3 className="font-display text-lg text-[#1C2B3A] mb-1 leading-snug">
        {bill.title}
      </h3>
      <p className="text-sm text-[#3A4653] mb-3">{bill.description}</p>
      <div className="flex items-center justify-between">
        <span className="font-data text-xs uppercase tracking-wide text-[#9C7A29]">
          {bill.category}
        </span>
        <span className="font-data text-xs text-[#52616F]">
          {bill.lastActionDate}
        </span>
      </div>
    </div>
  );
}
