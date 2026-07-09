package com.caygiapha.familytree.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Development OTP delivery stub: logs a masked destination. Plaintext codes are logged only under
 * non-production Spring profiles at DEBUG level.
 */
@Component
public class LoggingOtpDeliveryProvider implements OtpDeliveryProvider {

    private static final Logger log = LoggerFactory.getLogger(LoggingOtpDeliveryProvider.class);

    private final Environment environment;

    public LoggingOtpDeliveryProvider(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void deliver(String destination, String code, VerificationPurpose purpose) {
        log.info("Delivered {} verification code to {}", purpose.dbValue(), mask(destination));
        if (allowsPlaintextLog()) {
            log.debug("[dev-only] {} code for {} = {}", purpose.dbValue(), destination, code);
        }
    }

    private boolean allowsPlaintextLog() {
        // Never emit plaintext OTP under production profiles.
        if (environment.matchesProfiles("prod", "production")) {
            return false;
        }
        return log.isDebugEnabled();
    }

    private static String mask(String destination) {
        if (destination == null || destination.isEmpty()) {
            return "<unknown>";
        }
        int visible = Math.min(2, destination.length());
        int hidden = destination.length() - visible;
        return "*".repeat(hidden) + destination.substring(destination.length() - visible);
    }
}
