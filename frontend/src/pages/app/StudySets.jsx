import { useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Library, Search, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Field";
import { Badge, CardSkeletons, EmptyState, ErrorState, difficultyTone } from "../../components/ui/Feedback";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Pagination } from "../../components/ui/Pagination";
import { studyApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import { useAsync, useDebounced } from "../../hooks/useAsync";
import { formatDate, SOURCE_LABELS, titleCase } from "../../utils/format";

const PAGE_SIZE = 12;

export default function StudySets() {
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const dq = useDebounced(q);

  const params = { page, page_size: PAGE_SIZE, sort, ...(dq && { q: dq }), ...(source && { source_type: source }), ...(difficulty && { difficulty }) };
  const { data, loading, error, reload } = useAsync(() => studyApi.list(params), [dq, source, difficulty, sort, page]);
  const filtered = Boolean(dq || source || difficulty);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await studyApi.remove(toDelete.id);
      toast.success("Study set deleted");
      setToDelete(null);
      if (data.items.length === 1 && page > 1) setPage(page - 1); else reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const change = (setter) => (e) => { setter(e.target.value); setPage(1); };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Study sets</h1>
        <Link to="/app/generate"><Button><Sparkles className="h-4 w-4" aria-hidden="true" /> Create new</Button></Link>
      </div>

      <div className="card mt-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Input label="Search" type="search" value={q} onChange={change(setQ)} placeholder="Title or topic" className="pl-9" />
          <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-mist-400" aria-hidden="true" />
        </div>
        <Select label="Source" value={source} onChange={change(setSource)} options={[{ value: "", label: "All sources" }, { value: "topic", label: "Topic" }, { value: "notes", label: "Notes" }, { value: "pdf", label: "PDF" }, { value: "demo", label: "Demo" }, { value: "manual", label: "Manual" }]} />
        <Select label="Difficulty" value={difficulty} onChange={change(setDifficulty)} options={[{ value: "", label: "Any difficulty" }, { value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }]} />
        <Select label="Sort by" value={sort} onChange={change(setSort)} options={[{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "title", label: "Title A to Z" }]} />
      </div>

      <div className="mt-6" aria-live="polite">
        {loading && <CardSkeletons count={6} />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && data.items.length === 0 && (
          filtered
            ? <EmptyState icon={Search} title="No study sets match" description="Try a different search or clear the filters." action={<Button variant="secondary" onClick={() => { setQ(""); setSource(""); setDifficulty(""); setPage(1); }}>Clear filters</Button>} />
            : <EmptyState icon={Library} title="No study sets yet" description="Create one from a topic, your notes or a PDF and it will show up here." action={<Link to="/app/generate"><Button>Create your first set</Button></Link>} />
        )}
        {data && data.items.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((s) => (
              <li key={s.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/app/study-sets/${s.id}`} className="min-w-0 rounded font-display text-lg font-semibold leading-snug hover:text-brand-700">
                    <span className="line-clamp-2">{s.title}</span>
                  </Link>
                  <button type="button" onClick={() => setToDelete(s)} aria-label={`Delete ${s.title}`} className="shrink-0 rounded-lg p-1.5 text-mist-500 hover:bg-red-50 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone={s.is_demo ? "amber" : "brand"}>{SOURCE_LABELS[s.source_type]}</Badge>
                  <Badge tone={difficultyTone[s.difficulty]}>{titleCase(s.difficulty)}</Badge>
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-sm text-mist-600"><Layers className="h-4 w-4" aria-hidden="true" />{s.question_count} questions, {s.flashcard_count} cards</p>
                <p className="mt-auto pt-3 text-xs text-mist-500">Created {formatDate(s.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
      </div>

      <ConfirmDialog open={!!toDelete} danger loading={deleting} title="Delete this study set?"
        message={toDelete ? `"${toDelete.title}" and its questions, flashcards and quiz history will be permanently deleted.` : ""}
        confirmLabel="Delete study set" onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
}
