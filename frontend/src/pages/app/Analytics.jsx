import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import ScoreTrend from "../../components/charts/ScoreTrend";
import { CorrectIncorrectChart, ReviewsChart } from "../../components/charts/Charts";
import { analyticsApi } from "../../api/services";
import { useAsync } from "../../hooks/useAsync";

function Panel({ title, description, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="text-sm text-mist-600">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useAsync(() => analyticsApi.overview(days), [days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Your progress</h1><p className="mt-1 text-mist-600">Built from your saved quiz attempts and flashcard reviews.</p></div>
        <div className="w-48"><Select label="Time range" value={days} onChange={(e) => setDays(Number(e.target.value))}
          options={[{ value: 7, label: "Last 7 days" }, { value: 30, label: "Last 30 days" }, { value: 90, label: "Last 90 days" }, { value: 365, label: "Last year" }]} /></div>
      </div>

      {loading && <div role="status" aria-label="Loading charts" className="space-y-6"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && !data.has_data && (
        <EmptyState icon={BarChart3} title="No activity in this period" description="Take a quiz or review flashcards and your charts will fill in here."
          action={<Link to="/app/study-sets"><Button>Open a study set</Button></Link>} />
      )}

      {data && data.has_data && (
        <>
          <Panel title="Average score trend" description="Average quiz score on each day you practiced.">
            {data.attempts_over_time.length ? <ScoreTrend data={data.attempts_over_time} /> : <p className="py-10 text-center text-sm text-mist-600">No quizzes in this period.</p>}
          </Panel>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Correct and incorrect answers" description="Total answers per day.">
              {data.attempts_over_time.length ? <CorrectIncorrectChart data={data.attempts_over_time} /> : <p className="py-10 text-center text-sm text-mist-600">No quizzes in this period.</p>}
            </Panel>
            <Panel title="Flashcard reviews" description="Cards you rated each day.">
              {data.flashcard_reviews_over_time.length ? <ReviewsChart data={data.flashcard_reviews_over_time} /> : <p className="py-10 text-center text-sm text-mist-600">No flashcard reviews in this period.</p>}
            </Panel>
          </div>
          <Panel title="Accuracy by study set" description="Your most-practiced sets, with average score.">
            {data.accuracy_by_set.length === 0 ? <p className="text-sm text-mist-600">No quizzes in this period.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Accuracy by study set</caption>
                  <thead className="border-b border-mist-200 text-mist-600"><tr><th scope="col" className="py-2 pr-4 font-medium">Study set</th><th scope="col" className="py-2 pr-4 font-medium">Attempts</th><th scope="col" className="py-2 font-medium">Average score</th></tr></thead>
                  <tbody>
                    {data.accuracy_by_set.map((s) => (
                      <tr key={s.study_set_id} className="border-b border-mist-100 last:border-0">
                        <td className="py-3 pr-4 font-medium">{s.title}</td><td className="py-3 pr-4">{s.attempts}</td>
                        <td className="py-3"><div className="flex items-center gap-3"><div className="h-2 w-28 overflow-hidden rounded-full bg-mist-200" aria-hidden="true"><div className="h-full rounded-full bg-brand-600" style={{ width: `${s.average_score}%` }} /></div><span>{s.average_score}%</span></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
