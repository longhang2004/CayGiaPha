package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.TreeCollaboratorRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthContextHolder;
import com.caygiapha.familytree.security.AuthorizationService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link TreeRegionService}, the region-change operation (Requirements 9.5, 9.6,
 * 13.4):
 *
 * <ul>
 *   <li>a valid region from the owner is accepted and persisted (9.5);</li>
 *   <li>an invalid region is rejected with a field-level error and the previous region retained
 *       (9.6);</li>
 *   <li>a non-owner caller is rejected and nothing is written (13.4).</li>
 * </ul>
 *
 * <p>Ownership is resolved from {@link TreeRepository} (multi-tree model), so the same mock
 * repository is shared by {@link AuthorizationService} and {@link TreeRegionService}.
 */
class TreeRegionServiceTest {

    private final AuthContextHolder holder = new AuthContextHolder();
    private final ClaimService claimService = mock(ClaimService.class);
    private final TreeRepository treeRepository = mock(TreeRepository.class);
    private final AuthorizationService authorizationService =
            new AuthorizationService(
                    holder,
                    claimService,
                    treeRepository,
                    mock(TreeCollaboratorRepository.class),
                    mock(ShareTokenService.class),
                    mock(ConsentService.class));
    private final TreeRegionService service =
            new TreeRegionService(treeRepository, authorizationService);

    @AfterEach
    void tearDown() {
        holder.clear();
    }

    @Test
    void ownerCanChangeToValidRegionAndItIsPersisted() {
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        Tree tree = new Tree(userId); // defaults to region 'Bac'
        assertThat(tree.getRegion()).isEqualTo(Tree.DEFAULT_REGION);

        holder.set(AuthContext.authenticated(userId, treeId));
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));
        when(treeRepository.save(any(Tree.class))).thenAnswer(inv -> inv.getArgument(0));

        Tree result = service.changeRegion(treeId, "Nam"); // 9.5

        assertThat(result.getRegion()).isEqualTo("Nam");
        assertThat(tree.getRegion()).isEqualTo("Nam");
        verify(treeRepository).save(tree);
    }

    @Test
    void ownerCanChangeToEachAcceptedRegion() {
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        Tree tree = new Tree(userId);
        holder.set(AuthContext.authenticated(userId, treeId));
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));
        when(treeRepository.save(any(Tree.class))).thenAnswer(inv -> inv.getArgument(0));

        for (String region : Tree.VALID_REGIONS) { // {Bac, Trung, Nam} all accepted (9.1)
            assertThat(service.changeRegion(treeId, region).getRegion()).isEqualTo(region);
        }
    }

    @Test
    void invalidRegionIsRejectedAndPreviousRegionRetained() {
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        Tree tree = new Tree(userId, "Trung"); // a previously stored region
        holder.set(AuthContext.authenticated(userId, treeId));
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));

        assertThatThrownBy(() -> service.changeRegion(treeId, "Saigon")) // 9.6
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.field()).isEqualTo("region");
                });

        // Previous region retained; nothing persisted.
        assertThat(tree.getRegion()).isEqualTo("Trung");
        verify(treeRepository, never()).save(any(Tree.class));
    }

    @Test
    void nullRegionIsRejected() {
        UUID userId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        Tree tree = new Tree(userId, "Bac");
        holder.set(AuthContext.authenticated(userId, treeId));
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));

        assertThatThrownBy(() -> service.changeRegion(treeId, null))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        assertThat(tree.getRegion()).isEqualTo("Bac");
        verify(treeRepository, never()).save(any(Tree.class));
    }

    @Test
    void nonOwnerIsRejectedWithoutWriting() {
        UUID otherUser = UUID.randomUUID();
        UUID someOtherTree = UUID.randomUUID();
        UUID targetTree = UUID.randomUUID();
        Tree ownedBySomeoneElse = new Tree(UUID.randomUUID());
        // Caller owns a different tree, so is not the owner of targetTree (13.4).
        holder.set(AuthContext.authenticated(otherUser, someOtherTree));
        when(treeRepository.findById(targetTree)).thenReturn(Optional.of(ownedBySomeoneElse));

        assertThatThrownBy(() -> service.changeRegion(targetTree, "Nam"))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));

        verify(treeRepository, never()).save(any(Tree.class));
    }
}
