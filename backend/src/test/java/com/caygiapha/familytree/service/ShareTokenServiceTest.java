package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.TreeShareToken;
import com.caygiapha.familytree.repository.TreeShareTokenRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link ShareTokenService} (Requirement 19.4, 19.5):
 *
 * <ul>
 *   <li>an issued token is high-entropy, returned in plaintext, and stored only as a hash (never in
 *       plaintext);</li>
 *   <li>a presented token resolves to its tree while active, and not after revocation;</li>
 *   <li>issuing a new token revokes the prior active token (at most one active per tree);</li>
 *   <li>a null/blank/unknown token resolves to empty.</li>
 * </ul>
 *
 * <p>Backed by a tiny in-memory repository stub so the issue→resolve→revoke lifecycle is exercised
 * without a database.
 */
class ShareTokenServiceTest {

    /** Minimal in-memory stand-in for the JPA repository covering the methods the service uses. */
    private final List<TreeShareToken> store = new ArrayList<>();
    private TreeShareTokenRepository repository;
    private ShareTokenService service;

    @BeforeEach
    void setUp() {
        repository = mock(TreeShareTokenRepository.class);
        when(repository.save(any(TreeShareToken.class))).thenAnswer(inv -> {
            TreeShareToken t = inv.getArgument(0);
            store.add(t);
            return t;
        });
        when(repository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(repository.findByTreeIdAndRevokedAtIsNull(any(UUID.class))).thenAnswer(inv -> {
            UUID treeId = inv.getArgument(0);
            return store.stream()
                    .filter(t -> t.getTreeId().equals(treeId) && t.isActive())
                    .toList();
        });
        when(repository.findByTokenHashAndRevokedAtIsNull(any(String.class))).thenAnswer(inv -> {
            String hash = inv.getArgument(0);
            return store.stream()
                    .filter(t -> t.getTokenHash().equals(hash) && t.isActive())
                    .findFirst();
        });
        service = new ShareTokenService(repository);
    }

    @Test
    void issuedTokenResolvesToItsTreeAndIsStoredOnlyAsHash() {
        UUID treeId = UUID.randomUUID();

        String token = service.issueToken(treeId);

        assertThat(token).isNotBlank();
        assertThat(token.length()).isGreaterThanOrEqualTo(40); // 32 bytes base64url ~ 43 chars
        // Stored row holds the hash, never the plaintext token.
        assertThat(store).singleElement().satisfies(row -> {
            assertThat(row.getTokenHash()).isNotEqualTo(token);
            assertThat(row.getTokenHash()).isEqualTo(ShareTokenService.hash(token));
        });
        assertThat(service.resolveTreeId(token)).contains(treeId); // 19.4
    }

    @Test
    void revokedTokenNoLongerResolves() {
        UUID treeId = UUID.randomUUID();
        String token = service.issueToken(treeId);
        assertThat(service.resolveTreeId(token)).contains(treeId);

        service.revokeToken(treeId); // 19.5

        assertThat(service.resolveTreeId(token)).isEmpty();
    }

    @Test
    void issuingANewTokenRevokesThePriorActiveToken() {
        UUID treeId = UUID.randomUUID();
        String first = service.issueToken(treeId);
        String second = service.issueToken(treeId);

        assertThat(second).isNotEqualTo(first);
        assertThat(service.resolveTreeId(first)).isEmpty(); // prior revoked
        assertThat(service.resolveTreeId(second)).contains(treeId);
        assertThat(store.stream().filter(TreeShareToken::isActive)).hasSize(1);
    }

    @Test
    void unknownNullOrBlankTokenResolvesToEmpty() {
        assertThat(service.resolveTreeId(null)).isEmpty();
        assertThat(service.resolveTreeId("")).isEmpty();
        assertThat(service.resolveTreeId("  ")).isEmpty();
        assertThat(service.resolveTreeId("not-a-real-token")).isEmpty();
    }
}
