import { useState } from "react";
import { Inbox } from "lucide-react";
import toast from "react-hot-toast";
import { Select } from "../../components/ui/Field";
import { Badge, EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { Pagination } from "../../components/ui/Pagination";
import { adminApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime } from "../../utils/format";

const PAGE_SIZE = 20;
const tone = { new: "amber", reviewed: "brand", resolved: "green" };

export default function AdminFeedback() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => adminApi.feedback({ page, page_size: PAGE_SIZE, ...(status && { status }) }), [status, page]);

  const change = async (item, next) => {
    try { await adminApi.setFeedbackStatus(item.id, next); toast.success(`Marked as ${next}`); reload(); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">Feedback</h1>
        <div className="w-44"><Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: "", label: "All" }, { value: "new", label: "New" }, { value: "reviewed", label: "Reviewed" }, { value: "resolved", label: "Resolved" }]} /></div>
      </div>
      <div className="mt-6">
        {loading && <div role="status" aria-label="Loading feedback" className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && data.items.length === 0 && <EmptyState icon={Inbox} title="No feedback here" description="Messages from the contact page will appear in this list." />}
        {data && data.items.length > 0 && (
          <ul className="space-y-3">
            {data.items.map((f) => (
              <li key={f.id} className="rounded-2xl border border-mist-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-semibold">{f.name || "Anonymous"}{f.email && <span className="ml-2 text-sm font-normal text-mist-600">{f.email}</span>}</p><p className="text-xs text-mist-600">{formatDateTime(f.created_at)}</p></div>
                  <div className="flex items-center gap-3">
                    <Badge tone={tone[f.status]}>{f.status}</Badge>
                    <label className="sr-only" htmlFor={`fb-${f.id}`}>Change status for feedback {f.id}</label>
                    <select id={`fb-${f.id}`} value={f.status} onChange={(e) => change(f, e.target.value)} className="rounded-lg border border-mist-300 bg-white px-2 py-1.5 text-sm">
                      <option value="new">New</option><option value="reviewed">Reviewed</option><option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-mist-800">{f.message}</p>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
      </div>
    </div>
  );
}
