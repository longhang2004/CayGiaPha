package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.ViewpointAddressesResponse;
import com.caygiapha.familytree.dto.ViewpointAddressesResponse.TargetAddress;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.repository.PersonRepository;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link ViewpointAddressService} — the change-viewpoint all-addresses computation
 * (Requirements 10.1, 10.2, 10.3, 10.4).
 *
 * <p>The service is exercised with a real {@link KinshipResolver} and a real
 * {@link KinshipGraphProjection} (built from in-memory edges via a stubbed projection cache) so the
 * end-to-end BFS + derivation path is verified; only the {@link PersonRepository} is mocked.
 */
class ViewpointAddressServiceTest {

    private static final UUID TREE_ID = UUID.randomUUID();

    private final PersonRepository personRepository = mock(PersonRepository.class);

    // --- Family fixture: grandfather -> father -> {ego, sibling}, plus an isolated stranger ----

    private final List<Person> persons = new ArrayList<>();
    private final List<Relationship> edges = new ArrayList<>();

    private final UUID gf = person("male", 1, 1940);
    private final UUID father = person("male", 2, 1970);
    private final UUID ego = person("male", 2, 1995);
    private final UUID siblingElder = person("female", 1, 1992);
    private final UUID child = person("female", 1, 2020);
    private final UUID stranger = person("male", 1, 1990); // isolated: no edges -> unresolved

    ViewpointAddressServiceTest() {
        father(gf, father);
        father(father, ego);
        father(father, siblingElder);
        father(ego, child);
        // `stranger` participates in no edge, so it is absent from the projection -> no path.
    }

    private ViewpointAddressService newService() {
        when(personRepository.findByTreeId(TREE_ID)).thenReturn(persons);
        KinshipGraphProjectionCache cache = mock(KinshipGraphProjectionCache.class);
        lenient()
                .when(cache.getProjection(TREE_ID))
                .thenReturn(KinshipGraphProjection.fromEdges(TREE_ID, edges));
        return new ViewpointAddressService(personRepository, cache, new KinshipResolver());
    }

    @Test
    void computesAnAddressForEveryOtherNodeAndExcludesEgoItself() {
        when(personRepository.existsByIdAndTreeId(ego, TREE_ID)).thenReturn(true);

        ViewpointAddressesResponse response = newService().computeAddresses(TREE_ID, ego);

        assertThat(response.egoId()).isEqualTo(ego);
        // Every other person node appears exactly once; ego itself is not addressed (10.1).
        assertThat(response.addresses()).hasSize(persons.size() - 1);
        assertThat(response.addresses().stream().map(TargetAddress::personId))
                .containsExactlyInAnyOrder(gf, father, siblingElder, child, stranger)
                .doesNotContain(ego);
    }

    @Test
    void resolvesReachableRelativesToCanonicalDescriptors() {
        when(personRepository.existsByIdAndTreeId(ego, TREE_ID)).thenReturn(true);

        Map<UUID, TargetAddress> byId = newService().computeAddresses(TREE_ID, ego).addresses()
                .stream()
                .collect(Collectors.toMap(TargetAddress::personId, a -> a));

        // father: one up, paternal, self order.
        TargetAddress toFather = byId.get(father);
        assertThat(toFather.resolved()).isTrue();
        assertThat(toFather.unresolvedIndicator()).isNull();
        assertThat(toFather.relation().upCount()).isEqualTo(1);
        assertThat(toFather.relation().downCount()).isEqualTo(0);
        assertThat(toFather.relation().side()).isEqualTo("PATERNAL");

        // grandfather: two up.
        assertThat(byId.get(gf).relation().upCount()).isEqualTo(2);

        // elder sibling: one up, one down, elder branch.
        TargetAddress toSibling = byId.get(siblingElder);
        assertThat(toSibling.resolved()).isTrue();
        assertThat(toSibling.relation().upCount()).isEqualTo(1);
        assertThat(toSibling.relation().downCount()).isEqualTo(1);
        assertThat(toSibling.relation().branchOrder()).isEqualTo("ELDER");

        // child: one down.
        assertThat(byId.get(child).relation().downCount()).isEqualTo(1);
    }

    @Test
    void marksUnreachableTargetsWithTheUnresolvedIndicator() {
        when(personRepository.existsByIdAndTreeId(ego, TREE_ID)).thenReturn(true);

        Map<UUID, TargetAddress> byId = newService().computeAddresses(TREE_ID, ego).addresses()
                .stream()
                .collect(Collectors.toMap(TargetAddress::personId, a -> a));

        TargetAddress toStranger = byId.get(stranger);
        assertThat(toStranger.resolved()).isFalse(); // 10.3
        assertThat(toStranger.relation()).isNull();
        assertThat(toStranger.unresolvedIndicator())
                .isEqualTo(ViewpointAddressesResponse.UNRESOLVED_INDICATOR);
        assertThat(toStranger.status()).isEqualTo("UNRESOLVED_NO_PATH");
    }

    @Test
    void rejectsNonexistentEgoLeavingViewpointUnchanged() {
        UUID ghost = UUID.randomUUID();
        when(personRepository.existsByIdAndTreeId(ghost, TREE_ID)).thenReturn(false);

        ViewpointAddressService service =
                new ViewpointAddressService(
                        personRepository, mock(KinshipGraphProjectionCache.class),
                        new KinshipResolver());

        assertThatThrownBy(() -> service.computeAddresses(TREE_ID, ghost))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NODE_NOT_ACCESSIBLE)); // 10.4
        // Nothing was read or computed for a rejected viewpoint (no mutation of state).
        verify(personRepository, never()).findByTreeId(TREE_ID);
    }

    // --- Fixture helpers ----------------------------------------------------------------------

    private UUID person(String gender, Integer birthOrder, Integer birthYear) {
        UUID id = UUID.randomUUID();
        Person p = new Person(TREE_ID, "P", gender);
        p.setBirthOrder(birthOrder);
        p.setBirthYear(birthYear);
        setId(p, id);
        persons.add(p);
        return id;
    }

    private void father(UUID parent, UUID childId) {
        edges.add(new Relationship(
                TREE_ID, RelationshipService.TYPE_BLOODLINE_FATHER, parent, childId));
    }

    /** Persons are persisted with a generated id; for unit tests we set it reflectively. */
    private static void setId(Person person, UUID id) {
        try {
            Field field = Person.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(person, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Unable to set Person id for test fixture", e);
        }
    }
}
