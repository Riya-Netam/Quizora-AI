import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FileText, FlaskConical, Sparkles, StickyNote, Type } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input, Select, Textarea } from "../../components/ui/Field";
import { generateApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";

const MODES = [
  { id: "topic", label: "Topic", icon: Type },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "pdf", label: "PDF", icon: FileText },
];
const MAX_PDF_MB = 10;

export default function Generate() {
  const navigate = useNavigate();
  const status = useAsync(() => generateApi.status());
  const [mode, setMode] = useState("topic");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [formError, setFormError] = useState("");
  const fileRef = useRef(null);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    shouldUnregister: true,
    defaultValues: { topic: "", title: "", notes: "", difficulty: "medium", num_questions: 10, num_flashcards: 10, output: "both", demo: false },
  });
  const demo = mode !== "pdf" && watch("demo");
  const st = status.data;
  const aiBlocked = st && !st.ai_available && !demo;
  const limitReached = st && st.remaining_today <= 0 && !demo;

  const onFile = (e) => {
    const f = e.target.files?.[0];
    setFileError("");
    if (!f) { setFile(null); return; }
    if (!f.name.toLowerCase().endsWith(".pdf")) { setFileError("Please choose a PDF file."); setFile(null); return; }
    if (f.size > MAX_PDF_MB * 1024 * 1024) { setFileError(`That file is larger than ${MAX_PDF_MB} MB.`); setFile(null); return; }
    setFile(f);
  };

  const onSubmit = async (v) => {
    setFormError("");
    const shared = { difficulty: v.difficulty, num_questions: Number(v.num_questions), num_flashcards: Number(v.num_flashcards), output: v.output };
    try {
      let set;
      if (mode === "pdf") {
        if (!file) { setFileError("Choose a PDF to upload."); return; }
        const fd = new FormData();
        fd.append("file", file);
        Object.entries(shared).forEach(([k, val]) => fd.append(k, String(val)));
        set = await generateApi.pdf(fd);
      } else if (mode === "notes") {
        set = await generateApi.notes({ ...shared, title: v.title || "My notes", notes: v.notes, demo: v.demo });
      } else {
        set = await generateApi.topic({ ...shared, topic: v.topic, demo: v.demo });
      }
      toast.success(set.is_demo ? "Demo study set created" : "Your study set is ready");
      navigate(`/app/study-sets/${set.id}`);
    } catch (e) {
      setFormError(errorMessage(e, "Generation failed. Please try again."));
    }
  };

  const showQuestionFields = watch("output") !== "flashcards";
  const showCardFields = watch("output") !== "quiz";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold">Create a study set</h1>
      <p className="mt-1 text-mist-600">Choose where the questions should come from.</p>

      {st && (
        <p className="mt-4 rounded-lg bg-brand-50 px-4 py-2.5 text-sm text-brand-900" role="status">
          {st.ai_available
            ? <>You have <strong>{st.remaining_today}</strong> of {st.daily_limit} AI generations left today.</>
            : "AI generation isn't configured on this server yet. You can still try Demo Mode below."}
        </p>
      )}

      <div role="tablist" aria-label="Source type" className="mt-6 inline-flex rounded-xl border border-mist-200 bg-white p-1">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={mode === id} aria-controls="gen-panel"
            onClick={() => { setMode(id); setFormError(""); }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${mode === id ? "bg-brand-600 text-white" : "text-mist-700 hover:bg-mist-100"}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      <form id="gen-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} onSubmit={handleSubmit(onSubmit)} noValidate className="card mt-4 space-y-5 p-5 sm:p-6">
        {formError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800">{formError}</div>}

        {mode === "topic" && (
          <Input label="Topic" placeholder="e.g. Photosynthesis, TCP/IP networking, The French Revolution"
            {...register("topic", { required: "Enter a topic", minLength: { value: 2, message: "Use at least 2 characters" }, maxLength: { value: 200, message: "Keep it under 200 characters" } })} error={errors.topic?.message} />
        )}
        {mode === "notes" && (
          <>
            <Input label="Title" placeholder="e.g. Chapter 4 notes" {...register("title", { maxLength: { value: 200, message: "Keep it under 200 characters" } })} error={errors.title?.message} />
            <Textarea label="Your notes" rows={9} hint="Questions are written only from this text. At least 50 characters."
              {...register("notes", { required: "Paste your notes", minLength: { value: 50, message: "Add a bit more text (at least 50 characters)" }, maxLength: { value: 60000, message: "That's too long. Try a smaller section." } })} error={errors.notes?.message} />
          </>
        )}
        {mode === "pdf" && (
          <div>
            <label htmlFor="pdf-file" className="mb-1.5 block text-sm font-medium text-mist-800">PDF file</label>
            <input ref={fileRef} id="pdf-file" type="file" accept="application/pdf,.pdf" onChange={onFile} aria-invalid={!!fileError} aria-describedby="pdf-hint"
              className="block w-full rounded-lg border border-mist-300 bg-white text-sm file:mr-4 file:cursor-pointer file:border-0 file:bg-brand-100 file:px-4 file:py-2.5 file:font-semibold file:text-brand-800 hover:file:bg-brand-200" />
            <p id="pdf-hint" className="mt-1.5 text-xs text-mist-600">Text-based PDFs up to {MAX_PDF_MB} MB. Scanned images and password-protected files can't be read. The file is not stored.</p>
            {file && <p className="mt-1.5 text-sm text-mist-700">Selected: {file.name}</p>}
            {fileError && <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">{fileError}</p>}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Difficulty" {...register("difficulty")} options={[{ value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }]} />
          <Select label="Create" {...register("output")} options={[{ value: "both", label: "Quiz and flashcards" }, { value: "quiz", label: "Quiz only" }, { value: "flashcards", label: "Flashcards only" }]} />
          {showQuestionFields && (
            <Input label="Number of questions" type="number" inputMode="numeric" hint="1 to 30"
              {...register("num_questions", { required: "Enter a number", min: { value: 1, message: "At least 1" }, max: { value: 30, message: "At most 30" } })} error={errors.num_questions?.message} />
          )}
          {showCardFields && (
            <Input label="Number of flashcards" type="number" inputMode="numeric" hint="1 to 30"
              {...register("num_flashcards", { required: "Enter a number", min: { value: 1, message: "At least 1" }, max: { value: 30, message: "At most 30" } })} error={errors.num_flashcards?.message} />
          )}
        </div>

        {mode !== "pdf" && (
          <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-amber-400 text-brand-600" {...register("demo")} />
            <span>
              <span className="flex items-center gap-1.5 font-semibold text-amber-900"><FlaskConical className="h-4 w-4" aria-hidden="true" /> Demo Mode (no AI)</span>
              <span className="mt-0.5 block text-amber-900">Creates a fixed sample set about computing basics. It ignores your topic or notes and is clearly labelled as demo content.</span>
            </span>
          </label>
        )}

        {aiBlocked && mode !== "pdf" && <p role="alert" className="text-sm font-medium text-amber-800">AI generation isn't available right now. Turn on Demo Mode to try the app.</p>}
        {aiBlocked && mode === "pdf" && <p role="alert" className="text-sm font-medium text-amber-800">PDF generation needs the AI service, which isn't configured on this server.</p>}
        {limitReached && <p role="alert" className="text-sm font-medium text-amber-800">You've used today's AI generations. Come back tomorrow, or try Demo Mode.</p>}

        <div className="flex items-center gap-4">
          <Button type="submit" size="lg" loading={isSubmitting} disabled={aiBlocked || limitReached}>
            <Sparkles className="h-4 w-4" aria-hidden="true" /> {isSubmitting ? "Generating" : "Generate"}
          </Button>
          {isSubmitting && <p role="status" className="text-sm text-mist-600">This can take up to a minute. Please keep this page open.</p>}
        </div>
      </form>
    </div>
  );
}
