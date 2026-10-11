import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { useAuth } from "../../context/AuthContext";
import { errorMessage } from "../../api/client";
import AuthShell from "./AuthShell";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: "", password: "" } });

  const onSubmit = async ({ email, password }) => {
    setFormError("");
    try {
      await login({ email, password });
      toast.success("Welcome back");
      const from = location.state?.from;
      navigate(from && from.startsWith("/") ? from : "/app/dashboard", { replace: true });
    } catch (e) {
      setFormError(errorMessage(e, "Could not log in. Please try again."));
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue studying."
      footer={<>New to Quizora? <Link to="/register" className="link">Create an account</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800">{formError}</div>}
        <Input label="Email" type="email" autoComplete="email" autoFocus
          {...register("email", { required: "Enter your email", pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" } })} error={errors.email?.message} />
        <Input label="Password" type="password" autoComplete="current-password"
          {...register("password", { required: "Enter your password" })} error={errors.password?.message} />
        <div className="flex justify-end"><Link to="/forgot-password" className="link text-sm">Forgot your password?</Link></div>
        <Button type="submit" className="w-full" loading={isSubmitting}>Log in</Button>
      </form>
    </AuthShell>
  );
}
