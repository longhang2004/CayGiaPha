import { FeedbackSection } from "@/components/support/SupportFeedbackSection";

export default function FeedbackPage() {
  return (
    <main className="support-page">
      <section className="support-feedback support-feedback--single" aria-labelledby="feedback-title">
        <FeedbackSection />
      </section>
    </main>
  );
}
