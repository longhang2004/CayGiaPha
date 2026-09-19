package com.caygiapha.familytree.support;

import com.caygiapha.familytree.entity.Claim;
import com.caygiapha.familytree.repository.ClaimRepository;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** In-memory {@link ClaimRepository} for Docker-free integration tests. */
public class InMemoryClaimRepository extends InMemoryRepository<Claim> implements ClaimRepository {

    @Override
    public Optional<Claim> findByPersonId(UUID personId) {
        return all().stream().filter(c -> Objects.equals(c.getPersonId(), personId)).findFirst();
    }

    @Override
    public boolean existsByPersonId(UUID personId) {
        return findByPersonId(personId).isPresent();
    }

    @Override
    public boolean existsByPersonIdAndUserId(UUID personId, UUID userId) {
        return all().stream()
                .anyMatch(c -> Objects.equals(c.getPersonId(), personId)
                        && Objects.equals(c.getUserId(), userId));
    }

    @Override
    public java.util.List<Claim> findByUserId(UUID userId) {
        return all().stream()
                .filter(c -> Objects.equals(c.getUserId(), userId))
                .toList();
    }

    /**
     * This lightweight fake holds only claim rows (no person/tree data), so it cannot perform the
     * claims-to-persons join the real query does. The Docker-free tests using it do not exercise
     * tree-level read-access linkage (Requirement 19.3), so a conservative {@code false} is correct
     * here; tree-linkage read access is covered against the real schema by the property test and the
     * Docker integration test.
     */
    @Override
    public boolean existsLinkInTree(UUID treeId, UUID userId) {
        return false;
    }

    @Override
    public java.util.List<UUID> findUserIdsWithClaimsInTree(UUID treeId) {
        return java.util.List.of();
    }

    /**
     * This fake has no person/tree join data, so it cannot resolve linked tree ids. Docker-free
     * tests using it do not exercise GET /trees linkage; return empty to stay conservative.
     */
    @Override
    public java.util.List<UUID> findTreeIdsLinkedToUser(UUID userId) {
        return java.util.List.of();
    }

    @Override
    public void deleteByPersonIdIn(java.util.Collection<UUID> personIds) {
        all().stream()
                .filter(c -> personIds.contains(c.getPersonId()))
                .forEach(c -> store.remove(idOf(c)));
    }

    @Override
    public void deleteByUserId(UUID userId) {
        all().stream()
                .filter(c -> Objects.equals(c.getUserId(), userId))
                .forEach(c -> store.remove(idOf(c)));
    }
}
