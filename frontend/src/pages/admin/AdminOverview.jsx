import { Activity, BookOpen, ClipboardCheck, Cpu, UserCheck, UserX, Users } from "lucide-react";
import { ErrorState, Skeleton } from "../../components/ui/Feedback";
import { DailyBars } from "../../components/charts/Charts";
import { adminApi } from "../../api/services";
import { useAsync } from "../../hooks/useAsync";

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-mist-200 bg-white p-5">
      <div className="flex items-center gap-3"><Icon className="h-5 w-5 text-brand-700" aria-hidden="true" /><p className="text-sm font-medium text-mist-600">{label}</p></div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

export default function AdminOverview() {
  const { data, loading, error, reload } = useAsync(() => adminApi.stats(14));
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Platform overview</h1>
      {loading && <div role="status" aria-label="Loading statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Users} label="Registered users" value={data.users_total} />
            <Stat icon={UserCheck} label="Active users" value={data.users_active} />
            <Stat icon={UserX} label="Suspended users" value={data.users_suspended} />
            <Stat icon={BookOpen} label="Study sets" value={data.study_sets} />
            <Stat icon={ClipboardCheck} label="Quiz attempts" value={data.quiz_attempts} />
            <Stat icon={Cpu} label="AI requests" value={data.ai_requests} />
            <Stat icon={Activity} label="AI failures" value={data.ai_failures} />
            <Stat icon={Activity} label="AI failure rate" value={data.ai_requests ? `${Math.round((100 * data.ai_failures) / data.ai_requests)}%` : "-"} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-mist-200 bg-white p-5" aria-labelledby="ai-h">
              <h2 id="ai-h" className="text-lg font-semibold">AI requests, last 14 days</h2>
              <div className="mt-4">{data.ai_over_time.length ? <DailyBars title="AI requests and failures by day" data={data.ai_over_time} bars={[{ key: "requests", label: "Requests", color: "#5842D1" }, { key: "failures", label: "Failures", color: "#E5484D" }]} /> : <p className="py-10 text-center text-sm text-mist-600">No AI requests yet.</p>}</div>
            </section>
            <section className="rounded-2xl border border-mist-200 bg-white p-5" aria-labelledby="su-h">
              <h2 id="su-h" className="text-lg font-semibold">New sign-ups, last 14 days</h2>
              <div className="mt-4">{data.signups_over_time.length ? <DailyBars title="Sign-ups by day" data={data.signups_over_time} bars={[{ key: "signups", label: "Sign-ups", color: "#8F7CF5" }]} /> : <p className="py-10 text-center text-sm text-mist-600">No sign-ups in this period.</p>}</div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
