import { api, resetCsrf } from "./client";

const data = (p) => p.then((r) => r.data);

export const authApi = {
  me: () => data(api.get("/auth/me")),
  register: (body) => data(api.post("/auth/register", body)).finally(resetCsrf),
  login: (body) => data(api.post("/auth/login", body)).finally(resetCsrf),
  logout: () => data(api.post("/auth/logout")).finally(resetCsrf),
  updateProfile: (body) => data(api.patch("/auth/me", body)),
  changePassword: (body) => data(api.post("/auth/change-password", body)).finally(resetCsrf),
  forgotPassword: (body) => data(api.post("/auth/forgot-password", body)),
  resetPassword: (body) => data(api.post("/auth/reset-password", body)),
  deleteAccount: (body) => data(api.delete("/auth/me", { data: body })),
};

export const studyApi = {
  list: (params) => data(api.get("/study-sets", { params })),
  get: (id) => data(api.get(`/study-sets/${id}`)),
  answerKey: (id) => data(api.get(`/study-sets/${id}/answer-key`)),
  create: (body) => data(api.post("/study-sets", body)),
  update: (id, body) => data(api.patch(`/study-sets/${id}`, body)),
  remove: (id) => data(api.delete(`/study-sets/${id}`)),
  addQuestion: (id, body) => data(api.post(`/study-sets/${id}/questions`, body)),
  updateQuestion: (qid, body) => data(api.put(`/questions/${qid}`, body)),
  removeQuestion: (qid) => data(api.delete(`/questions/${qid}`)),
  addFlashcard: (id, body) => data(api.post(`/study-sets/${id}/flashcards`, body)),
  updateFlashcard: (cid, body) => data(api.put(`/flashcards/${cid}`, body)),
  removeFlashcard: (cid) => data(api.delete(`/flashcards/${cid}`)),
  reviewFlashcard: (cid, confidence) => data(api.post(`/flashcards/${cid}/review`, { confidence })),
  flashcardProgress: (id) => data(api.get(`/study-sets/${id}/flashcard-progress`)),
};

export const attemptApi = {
  submit: (setId, body) => data(api.post(`/study-sets/${setId}/attempts`, body)),
  list: (params) => data(api.get("/attempts", { params })),
  get: (id) => data(api.get(`/attempts/${id}`)),
};

export const generateApi = {
  status: () => data(api.get("/generate/status")),
  topic: (body) => data(api.post("/generate/topic", body)),
  notes: (body) => data(api.post("/generate/notes", body)),
  pdf: (formData) => data(api.post("/generate/pdf", formData, { headers: { "Content-Type": "multipart/form-data" } })),
};

export const analyticsApi = {
  dashboard: () => data(api.get("/analytics/dashboard")),
  overview: (days) => data(api.get("/analytics/overview", { params: { days } })),
};

export const feedbackApi = { submit: (body) => data(api.post("/feedback", body)) };

export const adminApi = {
  stats: (days) => data(api.get("/admin/stats", { params: { days } })),
  users: (params) => data(api.get("/admin/users", { params })),
  setUserStatus: (id, status) => data(api.patch(`/admin/users/${id}/status`, { status })),
  feedback: (params) => data(api.get("/admin/feedback", { params })),
  setFeedbackStatus: (id, status) => data(api.patch(`/admin/feedback/${id}`, { status })),
  auditLogs: (params) => data(api.get("/admin/audit-logs", { params })),
  settings: () => data(api.get("/admin/settings")),
  updateSettings: (body) => data(api.put("/admin/settings", body)),
  health: () => data(api.get("/admin/health")),
};
