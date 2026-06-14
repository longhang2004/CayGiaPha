package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.LegalDocument;
import com.caygiapha.familytree.entity.UserConsent;
import com.caygiapha.familytree.repository.LegalDocumentRepository;
import com.caygiapha.familytree.repository.UserConsentRepository;
import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link ConsentService} consent capture and re-acceptance checking (Requirements
 * 23.2, 23.4).
 */
class ConsentServiceTest {

    private LegalDocumentRepository legalDocumentRepository;
    private UserConsentRepository userConsentRepository;
    private ConsentService service;

    @BeforeEach
    void setUp() {
        legalDocumentRepository = mock(LegalDocumentRepository.class);
        userConsentRepository = mock(UserConsentRepository.class);
        service = new ConsentService(legalDocumentRepository, userConsentRepository);
        stubCurrent(ConsentService.TOS, 1);
        stubCurrent(ConsentService.PRIVACY, 1);
    }

    @Test
    void recordsAcceptanceOfCurrentVersionOfBothDocuments() {
        UUID userId = UUID.randomUUID();

        service.recordConsent(userId); // 23.2

        verify(userConsentRepository, org.mockito.Mockito.times(2)).save(any(UserConsent.class));
    }

    @Test
    void hasCurrentConsentTrueWhenBothAcceptedAtCurrentVersion() {
        UUID userId = UUID.randomUUID();
        stubLatestConsent(userId, ConsentService.TOS, 1);
        stubLatestConsent(userId, ConsentService.PRIVACY, 1);

        assertThat(service.hasCurrentConsent(userId)).isTrue();
    }

    @Test
    void hasCurrentConsentFalseWhenAVersionWasBumped() {
        UUID userId = UUID.randomUUID();
        // Privacy bumped to v2 but the user only accepted v1 -> re-acceptance required (23.4).
        stubCurrent(ConsentService.PRIVACY, 2);
        stubLatestConsent(userId, ConsentService.TOS, 1);
        stubLatestConsent(userId, ConsentService.PRIVACY, 1);

        assertThat(service.hasCurrentConsent(userId)).isFalse();
    }

    @Test
    void hasCurrentConsentFalseWhenUserNeverConsented() {
        UUID userId = UUID.randomUUID();
        when(userConsentRepository.findFirstByUserIdAndDocTypeOrderByVersionDesc(any(), any()))
                .thenReturn(Optional.empty());

        assertThat(service.hasCurrentConsent(userId)).isFalse();
    }

    @Test
    void needsReacceptanceTrueWhenAStoredConsentIsBehindCurrent() {
        UUID userId = UUID.randomUUID();
        stubCurrent(ConsentService.PRIVACY, 2); // bumped
        stubLatestConsent(userId, ConsentService.TOS, 1);
        stubLatestConsent(userId, ConsentService.PRIVACY, 1); // stale

        assertThat(service.needsReacceptance(userId)).isTrue(); // 23.4
    }

    @Test
    void needsReacceptanceFalseWhenConsentIsCurrent() {
        UUID userId = UUID.randomUUID();
        stubLatestConsent(userId, ConsentService.TOS, 1);
        stubLatestConsent(userId, ConsentService.PRIVACY, 1);

        assertThat(service.needsReacceptance(userId)).isFalse();
    }

    @Test
    void needsReacceptanceFalseWhenNoConsentRecordExists() {
        UUID userId = UUID.randomUUID();
        when(userConsentRepository.findFirstByUserIdAndDocTypeOrderByVersionDesc(any(), any()))
                .thenReturn(Optional.empty());

        assertThat(service.needsReacceptance(userId)).isFalse(); // not blocked by the gate
    }

    private void stubCurrent(String docType, int version) {
        when(legalDocumentRepository.findFirstByDocTypeOrderByVersionDesc(docType))
                .thenReturn(Optional.of(legalDoc(docType, version)));
    }

    private void stubLatestConsent(UUID userId, String docType, int version) {
        when(userConsentRepository.findFirstByUserIdAndDocTypeOrderByVersionDesc(userId, docType))
                .thenReturn(Optional.of(new UserConsent(userId, docType, version)));
    }

    private static LegalDocument legalDoc(String docType, int version) {
        try {
            var ctor = LegalDocument.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            LegalDocument doc = ctor.newInstance();
            setField(doc, "docType", docType);
            setField(doc, "version", version);
            setField(doc, "body", "body");
            return doc;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void setField(Object target, String name, Object value)
            throws ReflectiveOperationException {
        Field f = target.getClass().getDeclaredField(name);
        f.setAccessible(true);
        f.set(target, value);
    }
}
