import { SignInFlow } from "@/components/auth/SignInFlow";
import { AuthReasonToast } from "@/components/auth/AuthReasonToast";
import { safeInternalRedirect } from "@/lib/authRedirect";

interface SignInPageProps {
  searchParams: {
    redirect?: string;
    reason?: string;
  };
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  const redirectTo = safeInternalRedirect(searchParams.redirect, "/tree");
  return (
    <div className="auth-container">
      <AuthReasonToast reason={searchParams.reason} />
      <SignInFlow redirectTo={redirectTo} reason={searchParams.reason} />
    </div>
  );
}
