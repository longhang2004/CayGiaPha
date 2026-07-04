import { SupportSection } from "@/components/support/SupportFeedbackSection";

export default function SupportPage() {
  return (
    <main className="support-page">
      <section className="support-feedback support-feedback--single" aria-labelledby="support-title">
        <SupportSection plain />
      </section>
    </main>
  );
}
