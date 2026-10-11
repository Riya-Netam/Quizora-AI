import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, BookOpenCheck, CheckCircle2, FileText, Layers, ShieldCheck, Sparkles, Timer, XCircle } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";

// A fixed sample (not an AI call) so visitors can feel the quiz flow before signing up.
const SAMPLE = {
  question: "Why does a hash table give near-constant lookup time?",
  options: [
    "It scans entries in sorted order",
    "A hash function maps a key straight to a bucket",
    "It stores keys in a balanced tree",
    "It caches the last lookup only",
  ],
  correct: 1,
  explanation: "The hash function turns a key into an index, so you jump to the right bucket instead of searching every entry.",
};

function SampleQuestion() {
  const [picked, setPicked] = useState(null);
  const answered = picked !== null;
  return (
    <div className="card p-6 sm:p-7">
      <p className="text-sm font-medium text-mist-600">Sample question, try it</p>
      <h2 className="mt-2 text-xl font-semibold leading-snug">{SAMPLE.question}</h2>
      <div role="radiogroup" aria-label="Answer options" className="mt-5 space-y-2.5">
        {SAMPLE.options.map((opt, i) => {
          const isCorrect = i === SAMPLE.correct;
          const isPicked = i === picked;
          let style = "border-mist-300 bg-white hover:border-brand-400 hover:bg-brand-50";
          if (answered && isCorrect) style = "border-emerald-500 bg-emerald-50";
          else if (answered && isPicked) style = "border-red-400 bg-red-50";
          else if (answered) style = "border-mist-200 bg-white opacity-70";
          return (
            <button key={opt} type="button" role="radio" aria-checked={isPicked} disabled={answered} onClick={() => setPicked(i)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${style}`}>
              <span>{opt}</span>
              {answered && isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Correct answer" />}
              {answered && isPicked && !isCorrect && <XCircle className="h-5 w-5 shrink-0 text-red-600" aria-label="Your answer, incorrect" />}
            </button>
          );
        })}
      </div>
      <div aria-live="polite" className="mt-4 min-h-[3.5rem] text-sm text-mist-700">
        {answered && (
          <>
            <p className="font-semibold">{picked === SAMPLE.correct ? "Correct." : "Not quite."}</p>
            <p className="mt-1">{SAMPLE.explanation}</p>
            <button type="button" className="link mt-2 text-sm" onClick={() => setPicked(null)}>Try again</button>
          </>
        )}
      </div>
    </div>
  );
}

const features = [
  { icon: Sparkles, title: "Quizzes from anything you study", text: "Type a topic, paste your notes or upload a PDF. Quizora writes multiple-choice questions with explanations for every answer." },
  { icon: Layers, title: "Flashcards with revision mode", text: "Flip, shuffle and rate each card easy, medium or hard. Your ratings are saved so hard cards come back first." },
  { icon: Timer, title: "Timed or relaxed practice", text: "Turn the timer on for exam practice or off for calm review. Scores are checked on the server, so they can't be edited in the browser." },
  { icon: BookOpenCheck, title: "Learn from mistakes", text: "After each quiz, review every wrong answer next to the correct one and the reasoning behind it." },
  { icon: BarChart3, title: "Progress you can trust", text: "Charts and your study streak come from your saved attempts and reviews, never from made-up numbers." },
  { icon: ShieldCheck, title: "Your material stays yours", text: "Study sets are private to your account. Uploaded PDFs are read for text and not kept." },
];

const steps = [
  { title: "Add your material", text: "Enter a topic, paste notes or upload a PDF." },
  { title: "Choose the format", text: "Pick difficulty, how many questions and whether you want flashcards too." },
  { title: "Practice and review", text: "Take the quiz, flip the cards and check the explanations." },
  { title: "Track what improves", text: "See scores and streaks build up over time." },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <>
      <section className="border-b border-mist-200 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <div>
            <h1 className="font-display text-4xl font-bold leading-[1.1] sm:text-5xl">Turn what you're studying into practice you can actually do.</h1>
            <p className="mt-5 max-w-xl text-lg text-mist-600">
              Quizora AI builds quizzes and flashcards from your own notes, PDFs and topics, then tracks how you improve.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link to="/app/dashboard"><Button size="lg">Go to your dashboard</Button></Link>
              ) : (
                <>
                  <Link to="/register"><Button size="lg">Create a free account</Button></Link>
                  <Link to="/login"><Button size="lg" variant="secondary">Log in</Button></Link>
                </>
              )}
            </div>
            <p className="mt-4 text-sm text-mist-600">Free to use. Daily generation limits keep the service sustainable.</p>
          </div>
          <SampleQuestion />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="max-w-2xl text-3xl font-bold">Everything you need between reading and the exam</h2>
        <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-mist-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-mist-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold">How it works</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-mist-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-brand-900 p-8 text-white sm:flex-row sm:items-center sm:p-12">
          <div>
            <h2 className="text-3xl font-bold !text-white">Start with the notes you already have.</h2>
            <p className="mt-2 max-w-lg text-brand-100">Paste a page of notes and have a quiz ready in under a minute.</p>
          </div>
          <Link to={user ? "/app/generate" : "/register"} className="shrink-0">
            <Button size="lg" className="!bg-white !text-brand-800 hover:!bg-brand-50">{user ? "Create a quiz" : "Sign up free"}</Button>
          </Link>
        </div>
        <p className="mt-6 flex items-center gap-2 text-sm text-mist-600"><FileText className="h-4 w-4" aria-hidden="true" /> Works with typed topics, pasted notes and text-based PDFs.</p>
      </section>
    </>
  );
}
