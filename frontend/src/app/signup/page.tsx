import { SignUpFlow } from "@/components/auth/SignUpFlow";

interface SignUpPageProps {
  searchParams: {
    redirect?: string;
  };
}

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  const redirectTo = searchParams.redirect || "/tree";
  return (
    <div className="auth-container">
      <SignUpFlow redirectTo={redirectTo} />
    </div>
  );
}
