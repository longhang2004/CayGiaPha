import { SignInFlow } from "@/components/auth/SignInFlow";

export default function SignInPage() {
  return (
    <div className="auth-container">
      <SignInFlow redirectTo="/tree" />
    </div>
  );
}
