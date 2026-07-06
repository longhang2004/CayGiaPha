package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.SignUpVerifyResponse;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.UserRepository;
import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.GenerationMode;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.IntRange;
import org.mockito.invocation.InvocationOnMock;

/**
 * Property-based test for design <strong>Property 19: At most one tree per user</strong>.
 *
 * <p>Feature: vietnamese-family-tree, Property 19
 *
 * <p>For any sequence of verification / tree-creation events directed at a single user, that user
 * owns <em>exactly</em> one tree — never zero (a verification creates a tree) and never more than
 * one (repeated verifications reuse the existing tree). The property drives the real code path of
 * {@link AuthService#verifySignUp(String, String)}, which is the only operation that creates a
 * tree on successful verification (13.1) and which must not create an additional tree on
 * subsequent verifications (13.2).
 *
 * <p>The {@link TreeRepository} is an in-memory fake backed by a {@code Map} keyed by
 * {@code owner_user_id}. The map enforces a single tree per owner, mirroring both the
 * {@code trees.owner_user_id} UNIQUE constraint and the read-then-create guard in
 * {@link AuthService}: {@code save} of a second tree for an owner that already owns one is
 * rejected exactly as the database UNIQUE constraint would reject it. Verification is mocked to
 * succeed (the validity-window / lockout behaviour is covered by Properties 1 and 2) so the
 * tree-creation path is always reached.
 *
 * <p>The invariant is checked after <em>every</em> verification event in the sequence (i.e. after
 * every prefix), and the tree's identity is asserted stable across the whole sequence so that
 * "exactly one" means the same single tree throughout, not a churn of replacement trees.
 *
 * <p><strong>Validates: Requirements 13.2</strong>
 */
class AtMostOneTreePerUserProperties {

    private static final String PHONE = "0912345678";
    private static final String EMAIL = "user@example.com";
    private static final String CODE = "123456";

    /**
     * Feature: vietnamese-family-tree, Property 19
     *
     * @param usePhone           whether the single account is identified by phone ({@code true}) or
     *     email ({@code false}) — the identifier channel must not affect the one-tree invariant
     * @param verificationEvents the number of verification/tree-creation events fired at the user
     *     (≥1, including repeated verifications that must reuse the existing tree; 13.2)
     */
    @Property(tries = 200, generation = GenerationMode.RANDOMIZED)
    void userOwnsExactlyOneTreeAfterAnyVerificationSequence(
            @ForAll("identifierChannel") boolean usePhone,
            @ForAll @IntRange(min = 1, max = 25) int verificationEvents) {

        String identifier = usePhone ? PHONE : EMAIL;

        // The single account under test; assigned an id to simulate persistence.
        User user = usePhone ? User.withPhone(PHONE) : User.withEmail(EMAIL);
        setId(user, UUID.randomUUID());

        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(user));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer((InvocationOnMock i) -> i.getArgument(0));

        // In-memory fake repository: one tree per owner, enforced like the UNIQUE constraint.
        Map<UUID, Tree> treesByOwner = new HashMap<>();
        TreeRepository treeRepository = mock(TreeRepository.class);
        when(treeRepository.findFirstByOwnerUserIdOrderByCreatedAtAsc(any(UUID.class)))
                .thenAnswer((InvocationOnMock i) -> Optional.ofNullable(treesByOwner.get(i.getArgument(0))));
        when(treeRepository.existsByOwnerUserId(any(UUID.class)))
                .thenAnswer((InvocationOnMock i) -> treesByOwner.containsKey(i.getArgument(0)));
        when(treeRepository.save(any(Tree.class))).thenAnswer((InvocationOnMock i) -> {
            Tree t = i.getArgument(0);
            UUID owner = t.getOwnerUserId();
            // Mirror the trees.owner_user_id UNIQUE constraint: a second insert for the same owner
            // would be rejected by the database. The service must never reach this branch.
            if (treesByOwner.containsKey(owner)) {
                throw new IllegalStateException(
                        "UNIQUE violation: owner " + owner + " already owns a tree");
            }
            if (t.getId() == null) {
                setId(t, UUID.randomUUID());
            }
            treesByOwner.put(owner, t);
            return t;
        });

        // Verification always succeeds so the tree-creation path is reached on every event.
        VerificationCodeService verificationCodeService = mock(VerificationCodeService.class);
        doNothing().when(verificationCodeService)
                .verifyForAccount(any(), any(), any());

        AuthService service = new AuthService(
                userRepository,
                treeRepository,
                new IdentifierValidator(),
                mock(DuplicateIdentifierChecker.class),
                verificationCodeService,
                mock(SessionService.class),
                null, // googleIdTokenVerifier
                null  // consentService
        );

        UUID firstTreeId = null;
        for (int event = 1; event <= verificationEvents; event++) {
            SignUpVerifyResponse response = service.verifySignUp(identifier, CODE);

            // After every prefix of the sequence the user owns exactly one tree.
            assertThat(treesByOwner)
                    .as("user owns exactly one tree after %d verification event(s)", event)
                    .hasSize(1)
                    .containsKey(user.getId());

            // The single owned tree is exactly the one reported by verification.
            Tree owned = treesByOwner.get(user.getId());
            assertThat(response.treeId()).isEqualTo(owned.getId());

            // The tree's identity is stable: repeated verifications reuse it, never replace it (13.2).
            if (firstTreeId == null) {
                firstTreeId = response.treeId();
            } else {
                assertThat(response.treeId())
                        .as("repeated verification reuses the same single tree")
                        .isEqualTo(firstTreeId);
            }
        }
    }

    /** Both identifier channels (phone / email) must yield the same one-tree guarantee. */
    @Provide
    Arbitrary<Boolean> identifierChannel() {
        return Arbitraries.of(true, false);
    }

    /** Assign a JPA-managed id via reflection for test fixtures. */
    private static void setId(Object entity, UUID id) {
        try {
            Field field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
