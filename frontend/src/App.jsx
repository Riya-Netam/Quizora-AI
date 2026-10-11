import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { AdminRoute, ProtectedRoute, PublicOnlyRoute } from "./routes/guards";
import PublicLayout from "./layouts/PublicLayout";
import AppLayout from "./layouts/AppLayout";
import AdminLayout from "./layouts/AdminLayout";
import Landing from "./pages/public/Landing";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import Privacy from "./pages/public/Privacy";
import Terms from "./pages/public/Terms";
import { ErrorBoundary, NotFound, ServerError, Unauthorized } from "./pages/public/StatusPages";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/app/Dashboard";
import Generate from "./pages/app/Generate";
import StudySets from "./pages/app/StudySets";
import StudySetDetail from "./pages/app/StudySetDetail";
import Quiz from "./pages/app/Quiz";
import Flashcards from "./pages/app/Flashcards";
import Attempts from "./pages/app/Attempts";
import AttemptDetail from "./pages/app/AttemptDetail";
import Analytics from "./pages/app/Analytics";
import Settings from "./pages/app/Settings";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminFeedback from "./pages/admin/AdminFeedback";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminSystem from "./pages/admin/AdminSystem";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: "14px" } }} />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/error" element={<ServerError />} />
            </Route>

            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="generate" element={<Generate />} />
                <Route path="study-sets" element={<StudySets />} />
                <Route path="study-sets/:id" element={<StudySetDetail />} />
                <Route path="study-sets/:id/quiz" element={<Quiz />} />
                <Route path="study-sets/:id/flashcards" element={<Flashcards />} />
                <Route path="attempts" element={<Attempts />} />
                <Route path="attempts/:id" element={<AttemptDetail />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="feedback" element={<AdminFeedback />} />
                <Route path="audit" element={<AdminAudit />} />
                <Route path="system" element={<AdminSystem />} />
              </Route>
            </Route>

            <Route element={<PublicLayout />}><Route path="*" element={<NotFound />} /></Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

