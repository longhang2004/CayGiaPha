import { SignUpFlow } from "@/components/auth/SignUpFlow";
import { safeInternalRedirect } from "@/lib/authRedirect";

interface SignUpPageProps {
  searchParams: {
    redirect?: string;
    reason?: string;
  };
}

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  const redirectTo = safeInternalRedirect(searchParams.redirect, "/tree");
  return (
    <div className="auth-container">
      <SignUpFlow redirectTo={redirectTo} reason={searchParams.reason} />
    </div>
  );
}
