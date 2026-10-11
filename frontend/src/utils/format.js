export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";

export const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

export const formatDuration = (seconds) => {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
};

export const SOURCE_LABELS = { topic: "Topic", notes: "Notes", pdf: "PDF", demo: "Demo", manual: "Manual" };
export const titleCase = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
