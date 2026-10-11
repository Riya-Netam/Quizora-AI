import { useState } from "react";
import { useForm } from "react-hook-form";
import { Check, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input, Select, Textarea } from "../../components/ui/Field";
import { Badge, difficultyTone } from "../../components/ui/Feedback";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { studyApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import { titleCase } from "../../utils/format";

const LETTERS = ["A", "B", "C", "D"];

function QuestionForm({ initial, onSubmit, onCancel, submitLabel }) {
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      text: initial?.text || "", o0: initial?.options?.[0] || "", o1: initial?.options?.[1] || "", o2: initial?.options?.[2] || "", o3: initial?.options?.[3] || "",
      correct: String(initial?.correct_index ?? 0), explanation: initial?.explanation || "", difficulty: initial?.difficulty || "medium",
    },
  });
  const unique = (field) => (v) => {
    const all = [0, 1, 2, 3].filter((i) => `o${i}` !== field).map((i) => getValues(`o${i}`).trim().toLowerCase());
    return !all.includes(v.trim().toLowerCase()) || "Each option must be different";
  };
  const submit = (v) => onSubmit({
    text: v.text.trim(), options: [v.o0, v.o1, v.o2, v.o3].map((o) => o.trim()), correct_index: Number(v.correct),
    explanation: v.explanation.trim(), difficulty: v.difficulty,
  });
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="card space-y-4 border-brand-200 p-5">
      <Textarea label="Question" rows={2} {...register("text", { required: "Enter the question", minLength: { value: 5, message: "At least 5 characters" } })} error={errors.text?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Input key={i} label={`Option ${LETTERS[i]}`} {...register(`o${i}`, { required: "Enter an option", validate: unique(`o${i}`) })} error={errors[`o${i}`]?.message} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Correct answer" {...register("correct")} options={LETTERS.map((l, i) => ({ value: String(i), label: `Option ${l}` }))} />
        <Select label="Difficulty" {...register("difficulty")} options={[{ value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }]} />
      </div>
      <Textarea label="Explanation" rows={2} {...register("explanation", { required: "Explain why the answer is correct" })} error={errors.explanation?.message} />
      <div className="flex gap-2"><Button type="submit" loading={isSubmitting}>{submitLabel}</Button><Button variant="secondary" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}

function CardForm({ initial, onSubmit, onCancel, submitLabel }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { front: initial?.front || "", back: initial?.back || "" } });
  return (
    <form onSubmit={handleSubmit((v) => onSubmit({ front: v.front.trim(), back: v.back.trim() }))} noValidate className="card space-y-4 border-brand-200 p-5">
      <Input label="Front" {...register("front", { required: "Enter the front text" })} error={errors.front?.message} />
      <Textarea label="Back" rows={3} {...register("back", { required: "Enter the back text" })} error={errors.back?.message} />
      <div className="flex gap-2"><Button type="submit" loading={isSubmitting}>{submitLabel}</Button><Button variant="secondary" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}

