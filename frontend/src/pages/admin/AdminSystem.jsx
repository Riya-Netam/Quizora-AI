import { CheckCircle2, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { ErrorState, Skeleton } from "../../components/ui/Feedback";
import { adminApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";

function Row({ label, ok, value }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-mist-700">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
        {ok !== undefined && (ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />)}
        {value}
      </span>
    </li>
  );
}

function LimitForm({ current, onSaved }) {
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({ defaultValues: { limit: current } });
  const onSubmit = async ({ limit }) => {
    try { await adminApi.updateSettings({ ai_daily_limit_per_user: Number(limit) }); toast.success("Daily limit updated"); onSaved(); }
    catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 max-w-xs space-y-4">
      <Input label="AI generations per user per day" type="number" inputMode="numeric" hint="0 pauses AI generation for everyone. Demo Mode stays available."
        {...register("limit", { required: "Enter a number", min: { value: 0, message: "Cannot be negative" }, max: { value: 1000, message: "At most 1000" } })} error={errors.limit?.message} />
      <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save limit</Button>
    </form>
  );
}

export default function AdminSystem() {
  const health = useAsync(() => adminApi.health());
  const settings = useAsync(() => adminApi.settings());
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System</h1>

      <section aria-labelledby="health-h" className="rounded-2xl border border-mist-200 bg-white p-5">
        <h2 id="health-h" className="text-lg font-semibold">Application health</h2>
        <p className="text-sm text-mist-600">Status only. Keys, URLs and credentials are never shown here.</p>
        {health.loading && <Skeleton className="mt-4 h-32" />}
        {health.error && <div className="mt-4"><ErrorState message={health.error} onRetry={health.reload} /></div>}
        {health.data && (
          <ul className="mt-3 divide-y divide-mist-100">
            <Row label="Database" ok={health.data.database === "up"} value={health.data.database} />
            <Row label="AI provider configured" ok={health.data.ai_configured} value={`${health.data.ai_provider}${health.data.ai_configured ? "" : " (not configured)"}`} />
            <Row label="Email delivery configured" ok={health.data.email_configured} value={health.data.email_configured ? "yes" : "no"} />
            <Row label="Environment" value={health.data.environment} />
            <Row label="API docs exposed" value={health.data.api_docs_enabled ? "yes" : "no"} />
          </ul>
        )}
      </section>

      <section aria-labelledby="limits-h" className="rounded-2xl border border-mist-200 bg-white p-5">
        <h2 id="limits-h" className="text-lg font-semibold">AI usage limits</h2>
        {settings.loading && <Skeleton className="mt-4 h-24" />}
        {settings.error && <div className="mt-4"><ErrorState message={settings.error} onRetry={settings.reload} /></div>}
        {settings.data && (
          <>
            <p className="mt-1 text-sm text-mist-600">Provider: {settings.data.ai_provider}{settings.data.ai_model && `, model ${settings.data.ai_model}`}. Max questions per request: {settings.data.max_questions}.</p>
            <LimitForm key={settings.data.ai_daily_limit_per_user} current={settings.data.ai_daily_limit_per_user} onSaved={settings.reload} />
          </>
        )}
      </section>
    </div>
  );
}
