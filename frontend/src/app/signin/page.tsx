import { SignInFlow } from "@/components/auth/SignInFlow";

export default function SignInPage() {
  return (
    <section>
      <SignInFlow redirectTo="/tree" />
    </section>
  );
}
