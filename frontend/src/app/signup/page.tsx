import { SignUpFlow } from "@/components/auth/SignUpFlow";

export default function SignUpPage() {
  return (
    <section>
      <SignUpFlow redirectTo="/tree" />
    </section>
  );
}
