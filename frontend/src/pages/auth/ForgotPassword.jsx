import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { MailCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { authApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import AuthShell from "./AuthShell";

export default function ForgotPassword() {
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: "" } });

  const onSubmit = async ({ email }) => {
    setFormError("");
    try {
      await authApi.forgotPassword({ email });
      setDone(true);
    } catch (e) {
      // If the server has no email provider, it says so honestly and we show that message as-is.
      setFormError(errorMessage(e));
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send a reset link."
      footer={<Link to="/login" className="link">Back to log in</Link>}>
      {done ? (
        <div role="status" className="text-center">
          <MailCheck className="mx-auto h-10 w-10 text-brand-600" aria-hidden="true" />
          <p className="mt-3 font-semibold">Check your inbox</p>
          <p className="mt-1 text-sm text-mist-600">If an account exists for that email, a reset link is on its way. It expires in 30 minutes.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {formError && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-900">{formError}</div>}
          <Input label="Email" type="email" autoComplete="email" autoFocus
            {...register("email", { required: "Enter your email", pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" } })} error={errors.email?.message} />
          <Button type="submit" className="w-full" loading={isSubmitting}>Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}
