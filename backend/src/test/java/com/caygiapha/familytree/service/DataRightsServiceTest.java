package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.SubjectNodeSummary;
import com.caygiapha.familytree.entity.Claim;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Tree;
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
import com.caygiapha.familytree.service.DataRightsService.EraseStrategy;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Unit tests for {@link DataRightsService} erase strategies and account cascade (Requirement 22.3, 22.4). */
class DataRightsServiceTest {

    private PersonRepository personRepository;
    private RelationshipRepository relationshipRepository;
    private ClaimRepository claimRepository;
    private TreeRepository treeRepository;
    private TreeShareTokenRepository treeShareTokenRepository;
    private SessionRepository sessionRepository;
    private UserRepository userRepository;
    private UserConsentRepository userConsentRepository;
    private VerificationCodeRepository verificationCodeRepository;
    private PersonDeletionService personDeletionService;
    private ClaimService claimService;
    private AuthorizationService authorizationService;
    private DataRightsService service;

    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        personRepository = mock(PersonRepository.class);
        relationshipRepository = mock(RelationshipRepository.class);
        claimRepository = mock(ClaimRepository.class);
        treeRepository = mock(TreeRepository.class);
        treeShareTokenRepository = mock(TreeShareTokenRepository.class);
        sessionRepository = mock(SessionRepository.class);
        userRepository = mock(UserRepository.class);
        userConsentRepository = mock(UserConsentRepository.class);
        verificationCodeRepository = mock(VerificationCodeRepository.class);
        personDeletionService = mock(PersonDeletionService.class);
        claimService = mock(ClaimService.class);
        authorizationService = mock(AuthorizationService.class);
        service = new DataRightsService(
                personRepository, relationshipRepository, claimRepository, treeRepository,
                treeShareTokenRepository, sessionRepository, userRepository, userConsentRepository,
                verificationCodeRepository, personDeletionService, claimService, authorizationService);
        when(authorizationService.requireAuthenticatedViewer())
                .thenReturn(AuthContext.authenticated(userId, null));
    }

    @Test
    void anonymizeOverwritesIdentifyingFieldsAndDetachesClaim() {
        UUID personId = UUID.randomUUID();
        Person person = new Person(UUID.randomUUID(), "Nguyễn Văn A", "male");
        person.setBirthYear(1990);
        person.setBirthOrder(2);
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(claimService.isLinkedUser(eq(personId), any())).thenReturn(true);

        service.eraseNode(personId, EraseStrategy.ANONYMIZE);

        assertThat(person.getDisplayName()).isEqualTo("(đã ẩn)");
        assertThat(person.getBirthYear()).isNull();
        assertThat(person.getBirthOrder()).isNull();
        verify(personRepository).save(person);
        verify(claimRepository).deleteByPersonIdIn(List.of(personId)); // claim detached
    }

    @Test
    void deleteStrategyUsesNeighborPreservation() {
        UUID personId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        Person person = new Person(treeId, "B", "female");
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(claimService.isLinkedUser(eq(personId), any())).thenReturn(true);

        service.eraseNode(personId, EraseStrategy.DELETE);

        verify(personDeletionService).execute(treeId, personId, "preserve");
    }

    @Test
    void deleteAccountCascadesOwnedTreeAndUserData() {
        UUID treeId = UUID.randomUUID();
        Tree tree = new Tree(userId);
        setId(tree, treeId);
        UUID p1 = UUID.randomUUID();
        Person person = new Person(treeId, "C", "male");
        when(treeRepository.findAllByOwnerUserIdOrderByCreatedAtAsc(userId)).thenReturn(List.of(tree));
        when(relationshipRepository.findByTreeId(tree.getId())).thenReturn(List.of());
        when(personRepository.findByTreeId(tree.getId())).thenReturn(List.of(person));
        lenient().when(sessionRepository.findByUserId(userId)).thenReturn(List.of());

        UUID result = service.deleteAccount();

        assertThat(result).isEqualTo(userId);
        verify(treeShareTokenRepository).deleteByTreeId(tree.getId());
        verify(treeRepository).delete(tree);
        verify(claimRepository).deleteByUserId(userId);
        verify(userConsentRepository).deleteByUserId(userId);
        verify(verificationCodeRepository).deleteByUserId(userId);
        verify(userRepository).deleteById(userId);
    }

    @Test
    void listSubjectNodesReturnsOnlyNodesLinkedToTheAuthenticatedUser() {
        UUID personId = UUID.randomUUID();
        UUID treeId = UUID.randomUUID();
        Person person = new Person(treeId, "Nguyễn Văn A", "male");
        setId(person, personId);
        Tree tree = new Tree(UUID.randomUUID(), "Nam", "Họ Nguyễn");
        setId(tree, treeId);
        Claim claim = new Claim(personId, userId);
        when(claimRepository.findByUserId(userId)).thenReturn(List.of(claim));
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(treeRepository.findById(treeId)).thenReturn(Optional.of(tree));

        List<SubjectNodeSummary> nodes = service.listSubjectNodes();

        assertThat(nodes).singleElement().satisfies(row -> {
            assertThat(row.personId()).isEqualTo(personId);
            assertThat(row.treeId()).isEqualTo(treeId);
            assertThat(row.displayName()).isEqualTo("Nguyễn Văn A");
            assertThat(row.treeName()).isEqualTo("Họ Nguyễn");
        });
        verify(claimRepository).findByUserId(userId);
    }

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
