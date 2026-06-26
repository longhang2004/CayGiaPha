import { SignUpFlow } from "@/components/auth/SignUpFlow";

export default function SignUpPage() {
  return (
    <div className="auth-container">
      <SignUpFlow redirectTo="/tree" />
    </div>
  );
}
