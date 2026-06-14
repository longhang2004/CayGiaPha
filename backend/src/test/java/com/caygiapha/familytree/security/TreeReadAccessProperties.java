package com.caygiapha.familytree.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.service.ClaimService;
import com.caygiapha.familytree.service.ShareTokenService;
import java.util.Optional;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Property-based test for design <strong>Property 26: Tree read-access enforcement</strong>.
 *
 * <p>Feature: vietnamese-family-tree, Property 26
 *
 * <p>For <em>any</em> tree sharing mode, viewer role, and presented share token, a read is permitted
 * <em>if and only if</em> the (mode, role, token-validity) triple is one of the allowed combinations
 * of Requirement 19: every read requires authentication (19.2); the owner and any user linked to a
 * {@code Claimed_Node} in the tree may always read (19.3); {@code public} trees are readable by any
 * authenticated user (19.6); {@code link} trees additionally by a valid token for that tree (19.4);
 * {@code private} trees only by owner/linked (19.3). A non-existent tree is never readable (19.7).
 *
 * <p>The service is exercised with mocked collaborators reflecting each generated scenario, and the
 * decision is checked against an independent oracle.
 */
class TreeReadAccessProperties {

    /** The generated scenario: which world the mocks describe. */
    enum Viewer { OWNER, LINKED, STRANGER, ANONYMOUS }

    enum Token { NONE, VALID_THIS_TREE, VALID_OTHER_TREE, UNKNOWN }

    record Scenario(boolean treeExists, String sharing, Viewer viewer, Token token) {}

    @Property(tries = 500)
    void readPermittedIffAllowedCombination(@ForAll("scenarios") Scenario s) {
        UUID treeId = UUID.randomUUID();
        UUID otherTreeId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        AuthContextHolder holder = new AuthContextHolder();
        ClaimService claimService = mock(ClaimService.class);
        TreeRepository treeRepository = mock(TreeRepository.class);
        ShareTokenService shareTokenService = mock(ShareTokenService.class);

        // ----- Bind the generated world into the collaborators -----
        UUID ownedTreeId = s.viewer() == Viewer.OWNER ? treeId
                : (s.viewer() == Viewer.ANONYMOUS ? null : otherTreeId);
        holder.set(s.viewer() == Viewer.ANONYMOUS
                ? AuthContext.anonymous()
                : AuthContext.authenticated(userId, ownedTreeId));

        lenient().when(claimService.isLinkedToTree(treeId, userId))
                .thenReturn(s.viewer() == Viewer.LINKED);

        Tree tree = new Tree(UUID.randomUUID());
        tree.setSharing(s.sharing());
        lenient().when(treeRepository.findById(treeId))
                .thenReturn(s.treeExists() ? Optional.of(tree) : Optional.empty());

        String presented = switch (s.token()) {
            case NONE -> null;
            case VALID_THIS_TREE -> "tok-this";
            case VALID_OTHER_TREE -> "tok-other";
            case UNKNOWN -> "tok-unknown";
        };
        lenient().when(shareTokenService.resolveTreeId("tok-this")).thenReturn(Optional.of(treeId));
        lenient().when(shareTokenService.resolveTreeId("tok-other"))
                .thenReturn(Optional.of(otherTreeId));
        lenient().when(shareTokenService.resolveTreeId("tok-unknown")).thenReturn(Optional.empty());

        AuthorizationService service = new AuthorizationService(
                holder, claimService, treeRepository, shareTokenService,
                mock(com.caygiapha.familytree.service.ConsentService.class));

        try {
            boolean actual = service.hasReadAccess(treeId, presented);
            assertThat(actual).isEqualTo(oracle(s));
        } finally {
            holder.clear();
        }
    }

    /** Independent oracle for Requirement 19, not consulting the service under test. */
    private static boolean oracle(Scenario s) {
        if (s.viewer() == Viewer.ANONYMOUS) {
            return false; // 19.2 — reads require authentication.
        }
        if (s.viewer() == Viewer.OWNER || s.viewer() == Viewer.LINKED) {
            return true; // 19.3 — owner / linked family member always.
        }
        if (!s.treeExists()) {
            return false; // 19.7 — unknown tree never readable.
        }
        return switch (s.sharing()) {
            case "public" -> true; // 19.6
            case "link" -> s.token() == Token.VALID_THIS_TREE; // 19.4
            default -> false; // 'private' (19.3)
        };
    }

    @Provide
    Arbitrary<Scenario> scenarios() {
        Arbitrary<Boolean> exists = Arbitraries.of(true, false);
        Arbitrary<String> sharing = Arbitraries.of("private", "link", "public");
        Arbitrary<Viewer> viewer = Arbitraries.of(Viewer.values());
        Arbitrary<Token> token = Arbitraries.of(Token.values());
        return Combinators.combine(exists, sharing, viewer, token).as(Scenario::new);
    }
}
