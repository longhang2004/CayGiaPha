package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.LegalDocumentRepository;
import com.caygiapha.familytree.repository.UserConsentRepository;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;

/**
 * Property-based test for design <strong>Property 30: Consent gate at sign-up</strong>.
 *
 * <p>Feature: vietnamese-family-tree, Property 30
 *
 * <p>For <em>any</em> combination of Terms-of-Service and Privacy-Policy acceptance flags, sign-up
 * verification is allowed to proceed (and thus an account/tree may be created) <em>if and only if</em>
 * both documents are accepted; otherwise the consent gate rejects the request with a field-level
 * {@code VALIDATION_ERROR} so nothing is created (Requirements 23.2, 23.3).
 */
class ConsentGateProperties {

    private final ConsentService consentService = new ConsentService(
            mock(LegalDocumentRepository.class), mock(UserConsentRepository.class));

    @Property
    void consentGatePassesIffBothAccepted(
            @ForAll boolean acceptedTos, @ForAll boolean acceptedPrivacy) {
        if (acceptedTos && acceptedPrivacy) {
            assertThatCode(() -> consentService.requireConsent(acceptedTos, acceptedPrivacy))
                    .doesNotThrowAnyException();
        } else {
            assertThatThrownBy(() -> consentService.requireConsent(acceptedTos, acceptedPrivacy))
                    .isInstanceOfSatisfying(ApiException.class,
                            ex -> {
                                org.assertj.core.api.Assertions.assertThat(ex.code())
                                        .isEqualTo(ErrorCode.VALIDATION_ERROR);
                                org.assertj.core.api.Assertions.assertThat(ex.field())
                                        .isIn("acceptedTos", "acceptedPrivacy");
                            });
        }
    }
}
