import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

vi.mock("../../api/services", () => ({
  studyApi: { get: vi.fn() },
  attemptApi: { submit: vi.fn(), get: vi.fn() },
}));
import { attemptApi, studyApi } from "../../api/services";
import Quiz from "./Quiz";
import AttemptDetail from "./AttemptDetail";
import Landing from "../public/Landing";
import { AuthContext } from "../../context/AuthContext";

const SET = {
  id: 7, title: "Networking basics", is_demo: false,
  questions: [
    { id: 1, text: "What does TCP stand for?", options: ["Transmission Control Protocol", "Total Control Port", "Transfer Cable Protocol", "Terminal Command Prompt"], difficulty: "easy", position: 0 },
    { id: 2, text: "Which layer routes packets?", options: ["Physical", "Network", "Session", "Application"], difficulty: "easy", position: 1 },
  ],
  flashcards: [],
};

const renderQuiz = () => render(
  <MemoryRouter initialEntries={["/app/study-sets/7/quiz"]}>
    <Routes>
      <Route path="/app/study-sets/:id/quiz" element={<Quiz />} />
      <Route path="/app/attempts/:id" element={<p>Results page</p>} />
    </Routes>
  </MemoryRouter>,
);

describe("Quiz flow", () => {
  beforeEach(() => { vi.clearAllMocks(); studyApi.get.mockResolvedValue(SET); });

  it("never shows answers while taking the quiz, and submits only selections", async () => {
    attemptApi.submit.mockResolvedValue({ id: 99 });
    renderQuiz();
    await userEvent.click(await screen.findByRole("button", { name: /start quiz/i }));
    expect(screen.getByText("What does TCP stand for?")).toBeInTheDocument();
    expect(screen.queryByText(/correct answer|explanation/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/Transmission Control Protocol/));
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.click(screen.getByLabelText(/Network/));
    await userEvent.click(screen.getByRole("button", { name: /submit quiz/i }));
    const dialog = screen.getByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Submit quiz" }));

    await waitFor(() => expect(attemptApi.submit).toHaveBeenCalledTimes(1));
    const [setId, body] = attemptApi.submit.mock.calls[0];
    expect(setId).toBe(7);
    expect(body.answers).toEqual([{ question_id: 1, selected_index: 0 }, { question_id: 2, selected_index: 1 }]);
    expect(body).not.toHaveProperty("score");
    expect(body.client_token).toBeTruthy();
    expect(await screen.findByText("Results page")).toBeInTheDocument();
  });

  it("warns about unanswered questions before submitting", async () => {
    renderQuiz();
    await userEvent.click(await screen.findByRole("button", { name: /start quiz/i }));
    await userEvent.click(screen.getByRole("button", { name: /finish early/i }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/answered 0 of 2/i);
  });

  it("shows a timer when enabled", async () => {
    renderQuiz();
    await userEvent.click(await screen.findByLabelText(/add a timer/i));
    await userEvent.click(screen.getByRole("button", { name: /start quiz/i }));
    expect(screen.getByRole("timer")).toBeInTheDocument();
  });
});

describe("Results page", () => {
  it("shows the score, and reviews incorrect answers with explanations", async () => {
    attemptApi.get.mockResolvedValue({
      id: 5, study_set_id: 7, study_set_title: "Networking basics", score: 1, total_questions: 2, correct_count: 1, incorrect_count: 1,
      percentage: 50, duration_seconds: 42, created_at: new Date().toISOString(),
      review: [
        { question_id: 1, text: "What does TCP stand for?", options: ["Transmission Control Protocol", "Total Control Port"], selected_index: 0, correct_index: 0, is_correct: true, explanation: "TCP is the Transmission Control Protocol." },
        { question_id: 2, text: "Which layer routes packets?", options: ["Physical", "Network"], selected_index: 0, correct_index: 1, is_correct: false, explanation: "The network layer handles routing." },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/app/attempts/5"]}>
        <Routes><Route path="/app/attempts/:id" element={<AttemptDetail />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("50%")).toBeInTheDocument();
    expect(screen.getByText("The network layer handles routing.")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/incorrect answers only/i));
    expect(screen.queryByText("TCP is the Transmission Control Protocol.")).not.toBeInTheDocument();
    expect(screen.getByText("The network layer handles routing.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /retry quiz/i })).toHaveAttribute("href", "/app/study-sets/7/quiz");
  });
});

describe("Landing sample question", () => {
  it("reveals the explanation after answering", async () => {
    render(
      <AuthContext.Provider value={{ user: null, loading: false }}>
        <MemoryRouter><Landing /></MemoryRouter>
      </AuthContext.Provider>,
    );
    await userEvent.click(screen.getByRole("radio", { name: /hash function maps a key/i }));
    expect(screen.getByText("Correct.")).toBeInTheDocument();
  });
});
