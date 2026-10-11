import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { attemptApi } from "../../api/services";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime, formatDuration } from "../../utils/format";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function AttemptDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useAsync(() => attemptApi.get(id), [id]);
  const [onlyWrong, setOnlyWrong] = useState(false);

  if (loading && !data) return <div role="status" aria-label="Loading results" className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>;
  if (error) return <ErrorState message={error === "Attempt not found" ? "We couldn't find that quiz attempt." : error} onRetry={reload} />;
  if (!data) return null;

  const pct = Math.round(data.percentage);
  const tone = pct >= 80 ? "green" : pct >= 50 ? "amber" : "red";
  const review = onlyWrong ? data.review.filter((r) => !r.is_correct) : data.review;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link to="/app/attempts" className="link text-sm">Back to quiz history</Link>
        <h1 className="mt-3 text-3xl font-bold">Results{data.study_set_title ? `: ${data.study_set_title}` : ""}</h1>
        <p className="mt-1 text-sm text-mist-600">{formatDateTime(data.created_at)}{data.duration_seconds != null && ` · ${formatDuration(data.duration_seconds)}`}</p>
      </div>

      <section aria-labelledby="score-h" className="card p-6">
        <h2 id="score-h" className="sr-only">Your score</h2>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div><p className="font-display text-6xl font-bold text-brand-700">{pct}%</p><Badge tone={tone}>{pct >= 80 ? "Great work" : pct >= 50 ? "Getting there" : "Keep practicing"}</Badge></div>
          <dl className="grid grid-cols-3 gap-8 text-center">
            <div><dt className="text-sm text-mist-600">Correct</dt><dd className="font-display text-2xl font-bold text-emerald-700">{data.correct_count}</dd></div>
            <div><dt className="text-sm text-mist-600">Incorrect</dt><dd className="font-display text-2xl font-bold text-red-700">{data.incorrect_count}</dd></div>
            <div><dt className="text-sm text-mist-600">Total</dt><dd className="font-display text-2xl font-bold">{data.total_questions}</dd></div>
          </dl>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`/app/study-sets/${data.study_set_id}/quiz`}><Button><RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry quiz</Button></Link>
          <Link to={`/app/study-sets/${data.study_set_id}`}><Button variant="secondary">View study set</Button></Link>
        </div>
      </section>

      <section aria-labelledby="review-h">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="review-h" className="text-xl font-semibold">Review</h2>
          {data.incorrect_count > 0 && (
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} className="h-4 w-4 rounded border-mist-300 text-brand-600" /> Show incorrect answers only</label>
          )}
        </div>
        {review.length === 0 && <p className="card mt-4 p-5 text-sm text-mist-700">{onlyWrong ? "Nothing to show." : "Perfect score. There are no incorrect answers to review."}</p>}
        <ol className="mt-4 space-y-4">
          {review.map((r, i) => (
            <li key={r.question_id} className="card p-5">
              <div className="flex items-start gap-3">
                {r.is_correct ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Correct" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-label="Incorrect" />}
                <h3 className="font-sans text-base font-semibold leading-snug">{i + 1}. {r.text}</h3>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {r.options.map((o, oi) => {
                  const correct = oi === r.correct_index;
                  const picked = oi === r.selected_index;
                  return (
                    <li key={oi} className={`rounded-lg px-3 py-2 ${correct ? "bg-emerald-50 font-medium text-emerald-900" : picked ? "bg-red-50 text-red-900" : "text-mist-700"}`}>
                      <span className="font-semibold">{LETTERS[oi]}.</span> {o}
                      {correct && <span className="ml-2 text-xs">(correct answer)</span>}
                      {picked && !correct && <span className="ml-2 text-xs">(your answer)</span>}
                    </li>
                  );
                })}
                {r.selected_index == null && <li className="px-3 text-xs italic text-mist-600">You didn't answer this question.</li>}
              </ul>
              <p className="mt-3 text-sm text-mist-700"><span className="font-semibold">Why:</span> {r.explanation}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
