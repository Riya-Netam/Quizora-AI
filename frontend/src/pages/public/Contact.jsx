import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Field";
import { feedbackApi } from "../../api/services";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function Contact() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: user?.name || "", email: user?.email || "", message: "" },
  });

  const onSubmit = async (values) => {
    try {
      await feedbackApi.submit({ name: values.name || null, email: values.email || null, message: values.message });
      setSent(true);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-bold">Contact and feedback</h1>
      <p className="mt-3 text-mist-600">Found a bug, have an idea or want to say something? Your message goes straight to the admin dashboard.</p>
      {sent ? (
        <div role="status" className="card mt-8 flex items-start gap-3 p-6">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
          <div><p className="font-semibold">Thanks, your message was received.</p><p className="mt-1 text-sm text-mist-600">We read every note. If you left an email, we may reply there.</p></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mt-8 space-y-5 p-6">
          <Input label="Name (optional)" autoComplete="name" {...register("name", { maxLength: { value: 100, message: "Keep it under 100 characters" } })} error={errors.name?.message} />
          <Input label="Email (optional)" type="email" autoComplete="email" hint="Only if you'd like a reply."
            {...register("email", { pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" } })} error={errors.email?.message} />
          <Textarea label="Message" rows={6}
            {...register("message", { required: "Please write a message", minLength: { value: 10, message: "Please write at least 10 characters" }, maxLength: { value: 2000, message: "Keep it under 2000 characters" } })}
            error={errors.message?.message} />
          <Button type="submit" loading={isSubmitting}>Send message</Button>
        </form>
      )}
    </div>
  );
}
