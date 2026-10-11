import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Clock, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { ErrorState, Skeleton } from "../../components/ui/Feedback";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { attemptApi, studyApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const pad = (n) => String(n).padStart(2, "0");
const clock = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
const newToken = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function StartScreen({ set, onStart }) {
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState(Math.max(1, Math.ceil(set.questions.length * 0.75)));
  return (
    <div className="mx-auto max-w-xl">
      <Link to={`/app/study-sets/${set.id}`} className="link text-sm">Back to study set</Link>
      <h1 className="mt-3 text-3xl font-bold">{set.title}</h1>
      <div className="card mt-6 space-y-5 p-6">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-mist-700">
          <li>{set.questions.length} multiple-choice questions.</li>
          <li>Move freely between questions and change answers before you submit.</li>
          <li>Unanswered questions count as incorrect. Your score is calculated on the server.</li>
        </ul>
        <div className="rounded-xl bg-mist-50 p-4">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-4 w-4 rounded border-mist-300 text-brand-600" />
            Add a timer
          </label>
          {timed && (
            <div className="mt-3 flex items-center gap-3 text-sm">
              <label htmlFor="minutes" className="text-mist-700">Minutes</label>
              <input id="minutes" type="number" min="1" max="180" value={minutes} onChange={(e) => setMinutes(Math.min(180, Math.max(1, Number(e.target.value) || 1)))}
                className="w-24 rounded-lg border border-mist-300 px-3 py-2" />
              <span className="text-mist-600">The quiz submits automatically when time is up.</span>
            </div>
          )}
        </div>
        <Button size="lg" onClick={() => onStart(timed ? minutes * 60 : null)}>Start quiz</Button>
      </div>
    </div>
  );
}

function QuizRunner({ set, limitSeconds }) {
  const navigate = useNavigate();
  const questions = set.questions;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // question_id -> selected_index
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState(limitSeconds);
  const startedAt = useRef(Date.now());
  const token = useRef(newToken()); // idempotency key: a double submit can only ever create one attempt
  const submittedRef = useRef(false);

  const answeredCount = Object.keys(answers).length;
  const q = questions[index];

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const result = await attemptApi.submit(set.id, {
        client_token: token.current,
        duration_seconds: Math.round((Date.now() - startedAt.current) / 1000),
        answers: questions.map((x) => ({ question_id: x.id, selected_index: answers[x.id] ?? null })),
      });
      navigate(`/app/attempts/${result.id}`, { replace: true });
    } catch (e) {
      submittedRef.current = false; // allow a retry; the same token keeps it safe
      setSubmitting(false);
      setConfirming(false);
      toast.error(errorMessage(e, "Could not submit your quiz. Your answers are still here, so try again."));
    }
  }, [answers, navigate, questions, set.id]);

  useEffect(() => {
    if (limitSeconds == null) return undefined;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [limitSeconds]);

  useEffect(() => {
    if (limitSeconds != null && remaining === 0) { toast("Time's up. Submitting your answers."); submit(); }
  }, [remaining, limitSeconds, submit]);

  const pct = useMemo(() => Math.round((answeredCount / questions.length) * 100), [answeredCount, questions.length]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-mist-700">Question {index + 1} of {questions.length}</p>
        {limitSeconds != null && (
          <p role="timer" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${remaining <= 60 ? "bg-red-100 text-red-800" : "bg-mist-100 text-mist-800"}`}>
            <Clock className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Time left </span>{clock(remaining)}
          </p>
        )}
      </div>
      <div className="mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount} aria-label="Questions answered">
        <div className="h-2 overflow-hidden rounded-full bg-mist-200"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} /></div>
        <p className="mt-1 text-xs text-mist-600">{answeredCount} of {questions.length} answered</p>
      </div>

      <fieldset className="card mt-6 p-6" disabled={submitting}>
        <legend className="sr-only">Question {index + 1}</legend>
        <p className="text-lg font-semibold leading-snug">{q.text}</p>
        <div className="mt-5 space-y-2.5">
          {q.options.map((opt, i) => {
            const selected = answers[q.id] === i;
            return (
              <label key={`${q.id}-${i}`} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-brand-300 ${selected ? "border-brand-600 bg-brand-50 font-medium" : "border-mist-300 hover:border-brand-300 hover:bg-mist-50"}`}>
                <input type="radio" name={`q-${q.id}`} className="mt-0.5 h-4 w-4 text-brand-600" checked={selected} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} />
                <span><span className="font-semibold">{LETTERS[i]}.</span> {opt}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" disabled={index === 0 || submitting} onClick={() => setIndex(index - 1)}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</Button>
        {index < questions.length - 1
          ? <Button disabled={submitting} onClick={() => setIndex(index + 1)}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
          : <Button onClick={() => setConfirming(true)} disabled={submitting}><Send className="h-4 w-4" aria-hidden="true" /> Submit quiz</Button>}
      </div>

      <nav aria-label="Question navigator" className="mt-8">
        <p className="mb-2 text-sm font-medium text-mist-700">Jump to a question</p>
        <ul className="flex flex-wrap gap-2">
          {questions.map((x, i) => {
            const done = answers[x.id] !== undefined;
            return (
              <li key={x.id}>
                <button type="button" onClick={() => setIndex(i)} aria-label={`Question ${i + 1}, ${done ? "answered" : "not answered"}${i === index ? ", current" : ""}`} aria-current={i === index ? "step" : undefined}
                  className={`h-9 w-9 rounded-lg border text-sm font-semibold ${i === index ? "border-brand-700 bg-brand-600 text-white" : done ? "border-brand-300 bg-brand-100 text-brand-800" : "border-mist-300 bg-white text-mist-700 hover:bg-mist-100"}`}>{i + 1}</button>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 text-right"><Button variant="ghost" size="sm" onClick={() => setConfirming(true)} disabled={submitting}>Finish early</Button></div>
      </nav>

      <ConfirmDialog open={confirming} loading={submitting} title="Submit your quiz?"
        message={answeredCount < questions.length ? `You've answered ${answeredCount} of ${questions.length} questions. Unanswered questions will be marked incorrect.` : "You've answered every question. Ready to see your score?"}
        confirmLabel="Submit quiz" onConfirm={submit} onCancel={() => !submitting && setConfirming(false)} />
    </div>
  );
}

export default function Quiz() {
  const { id } = useParams();
  const { data, loading, error, reload } = useAsync(() => studyApi.get(id), [id]);
  const [limit, setLimit] = useState(undefined); // undefined = not started, null = untimed, number = seconds

  if (loading && !data) return <div role="status" aria-label="Loading quiz" className="mx-auto max-w-xl space-y-4"><Skeleton className="h-10" /><Skeleton className="h-64" /></div>;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  if (data.questions.length === 0) return <ErrorState message="This study set has no questions yet. Add some from the study set page." />;
  if (limit === undefined) return <StartScreen set={data} onStart={setLimit} />;
  return <QuizRunner set={data} limitSeconds={limit} />;
}
