package com.caygiapha.familytree.support;

import com.caygiapha.familytree.service.OtpDeliveryProvider;
import com.caygiapha.familytree.service.VerificationPurpose;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * A test-double {@link OtpDeliveryProvider} that captures the plaintext code and destination of
 * every delivery so integration tests can assert what the {@code Verification_Service} sent
 * (Requirements 1.3, 2.1, 11.1). It can also be armed to fail, simulating a provider outage to
 * verify that issuance rolls back and persists no half-created code/session/claim (design Security
 * Considerations).
 */
public class RecordingOtpDeliveryProvider implements OtpDeliveryProvider {

    /** A single captured delivery: the destination, the plaintext code, and its purpose. */
    public record Delivery(String destination, String code, VerificationPurpose purpose) {}

    private final List<Delivery> deliveries = new ArrayList<>();
    private boolean failNextDeliveries = false;

    @Override
    public void deliver(String destination, String code, VerificationPurpose purpose) {
        if (failNextDeliveries) {
            // Simulate a provider outage. The throw propagates into the @Mutation transaction so the
            // just-saved verification_codes row is rolled back (no half-issued code persisted).
            throw new OtpDeliveryException("Simulated OTP provider outage");
        }
        deliveries.add(new Delivery(destination, code, purpose));
    }

    /** Arm the provider so the next {@link #deliver} call throws, simulating an outage. */
    public void failNextDelivery() {
        this.failNextDeliveries = true;
    }

    /** Restore normal delivery after a simulated outage. */
    public void resumeDelivery() {
        this.failNextDeliveries = false;
    }

    /** Every delivery captured so far, in order. */
    public List<Delivery> deliveries() {
        return List.copyOf(deliveries);
    }

    /** The most recent delivery, if any. */
    public Optional<Delivery> lastDelivery() {
        return deliveries.isEmpty()
                ? Optional.empty()
                : Optional.of(deliveries.get(deliveries.size() - 1));
    }

    /** The most recent delivery for a given purpose, if any. */
    public Optional<Delivery> lastDelivery(VerificationPurpose purpose) {
        for (int i = deliveries.size() - 1; i >= 0; i--) {
            if (deliveries.get(i).purpose() == purpose) {
                return Optional.of(deliveries.get(i));
            }
        }
        return Optional.empty();
    }

    /** Number of deliveries captured. */
    public int deliveryCount() {
        return deliveries.size();
    }

    /** Forget all captured deliveries (does not change the fail flag). */
    public void clear() {
        deliveries.clear();
    }
}