export default function QuestionEditor({ setId, questions, flashcards, onChanged }) {
  const [key, setKey] = useState(null); // answer key is only fetched when the owner asks to see it
  const [loadingKey, setLoadingKey] = useState(false);
  const [editingQ, setEditingQ] = useState(null); // question id | "new" | null
  const [editingC, setEditingC] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind, id }
  const [busy, setBusy] = useState(false);

  const loadKey = async () => {
    setLoadingKey(true);
    try { setKey(Object.fromEntries((await studyApi.answerKey(setId)).map((q) => [q.id, q]))); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setLoadingKey(false); }
  };
  const refresh = async () => { await onChanged(); if (key) await loadKey(); };

  const saveQuestion = (id) => async (body) => {
    try {
      if (id === "new") await studyApi.addQuestion(setId, body); else await studyApi.updateQuestion(id, body);
      toast.success(id === "new" ? "Question added" : "Question saved");
      setEditingQ(null);
      await refresh();
      if (!key) await loadKey();
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const saveCard = (id) => async (body) => {
    try {
      if (id === "new") await studyApi.addFlashcard(setId, body); else await studyApi.updateFlashcard(id, body);
      toast.success(id === "new" ? "Flashcard added" : "Flashcard saved");
      setEditingC(null);
      await onChanged();
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const doDelete = async () => {
    setBusy(true);
    try {
      if (confirm.kind === "question") await studyApi.removeQuestion(confirm.id); else await studyApi.removeFlashcard(confirm.id);
      toast.success(confirm.kind === "question" ? "Question deleted" : "Flashcard deleted");
      setConfirm(null);
      await refresh();
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-10">
      <section aria-labelledby="q-h">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="q-h" className="text-lg font-semibold">Questions ({questions.length})</h2>
          <div className="flex gap-2">
            {!key && questions.length > 0 && <Button variant="secondary" size="sm" onClick={loadKey} loading={loadingKey}><Eye className="h-4 w-4" aria-hidden="true" /> Show answers and edit</Button>}
            <Button size="sm" onClick={() => { setEditingQ("new"); if (!key) loadKey(); }}><Plus className="h-4 w-4" aria-hidden="true" /> Add question</Button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {editingQ === "new" && <QuestionForm onSubmit={saveQuestion("new")} onCancel={() => setEditingQ(null)} submitLabel="Add question" />}
          {questions.map((q, idx) => {
            const k = key?.[q.id];
            if (editingQ === q.id && k) return <QuestionForm key={q.id} initial={k} onSubmit={saveQuestion(q.id)} onCancel={() => setEditingQ(null)} submitLabel="Save question" />;
            return (
              <article key={q.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-sans text-base font-semibold leading-snug">{idx + 1}. {q.text}</h3>
                  <Badge tone={difficultyTone[q.difficulty]}>{titleCase(q.difficulty)}</Badge>
                </div>
                {k && (
                  <>
                    <ol className="mt-3 space-y-1.5 text-sm">
                      {k.options.map((o, i) => (
                        <li key={o} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${i === k.correct_index ? "bg-emerald-50 font-medium text-emerald-900" : "text-mist-700"}`}>
                          <span className="w-5 font-semibold">{LETTERS[i]}.</span><span className="flex-1">{o}</span>
                          {i === k.correct_index && <><Check className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Correct answer</span></>}
                        </li>
                      ))}
                    </ol>
                    <p className="mt-3 text-sm text-mist-600"><span className="font-semibold text-mist-800">Explanation:</span> {k.explanation}</p>
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditingQ(q.id)}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: "question", id: q.id })}><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete</Button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
          {questions.length === 0 && editingQ !== "new" && <p className="text-sm text-mist-600">No questions yet.</p>}
        </div>
      </section>

      <section aria-labelledby="c-h">
        <div className="flex items-center justify-between gap-3">
          <h2 id="c-h" className="text-lg font-semibold">Flashcards ({flashcards.length})</h2>
          <Button size="sm" onClick={() => setEditingC("new")}><Plus className="h-4 w-4" aria-hidden="true" /> Add flashcard</Button>
        </div>
        <div className="mt-4 space-y-3">
          {editingC === "new" && <CardForm onSubmit={saveCard("new")} onCancel={() => setEditingC(null)} submitLabel="Add flashcard" />}
          {flashcards.map((c) => editingC === c.id ? (
            <CardForm key={c.id} initial={c} onSubmit={saveCard(c.id)} onCancel={() => setEditingC(null)} submitLabel="Save flashcard" />
          ) : (
            <article key={c.id} className="card flex items-start justify-between gap-3 p-4">
              <div className="min-w-0"><p className="font-semibold">{c.front}</p><p className="mt-1 text-sm text-mist-600">{c.back}</p></div>
              <div className="flex shrink-0 gap-1">
                <button type="button" aria-label={`Edit flashcard ${c.front}`} onClick={() => setEditingC(c.id)} className="rounded-lg p-1.5 text-mist-600 hover:bg-mist-100"><Pencil className="h-4 w-4" /></button>
                <button type="button" aria-label={`Delete flashcard ${c.front}`} onClick={() => setConfirm({ kind: "flashcard", id: c.id })} className="rounded-lg p-1.5 text-mist-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
          {flashcards.length === 0 && editingC !== "new" && <p className="text-sm text-mist-600">No flashcards yet.</p>}
        </div>
      </section>

      <ConfirmDialog open={!!confirm} danger loading={busy} title={`Delete this ${confirm?.kind || "item"}?`} message="This can't be undone."
        confirmLabel="Delete" onConfirm={doDelete} onCancel={() => setConfirm(null)} />
    </div>
  );
}
