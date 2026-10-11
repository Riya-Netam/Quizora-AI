import { Link } from "react-router-dom";
import { Flame, Layers, Library, Sparkles, Target, Trophy } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge, EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import ScoreTrend from "../../components/charts/ScoreTrend";
import { analyticsApi } from "../../api/services";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { formatDate, SOURCE_LABELS } from "../../utils/format";

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <p className="text-sm font-medium text-mist-600">{label}</p>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-mist-600">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const dash = useAsync(() => analyticsApi.dashboard());
  const trend = useAsync(() => analyticsApi.overview(30));

  const firstName = user?.name?.split(" ")[0] || "there";
  const d = dash.data;
  const isNew = d && d.total_study_sets === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hi {firstName}, ready to study?</h1>
          <p className="mt-1 text-mist-600">Here's where your practice stands.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/generate"><Button><Sparkles className="h-4 w-4" aria-hidden="true" /> Create quiz or flashcards</Button></Link>
          <Link to="/app/study-sets"><Button variant="secondary"><Library className="h-4 w-4" aria-hidden="true" /> Review saved sets</Button></Link>
        </div>
      </div>

      {dash.loading && (
        <div role="status" aria-label="Loading dashboard" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      )}
      {dash.error && <ErrorState message={dash.error} onRetry={dash.reload} />}

      {d && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Library} label="Study sets" value={d.total_study_sets} />
            <Stat icon={Target} label="Quizzes taken" value={d.total_attempts} />
            <Stat icon={Trophy} label="Average score" value={d.average_score == null ? "-" : `${d.average_score}%`} hint={d.average_score == null ? "Take a quiz to see this" : undefined} />
            <Stat icon={Flame} label="Study streak" value={`${d.streak_days} ${d.streak_days === 1 ? "day" : "days"}`} hint={d.streak_days ? undefined : "Take a quiz or review cards today"} />
          </div>

          {isNew ? (
            <EmptyState icon={Sparkles} title="Make your first study set"
              description="Paste some notes, upload a PDF or enter a topic. You'll have a quiz and flashcards in about a minute."
              action={<Link to="/app/generate"><Button>Create your first set</Button></Link>} />
          ) : (
            <>
              <section aria-labelledby="trend-h" className="card p-5 sm:p-6">
                <h2 id="trend-h" className="text-lg font-semibold">Recent performance</h2>
                <p className="text-sm text-mist-600">Average score per day over the last 30 days.</p>
                <div className="mt-4">
                  {trend.loading && <Skeleton className="h-64" />}
                  {trend.error && <ErrorState message={trend.error} onRetry={trend.reload} />}
                  {trend.data && (trend.data.attempts_over_time.length
                    ? <ScoreTrend data={trend.data.attempts_over_time} />
                    : <p className="py-12 text-center text-sm text-mist-600">No quizzes in the last 30 days. Take one to start your trend line.</p>)}
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <section aria-labelledby="sets-h">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 id="sets-h" className="text-lg font-semibold">Recent study sets</h2>
                    <Link to="/app/study-sets" className="link text-sm">View all</Link>
                  </div>
                  <ul className="space-y-3">
                    {d.recent_sets.map((s) => (
                      <li key={s.id}>
                        <Link to={`/app/study-sets/${s.id}`} className="card flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand-300">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{s.title}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-mist-600"><Layers className="h-3.5 w-3.5" aria-hidden="true" />{s.question_count} questions, {s.flashcard_count} cards</p>
                          </div>
                          <Badge tone={s.is_demo ? "amber" : "brand"}>{SOURCE_LABELS[s.source_type]}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>

                <section aria-labelledby="att-h">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 id="att-h" className="text-lg font-semibold">Recent quiz attempts</h2>
                    <Link to="/app/attempts" className="link text-sm">View all</Link>
                  </div>
                  {d.recent_attempts.length === 0 ? (
                    <p className="card p-5 text-sm text-mist-600">No attempts yet. Open a study set and start a quiz.</p>
                  ) : (
                    <ul className="space-y-3">
                      {d.recent_attempts.map((a) => (
                        <li key={a.id}>
                          <Link to={`/app/attempts/${a.id}`} className="card flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand-300">
                            <div>
                              <p className="font-semibold">{a.correct_count} of {a.total_questions} correct</p>
                              <p className="text-xs text-mist-600">{formatDate(a.created_at)}</p>
                            </div>
                            <Badge tone={a.percentage >= 80 ? "green" : a.percentage >= 50 ? "amber" : "red"}>{Math.round(a.percentage)}%</Badge>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
