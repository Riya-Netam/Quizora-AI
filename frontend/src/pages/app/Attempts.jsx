import { useState } from "react";
import { Link } from "react-router-dom";
import { History } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge, EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { Pagination } from "../../components/ui/Pagination";
import { attemptApi } from "../../api/services";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime, formatDuration } from "../../utils/format";

const PAGE_SIZE = 10;

export default function Attempts() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => attemptApi.list({ page, page_size: PAGE_SIZE }), [page]);
  return (
    <div>
      <h1 className="text-3xl font-bold">Quiz history</h1>
      <p className="mt-1 text-mist-600">Every quiz you've submitted. Open one to review your answers.</p>
      <div className="mt-6">
        {loading && <div role="status" aria-label="Loading history" className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && data.items.length === 0 && (
          <EmptyState icon={History} title="No quizzes taken yet" description="When you finish a quiz, your score and review will appear here."
            action={<Link to="/app/study-sets"><Button>Pick a study set</Button></Link>} />
        )}
        {data && data.items.length > 0 && (
          <ul className="space-y-3">
            {data.items.map((a) => (
              <li key={a.id}>
                <Link to={`/app/attempts/${a.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-brand-300">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.study_set_title || "Deleted study set"}</p>
                    <p className="text-sm text-mist-600">{a.correct_count} of {a.total_questions} correct · {formatDateTime(a.created_at)}{a.duration_seconds != null && ` · ${formatDuration(a.duration_seconds)}`}</p>
                  </div>
                  <Badge tone={a.percentage >= 80 ? "green" : a.percentage >= 50 ? "amber" : "red"}>{Math.round(a.percentage)}%</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
      </div>
    </div>
  );
}
