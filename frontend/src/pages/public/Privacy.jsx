export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-bold">Privacy policy</h1>
      <p className="mt-2 text-sm text-mist-600">Last updated: October 11, 2026</p>
      <div className="mt-6 space-y-5 leading-relaxed text-mist-700">
        <p>This policy explains what Quizora AI, a portfolio project, collects and why.</p>
        <h2 className="pt-2 text-2xl font-semibold">What we collect</h2>
        <p>Your name, email address and a hashed password (never the password itself). The study sets, questions, flashcards, quiz attempts and flashcard reviews you create. Basic usage records of AI generation requests (time, status, and token counts where available) used for daily limits and cost control. Feedback you choose to send.</p>
        <h2 className="pt-2 text-2xl font-semibold">How AI generation uses your content</h2>
        <p>When you generate a quiz, the topic, notes or text extracted from your PDF is sent to a third-party AI provider (Google Gemini by default) to produce questions. Do not submit material you are not allowed to share. Uploaded PDFs are processed in memory to extract text and are not stored. Demo Mode makes no AI request.</p>
        <h2 className="pt-2 text-2xl font-semibold">Cookies</h2>
        <p>We use strictly necessary cookies to keep you signed in and protect against cross-site request forgery. We do not use advertising or tracking cookies.</p>
        <h2 className="pt-2 text-2xl font-semibold">Your choices</h2>
        <p>You can edit or delete your study sets at any time, change your password, and delete your account from the Account page. Deleting your account permanently removes your study sets, attempts and reviews.</p>
        <h2 className="pt-2 text-2xl font-semibold">Contact</h2>
        <p>Use the contact page to ask about your data.</p>
      </div>
    </div>
  );
}
