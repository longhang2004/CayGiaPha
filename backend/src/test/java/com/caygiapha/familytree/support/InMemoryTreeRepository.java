package com.caygiapha.familytree.support;

import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.repository.TreeRepository;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** In-memory {@link TreeRepository} for Docker-free integration tests. */
public class InMemoryTreeRepository extends InMemoryRepository<Tree> implements TreeRepository {

    @Override
    public Optional<Tree> findByOwnerUserId(UUID ownerUserId) {
        return findFirstByOwnerUserIdOrderByCreatedAtAsc(ownerUserId);
    }

    @Override
    public Optional<Tree> findFirstByOwnerUserIdOrderByCreatedAtAsc(UUID ownerUserId) {
        return all().stream()
                .filter(t -> Objects.equals(t.getOwnerUserId(), ownerUserId))
                .findFirst();
    }

    @Override
    public List<Tree> findAllByOwnerUserIdOrderByCreatedAtAsc(UUID ownerUserId) {
        return all().stream()
                .filter(t -> Objects.equals(t.getOwnerUserId(), ownerUserId))
                .toList();
    }

    @Override
    public boolean existsByOwnerUserId(UUID ownerUserId) {
        return findFirstByOwnerUserIdOrderByCreatedAtAsc(ownerUserId).isPresent();
    }
}
