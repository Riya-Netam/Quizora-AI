import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, RotateCw, Shuffle, Target } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { ErrorState, Skeleton } from "../../components/ui/Feedback";
import { studyApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";

const RATINGS = [
  { id: "hard", label: "Hard", style: "border-red-300 bg-red-50 text-red-900 hover:bg-red-100" },
  { id: "medium", label: "Medium", style: "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" },
  { id: "easy", label: "Easy", style: "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100" },
];
const shuffled = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function Deck({ set, initialProgress }) {
  const [progress, setProgress] = useState(initialProgress); // card id -> latest rating
  const [focus, setFocus] = useState(false); // revision mode: skip cards already rated easy
  const [order, setOrder] = useState(() => set.flashcards.map((c) => c.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);

  const byId = useMemo(() => Object.fromEntries(set.flashcards.map((c) => [c.id, c])), [set.flashcards]);
  const deck = useMemo(() => {
    const ids = focus ? order.filter((id) => progress[id] !== "easy") : order;
    // in revision mode show hard cards first, then unrated, then medium
    if (!focus) return ids;
    const rank = (id) => ({ hard: 0, undefined: 1, medium: 2 }[progress[id]] ?? 1);
    return [...ids].sort((a, b) => rank(a) - rank(b));
  }, [order, focus, progress]);

  const card = byId[deck[Math.min(index, Math.max(deck.length - 1, 0))]];
  const counts = useMemo(() => {
    const c = { easy: 0, medium: 0, hard: 0 };
    Object.values(progress).forEach((v) => { if (c[v] !== undefined) c[v] += 1; });
    return c;
  }, [progress]);

  const go = useCallback((delta) => { setFlipped(false); setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(deck.length - 1, 0))); }, [deck.length]);

  const rate = async (confidence) => {
    if (!card || saving) return;
    setSaving(true);
    try {
      await studyApi.reviewFlashcard(card.id, confidence);
      setProgress((p) => ({ ...p, [card.id]: confidence }));
      if (index < deck.length - 1 && !(focus && confidence === "easy")) go(1); else setFlipped(false);
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't save that rating. Please try again."));
    } finally { setSaving(false); }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const doShuffle = () => { setOrder(shuffled(order)); setIndex(0); setFlipped(false); toast.success("Deck shuffled"); };
  const toggleFocus = () => { setFocus((f) => !f); setIndex(0); setFlipped(false); };

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/app/study-sets/${set.id}`} className="link text-sm">Back to study set</Link>
      <h1 className="mt-3 text-3xl font-bold">{set.title}</h1>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mist-700" aria-live="polite">
          {deck.length > 0 ? <>Card {Math.min(index + 1, deck.length)} of {deck.length}</> : "No cards to show"}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={doShuffle}><Shuffle className="h-4 w-4" aria-hidden="true" /> Shuffle</Button>
          <Button variant={focus ? "primary" : "secondary"} size="sm" aria-pressed={focus} onClick={toggleFocus}><Target className="h-4 w-4" aria-hidden="true" /> Revision mode</Button>
        </div>
      </div>
      {focus && <p className="mt-2 text-sm text-mist-600">Showing cards you haven't mastered, hardest first. Rating a card Easy removes it from this view.</p>}

      {!card ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-lg font-semibold">You've mastered every card.</p>
          <p className="mt-1 text-sm text-mist-600">Turn off revision mode to go through the full deck again.</p>
          <Button className="mt-5" onClick={toggleFocus}>Show all cards</Button>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => setFlipped((f) => !f)} aria-label={flipped ? "Showing answer. Press to show the question" : "Showing question. Press to reveal the answer"}
            className="card mt-6 flex min-h-[16rem] w-full flex-col items-center justify-center p-8 text-center transition-colors hover:border-brand-300">
            <span key={`${card.id}-${flipped}`} className="flip-in block">
              <span className="block text-sm font-medium text-mist-600">{flipped ? "Answer" : "Question"}</span>
              <span className="mt-3 block whitespace-pre-line font-display text-2xl font-semibold leading-snug">{flipped ? card.back : card.front}</span>
            </span>
            <span className="mt-6 inline-flex items-center gap-1.5 text-xs text-mist-500"><RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> {flipped ? "Press to flip back" : "Press to flip"}</span>
          </button>

          <div className="mt-5 flex items-center justify-between gap-3">
            <Button variant="secondary" onClick={() => go(-1)} disabled={index === 0}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</Button>
            <Button variant="secondary" onClick={() => go(1)} disabled={index >= deck.length - 1}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
          </div>

          {flipped && (
            <div className="mt-6" role="group" aria-label="How well did you know this?">
              <p className="mb-2 text-sm font-medium text-mist-700">How well did you know it?</p>
              <div className="grid grid-cols-3 gap-3">
                {RATINGS.map((r) => (
                  <button key={r.id} type="button" disabled={saving} onClick={() => rate(r.id)} className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${r.style} ${progress[card.id] === r.id ? "ring-2 ring-brand-600" : ""}`}>{r.label}</button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p className="mt-8 text-sm text-mist-600">Your ratings so far: {counts.easy} easy, {counts.medium} medium, {counts.hard} hard, {set.flashcards.length - counts.easy - counts.medium - counts.hard} not yet rated.</p>
    </div>
  );
}

export default function Flashcards() {
  const { id } = useParams();
  const set = useAsync(() => studyApi.get(id), [id]);
  const prog = useAsync(() => studyApi.flashcardProgress(id), [id]);
  const loading = (set.loading && !set.data) || (prog.loading && !prog.data);
  if (loading) return <div role="status" aria-label="Loading flashcards" className="mx-auto max-w-2xl space-y-4"><Skeleton className="h-10" /><Skeleton className="h-64" /></div>;
  if (set.error || prog.error) return <ErrorState message={set.error || prog.error} onRetry={() => { set.reload(); prog.reload(); }} />;
  if (!set.data || !prog.data) return null;
  if (set.data.flashcards.length === 0) return <ErrorState message="This study set has no flashcards yet. Add some from the study set page." />;
  return <Deck set={set.data} initialProgress={prog.data.progress} />;
}
