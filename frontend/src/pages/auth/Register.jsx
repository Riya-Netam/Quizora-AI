import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { useAuth } from "../../context/AuthContext";
import { errorMessage } from "../../api/client";
import AuthShell from "./AuthShell";

export default function Register() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: "", email: "", password: "", confirm: "", agree: false },
  });

  const onSubmit = async ({ name, email, password }) => {
    setFormError("");
    try {
      await signUp({ name, email, password });
      toast.success("Account created. Welcome to Quizora!");
      navigate("/app/dashboard", { replace: true });
    } catch (e) {
      setFormError(errorMessage(e, "Could not create your account. Please try again."));
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Free, and ready in a minute."
      footer={<>Already have an account? <Link to="/login" className="link">Log in</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800">{formError}</div>}
        <Input label="Full name" autoComplete="name" autoFocus
          {...register("name", { required: "Enter your name", maxLength: { value: 100, message: "Keep it under 100 characters" } })} error={errors.name?.message} />
        <Input label="Email" type="email" autoComplete="email"
          {...register("email", { required: "Enter your email", pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" } })} error={errors.email?.message} />
        <Input label="Password" type="password" autoComplete="new-password" hint="At least 8 characters."
          {...register("password", { required: "Choose a password", minLength: { value: 8, message: "Use at least 8 characters" }, maxLength: { value: 128, message: "Use 128 characters or fewer" } })} error={errors.password?.message} />
        <Input label="Confirm password" type="password" autoComplete="new-password"
          {...register("confirm", { required: "Repeat your password", validate: (v) => v === watch("password") || "Passwords don't match" })} error={errors.confirm?.message} />
        <div>
          <label className="flex items-start gap-2.5 text-sm text-mist-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-mist-300 text-brand-600" aria-describedby={errors.agree ? "agree-error" : undefined}
              {...register("agree", { required: "Please accept the terms to continue" })} />
            <span>I agree to the <Link to="/terms" className="link" target="_blank">Terms</Link> and <Link to="/privacy" className="link" target="_blank">Privacy policy</Link>.</span>
          </label>
          {errors.agree && <p id="agree-error" role="alert" className="mt-1.5 text-xs font-medium text-red-700">{errors.agree.message}</p>}
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>Create account</Button>
      </form>
    </AuthShell>
  );
}
