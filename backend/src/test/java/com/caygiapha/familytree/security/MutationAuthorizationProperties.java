package com.caygiapha.familytree.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.security.AuthorizationService.Role;
import com.caygiapha.familytree.service.ClaimService;
import com.caygiapha.familytree.service.ConsentService;
import com.caygiapha.familytree.service.ShareTokenService;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.GenerationMode;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.mockito.invocation.InvocationOnMock;

/**
 * Property-based test for design <strong>Property 18: Mutation authorization</strong>.
 *
 * <p>Feature: vietnamese-family-tree, Property 18
 *
 * <p>For <em>any</em> authenticated-or-not caller and <em>any</em> create/edit/delete operation, the
 * mutation is permitted <strong>if and only if</strong> the caller is the tree owner, or the caller
 * is the linked {@code Claimed_Node} user editing their <em>own</em> node; every other caller is
 * rejected with {@code NOT_AUTHORIZED} and — because the authorization gate runs before any mutation
 * side effect — the tree contents are left unchanged.
 *
 * <p>The test drives the real {@link AuthorizationService} against a real {@link AuthContextHolder}
 * (its {@link ThreadLocal} is bound per generated case and cleared in a {@code finally} block so no
 * context leaks across cases). {@link ClaimService} is mocked to drive claim linkage: it reports a
 * person as linked to a user exactly when the generated scenario says the node is claimed by that
 * caller.
 *
 * <p>An <strong>independent oracle</strong> computes the expected outcome directly from the scenario
 * facts — permitted iff {@code caller == owner} OR (the operation edits a specific person that is a
 * claimed node linked to the caller) — without consulting the service under test. Each case asserts
 * that (1) {@link AuthorizationService#classify} yields the oracle's role, (2) the enforcement method
 * appropriate to the operation throws {@code NOT_AUTHORIZED} exactly when the oracle rejects, and
 * (3) a guarded mutation side effect (a save counter) fires iff permitted and never fires on
 * rejection, demonstrating the "contents unchanged" guarantee (13.5).
 *
 * <p><strong>Validates: Requirements 11.6, 13.4, 13.5</strong>
 */
class MutationAuthorizationProperties {

    /** How the caller's owned tree relates to the tree the mutation targets. */
    enum OwnedTree {
        /** The caller owns exactly the target tree (the OWNER case; 13.4). */
        TARGET,
        /** The caller owns some other tree (cannot be owner of the target). */
        OTHER,
        /** The caller owns no tree yet. */
        NONE
    }

    /** The category of mutation being attempted. */
    enum Operation {
        /**
         * An owner-level mutation not scoped to a single node — creating a person, creating a
         * relationship, sending a claim invitation (13.4). Enforced via {@code requireOwner}.
         */
        OWNER_LEVEL,
        /**
         * An edit scoped to a specific person node (11.6). Enforced via
         * {@code requireMutationPermitted(treeId, personId)}.
         */
        NODE_EDIT
    }

    /**
     * One generated authorization scenario.
     *
     * @param authenticated whether a valid session resolved to a user
     * @param ownedTree     how the caller's owned tree relates to the target tree
     * @param operation     the kind of mutation attempted
     * @param nodeClaimed   whether the target person is a {@code Claimed_Node}
     * @param claimedBySelf whether that claim links the node to <em>this</em> caller
     */
    record Scenario(
            boolean authenticated,
            OwnedTree ownedTree,
            Operation operation,
            boolean nodeClaimed,
            boolean claimedBySelf) {}

    @Provide
    Arbitrary<Scenario> scenarios() {
        return Combinators.combine(
                        Arbitraries.of(true, false),
                        Arbitraries.of(OwnedTree.values()),
                        Arbitraries.of(Operation.values()),
                        Arbitraries.of(true, false),
                        Arbitraries.of(true, false))
                .as(Scenario::new);
    }

