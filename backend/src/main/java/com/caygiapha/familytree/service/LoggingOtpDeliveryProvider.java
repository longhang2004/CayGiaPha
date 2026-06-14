package com.caygiapha.familytree.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Default development stub for {@link OtpDeliveryProvider}. It does not contact any real SMS/email
 * provider; it simply records that a code was "delivered" to a masked destination.
 *
 * <p>For security it never logs the plaintext code or the full destination at INFO level. The
 * plaintext code is logged only at DEBUG to support local manual testing; production deployments
 * should replace this bean with a real provider and keep DEBUG logging off.
 */
@Component
public class LoggingOtpDeliveryProvider implements OtpDeliveryProvider {

    private static final Logger log = LoggerFactory.getLogger(LoggingOtpDeliveryProvider.class);

    @Override
    public void deliver(String destination, String code, VerificationPurpose purpose) {
        log.info("Delivered {} verification code to {}", purpose.dbValue(), mask(destination));
        log.debug("[dev-only] {} code for {} = {}", purpose.dbValue(), destination, code);
    }

    /** Masks all but the final two characters of a destination for safe logging. */
    private static String mask(String destination) {
        if (destination == null || destination.isBlank()) {
            return "<unknown>";
        }
        int visible = Math.min(2, destination.length());
        int hidden = destination.length() - visible;
        return "*".repeat(hidden) + destination.substring(hidden);
    }
}
