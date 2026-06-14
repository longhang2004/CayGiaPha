package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.ClaimRepository;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.repository.SessionRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.TreeShareTokenRepository;
import com.caygiapha.familytree.repository.UserConsentRepository;
import com.caygiapha.familytree.repository.UserRepository;
import com.caygiapha.familytree.repository.VerificationCodeRepository;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthorizationService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;

/**
 * Property-based test for design <strong>Property 29: Data-rights subject-only access</strong>.
 *
 * <p>Feature: vietnamese-family-tree, Property 29
 *
 * <p>For <em>any</em> requester and target node, a data-rights export succeeds <em>if and only if</em>
 * the requester is authenticated and is the node's linked {@code Claimed_Node} user (the data
 * subject); otherwise it is rejected with {@code NOT_AUTHORIZED} and no data is returned
 * (Requirements 22.1, 22.5).
 */
class DataRightsSubjectAccessProperties {

    @Property
    void exportAllowedIffAuthenticatedSubject(
            @ForAll boolean authenticated, @ForAll boolean linked) {
        UUID personId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        PersonRepository personRepository = mock(PersonRepository.class);
        RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);
        ClaimService claimService = mock(ClaimService.class);
        AuthorizationService authorizationService = mock(AuthorizationService.class);

        if (authenticated) {
            when(authorizationService.requireAuthenticatedViewer())
                    .thenReturn(AuthContext.authenticated(userId, null));
        } else {
            when(authorizationService.requireAuthenticatedViewer())
                    .thenThrow(ApiException.notAuthorized("auth required"));
        }
        lenient().when(personRepository.findById(personId))
                .thenReturn(Optional.of(new Person(UUID.randomUUID(), "A", "male")));
        lenient().when(claimService.isLinkedUser(eq(personId), any())).thenReturn(linked);
        lenient().when(relationshipRepository.findBySourceIdOrTargetId(personId, personId))
                .thenReturn(List.of());

        DataRightsService service = new DataRightsService(
                personRepository, relationshipRepository, mock(ClaimRepository.class),
                mock(TreeRepository.class), mock(TreeShareTokenRepository.class),
                mock(SessionRepository.class), mock(UserRepository.class),
                mock(UserConsentRepository.class), mock(VerificationCodeRepository.class),
                mock(PersonDeletionService.class), claimService, authorizationService);

        if (authenticated && linked) {
            assertThatCode(() -> service.exportNode(personId)).doesNotThrowAnyException();
        } else {
            assertThatThrownBy(() -> service.exportNode(personId))
                    .isInstanceOfSatisfying(ApiException.class,
                            ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
        }
    }
}
