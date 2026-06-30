import { SignInFlow } from "@/components/auth/SignInFlow";

interface SignInPageProps {
  searchParams: {
    redirect?: string;
  };
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  const redirectTo = searchParams.redirect || "/tree";
  return (
    <div className="auth-container">
      <SignInFlow redirectTo={redirectTo} />
    </div>
  );
}
