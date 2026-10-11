import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { authApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../utils/format";

function Profile() {
  const { user, setUser } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({ defaultValues: { name: user.name } });
  const onSubmit = async ({ name }) => {
    try { setUser(await authApi.updateProfile({ name: name.trim() })); toast.success("Profile updated"); }
    catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <section aria-labelledby="profile-h" className="card p-6">
      <h2 id="profile-h" className="text-lg font-semibold">Profile</h2>
      <p className="mt-1 text-sm text-mist-600">Signed in as {user.email}. Member since {formatDate(user.created_at)}.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 max-w-sm space-y-4">
        <Input label="Display name" autoComplete="name" {...register("name", { required: "Enter your name", maxLength: { value: 100, message: "Keep it under 100 characters" } })} error={errors.name?.message} />
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save profile</Button>
      </form>
    </section>
  );
}

function Password() {
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { current: "", next: "", confirm: "" } });
  const onSubmit = async ({ current, next }) => {
    try { await authApi.changePassword({ current_password: current, new_password: next }); toast.success("Password updated"); reset(); }
    catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <section aria-labelledby="pw-h" className="card p-6">
      <h2 id="pw-h" className="text-lg font-semibold">Change password</h2>
      <p className="mt-1 text-sm text-mist-600">Changing your password signs you out on other devices.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 max-w-sm space-y-4">
        <Input label="Current password" type="password" autoComplete="current-password" {...register("current", { required: "Enter your current password" })} error={errors.current?.message} />
        <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." {...register("next", { required: "Choose a new password", minLength: { value: 8, message: "Use at least 8 characters" } })} error={errors.next?.message} />
        <Input label="Confirm new password" type="password" autoComplete="new-password" {...register("confirm", { required: "Repeat the new password", validate: (v) => v === watch("next") || "Passwords don't match" })} error={errors.confirm?.message} />
        <Button type="submit" loading={isSubmitting}>Update password</Button>
      </form>
    </section>
  );
}

function DeleteAccount() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    if (!password) { setError("Enter your password to confirm."); return; }
    setBusy(true); setError("");
    try { await authApi.deleteAccount({ password }); setUser(null); toast.success("Your account has been deleted"); navigate("/", { replace: true }); }
    catch (e) { setError(errorMessage(e)); setBusy(false); }
  };

  return (
    <section aria-labelledby="del-h" className="rounded-2xl border border-red-200 bg-white p-6">
      <h2 id="del-h" className="text-lg font-semibold text-red-900">Delete account</h2>
      <p className="mt-1 max-w-xl text-sm text-mist-700">Permanently deletes your account, study sets, flashcards, quiz attempts and reviews. This can't be undone.</p>
      <Button variant="danger" className="mt-4" onClick={() => { setOpen(true); setPassword(""); setError(""); }}>Delete my account</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-mist-900/50 p-4 sm:items-center">
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-dialog-h" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift">
            <h2 id="del-dialog-h" className="text-lg font-semibold">Delete your account?</h2>
            <p className="mt-2 text-sm text-mist-600">Enter your password to confirm. Everything you've created will be removed.</p>
            <div className="mt-4"><Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} autoFocus /></div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button variant="danger" onClick={confirm} loading={busy}>Delete account</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Settings() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Account</h1>
      <Profile /><Password /><DeleteAccount />
    </div>
  );
}

