import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-bold">About Quizora AI</h1>
      <div className="mt-6 space-y-5 text-mist-700 leading-relaxed">
        <p>Quizora AI is a study companion that turns your own material into active practice. Reading notes feels productive, but testing yourself is what makes them stick. Quizora removes the effort of writing the tests.</p>
        <p>You can start from a topic, paste your notes or upload a PDF. Quizora asks an AI model to write multiple-choice questions and flashcards, checks that every item is well formed, and saves it to your private library.</p>
        <h2 className="pt-4 text-2xl font-semibold">What to expect</h2>
        <p>AI can make mistakes, especially on topics without source material. When you generate from notes or a PDF, questions are written from that text, but you should still skim explanations that look off. You can edit or delete any question in your study sets.</p>
        <p>Quizora is a full-stack portfolio project built with React, FastAPI and PostgreSQL. Generation is limited per day to keep it sustainable. If you hit the limit, you can still practice with everything you've saved.</p>
        <p>Questions or suggestions? <Link to="/contact" className="link">Send feedback</Link>.</p>
      </div>
    </div>
  );
}