    /**
     * Feature: vietnamese-family-tree, Property 18
     *
     * @param scenario the generated authorization scenario
     */
    @Property(tries = 300, generation = GenerationMode.RANDOMIZED)
    void mutationPermittedIffOwnerOrLinkedClaimedNodeUser(@ForAll("scenarios") Scenario scenario) {
        UUID callerUserId = UUID.randomUUID();
        UUID targetTreeId = UUID.randomUUID();
        // NODE_EDIT targets a specific person; OWNER_LEVEL operations are not node-scoped.
        UUID targetPersonId =
                scenario.operation() == Operation.NODE_EDIT ? UUID.randomUUID() : null;

        UUID ownedTreeId =
                switch (scenario.ownedTree()) {
                    case TARGET -> targetTreeId;
                    case OTHER -> UUID.randomUUID();
                    case NONE -> null;
                };

        // ClaimService reports the target node as linked to this caller exactly when the scenario
        // says the node is claimed and the claim links it to this very caller.
        boolean linkedToCaller = scenario.nodeClaimed() && scenario.claimedBySelf();
        ClaimService claimService = mock(ClaimService.class);
        lenient()
                .when(claimService.isLinkedUser(any(), any()))
                .thenAnswer((InvocationOnMock i) -> {
                    UUID personArg = i.getArgument(0);
                    UUID userArg = i.getArgument(1);
                    return linkedToCaller
                            && targetPersonId != null
                            && targetPersonId.equals(personArg)
                            && callerUserId.equals(userArg);
                });

        AuthContextHolder holder = new AuthContextHolder();
        AuthorizationService service = new AuthorizationService(
                holder, claimService, mock(TreeRepository.class), mock(com.caygiapha.familytree.repository.TreeCollaboratorRepository.class), mock(ShareTokenService.class),
                mock(ConsentService.class));

        // ----- Independent oracle (does not consult the service under test) -----
        boolean isOwner = scenario.authenticated() && scenario.ownedTree() == OwnedTree.TARGET;
        boolean isLinkedClaimedEditor =
                scenario.authenticated()
                        && scenario.operation() == Operation.NODE_EDIT
                        && linkedToCaller;
        Role expectedRole =
                isOwner ? Role.OWNER : (isLinkedClaimedEditor ? Role.LINKED_CLAIMED_USER : Role.NEITHER);
        boolean expectedPermitted =
                switch (scenario.operation()) {
                    case OWNER_LEVEL -> isOwner; // only the owner; a linked user cannot pass.
                    case NODE_EDIT -> isOwner || isLinkedClaimedEditor;
                };

        try {
            holder.set(
                    scenario.authenticated()
                            ? AuthContext.authenticated(callerUserId, ownedTreeId)
                            : AuthContext.anonymous());

            // (1) classification matches the oracle.
            assertThat(service.classify(targetTreeId, targetPersonId))
                    .as("classification for %s", scenario)
                    .isEqualTo(expectedRole);

            // (2)+(3) enforcement gates the mutation: the guarded side effect runs iff permitted,
            // and on rejection it never fires (contents unchanged) and NOT_AUTHORIZED is thrown.
            AtomicInteger mutationSideEffects = new AtomicInteger();
            Runnable guardedMutation =
                    () -> {
                        switch (scenario.operation()) {
                            case OWNER_LEVEL -> service.requireOwner(targetTreeId);
                            case NODE_EDIT ->
                                    service.requireMutationPermitted(targetTreeId, targetPersonId);
                        }
                        // Reached only when the gate above did not throw.
                        mutationSideEffects.incrementAndGet();
                    };

            if (expectedPermitted) {
                assertThatCode(guardedMutation::run)
                        .as("permitted mutation for %s must not throw", scenario)
                        .doesNotThrowAnyException();
                assertThat(mutationSideEffects.get())
                        .as("permitted mutation applies its side effect for %s", scenario)
                        .isEqualTo(1);
            } else {
                assertThatThrownBy(guardedMutation::run)
                        .as("rejected mutation for %s must be NOT_AUTHORIZED", scenario)
                        .isInstanceOfSatisfying(
                                ApiException.class,
                                ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
                assertThat(mutationSideEffects.get())
                        .as("rejected mutation leaves contents unchanged for %s", scenario)
                        .isZero();
            }
        } finally {
            // Prevent the bound context from leaking into the next generated case.
            holder.clear();
        }
    }
}
