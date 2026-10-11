import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { FlaskConical, Layers, Pencil, Play, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Field";
import { Badge, ErrorState, Skeleton, difficultyTone } from "../../components/ui/Feedback";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { attemptApi, studyApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { formatDate, SOURCE_LABELS, titleCase } from "../../utils/format";
import QuestionEditor from "./QuestionEditor";

function TitleForm({ set, onSaved, onCancel }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { title: set.title, description: set.description || "" } });
  const onSubmit = async (v) => {
    try {
      const updated = await studyApi.update(set.id, { title: v.title.trim(), description: v.description.trim() || null });
      toast.success("Details saved");
      onSaved(updated);
    } catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-4 p-5">
      <Input label="Title" {...register("title", { required: "Title is required", maxLength: { value: 200, message: "Keep it under 200 characters" } })} error={errors.title?.message} />
      <Textarea label="Description (optional)" rows={3} {...register("description", { maxLength: { value: 2000, message: "Keep it under 2000 characters" } })} error={errors.description?.message} />
      <div className="flex gap-2"><Button type="submit" loading={isSubmitting}>Save changes</Button><Button variant="secondary" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}

export default function StudySetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => studyApi.get(id), [id]);
  const attempts = useAsync(() => attemptApi.list({ study_set_id: id, page_size: 5 }), [id]);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { document.title = data ? `${data.title} · Quizora AI` : "Quizora AI"; }, [data]);

  const remove = async () => {
    setDeleting(true);
    try { await studyApi.remove(id); toast.success("Study set deleted"); navigate("/app/study-sets", { replace: true }); }
    catch (e) { toast.error(errorMessage(e)); setDeleting(false); }
  };

  if (loading && !data) return <div role="status" aria-label="Loading study set" className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-24" /><Skeleton className="h-48" /></div>;
  if (error) return <ErrorState message={error === "Study set not found" ? "We couldn't find that study set. It may have been deleted." : error} onRetry={reload} />;
  if (!data) return null;

  const hasQuestions = data.questions.length > 0;
  const hasCards = data.flashcards.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/app/study-sets" className="link text-sm">Back to study sets</Link>
        {editing ? (
          <div className="mt-3"><TitleForm set={data} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} /></div>
        ) : (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold">{data.title}</h1>
              {data.description && <p className="mt-2 max-w-2xl text-mist-600">{data.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={data.is_demo ? "amber" : "brand"}>{SOURCE_LABELS[data.source_type]}</Badge>
                <Badge tone={difficultyTone[data.difficulty]}>{titleCase(data.difficulty)}</Badge>
                <span className="text-sm text-mist-600">Created {formatDate(data.created_at)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit details</Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete</Button>
            </div>
          </div>
        )}
      </div>

      {data.is_demo && (
        <div role="note" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p><strong>Demo content.</strong> This set is a fixed sample. No AI request was made, and it isn't based on your material.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card flex flex-col p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Play className="h-5 w-5 text-brand-600" aria-hidden="true" /> Quiz</h2>
          <p className="mt-1 text-sm text-mist-600">{data.questions.length} questions. Timed or untimed, scored on the server.</p>
          <div className="mt-auto pt-4">
            {hasQuestions ? <Link to={`/app/study-sets/${id}/quiz`}><Button>Start quiz</Button></Link> : <p className="text-sm text-mist-600">Add questions below to unlock the quiz.</p>}
          </div>
        </div>
        <div className="card flex flex-col p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Layers className="h-5 w-5 text-brand-600" aria-hidden="true" /> Flashcards</h2>
          <p className="mt-1 text-sm text-mist-600">{data.flashcards.length} cards with flip, shuffle and confidence ratings.</p>
          <div className="mt-auto pt-4">
            {hasCards ? <Link to={`/app/study-sets/${id}/flashcards`}><Button>Revise flashcards</Button></Link> : <p className="text-sm text-mist-600">Add flashcards below to start revising.</p>}
          </div>
        </div>
      </div>

      <QuestionEditor setId={data.id} questions={data.questions} flashcards={data.flashcards} onChanged={reload} />

      <section aria-labelledby="past-h">
        <h2 id="past-h" className="text-lg font-semibold">Past attempts</h2>
        {attempts.data && attempts.data.items.length === 0 && <p className="mt-2 text-sm text-mist-600">No attempts yet.</p>}
        {attempts.data && attempts.data.items.length > 0 && (
          <ul className="mt-3 space-y-2">
            {attempts.data.items.map((a) => (
              <li key={a.id}>
                <Link to={`/app/attempts/${a.id}`} className="card flex items-center justify-between p-4 hover:border-brand-300">
                  <span className="text-sm font-medium">{a.correct_count} of {a.total_questions} correct ({Math.round(a.percentage)}%)</span>
                  <span className="text-xs text-mist-600">{formatDate(a.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog open={confirmDelete} danger loading={deleting} title="Delete this study set?"
        message="Its questions, flashcards and quiz history will be permanently deleted. This can't be undone."
        confirmLabel="Delete study set" onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
    </div>
  );
}
