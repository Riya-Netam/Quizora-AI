import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { authApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import AuthShell from "./AuthShell";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: { password: "", confirm: "" } });

  const onSubmit = async ({ password }) => {
    setFormError("");
    try {
      await authApi.resetPassword({ token, new_password: password });
      toast.success("Password updated. You can log in now.");
      navigate("/login", { replace: true });
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  if (!token) {
    return (
      <AuthShell title="Reset link missing" footer={<Link to="/login" className="link">Back to log in</Link>}>
        <p className="text-sm text-mist-700">This page needs a reset link from your email. <Link to="/forgot-password" className="link">Request a new link</Link>.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" footer={<Link to="/login" className="link">Back to log in</Link>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800">
            {formError} <Link to="/forgot-password" className="link">Request a new link</Link>
          </div>
        )}
        <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." autoFocus
          {...register("password", { required: "Choose a password", minLength: { value: 8, message: "Use at least 8 characters" } })} error={errors.password?.message} />
        <Input label="Confirm new password" type="password" autoComplete="new-password"
          {...register("confirm", { required: "Repeat your password", validate: (v) => v === watch("password") || "Passwords don't match" })} error={errors.confirm?.message} />
        <Button type="submit" className="w-full" loading={isSubmitting}>Update password</Button>
      </form>
    </AuthShell>
  );
}
