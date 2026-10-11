import { useState } from "react";
import { ScrollText } from "lucide-react";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { Pagination } from "../../components/ui/Pagination";
import { adminApi } from "../../api/services";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime } from "../../utils/format";

const PAGE_SIZE = 25;

export default function AdminAudit() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => adminApi.auditLogs({ page, page_size: PAGE_SIZE }), [page]);
  return (
    <div>
      <h1 className="text-3xl font-bold">Audit log</h1>
      <p className="mt-1 text-mist-600">Sensitive actions taken by administrators and system commands, newest first.</p>
      <div className="mt-6">
        {loading && <div role="status" aria-label="Loading audit log" className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && data.items.length === 0 && <EmptyState icon={ScrollText} title="Nothing logged yet" description="Actions like suspending a user or changing limits will be recorded here." />}
        {data && data.items.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-mist-200 bg-white">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Audit log entries</caption>
              <thead className="border-b border-mist-200 bg-mist-50 text-mist-600"><tr><th scope="col" className="px-4 py-3 font-medium">When</th><th scope="col" className="px-4 py-3 font-medium">Action</th><th scope="col" className="px-4 py-3 font-medium">Actor</th><th scope="col" className="px-4 py-3 font-medium">Target</th><th scope="col" className="px-4 py-3 font-medium">Details</th></tr></thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id} className="border-b border-mist-100 align-top last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-mist-600">{formatDateTime(a.created_at)}</td>
                    <td className="px-4 py-3 font-medium">{a.action}</td>
                    <td className="px-4 py-3">{a.actor_id ? `User #${a.actor_id}` : "System"}</td>
                    <td className="px-4 py-3">{a.target_type ? `${a.target_type} ${a.target_id ?? ""}` : "-"}</td>
                    <td className="px-4 py-3 text-xs text-mist-600">{a.meta ? Object.entries(a.meta).map(([k, v]) => `${k}: ${v}`).join(", ") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
      </div>
    </div>
  );
}
