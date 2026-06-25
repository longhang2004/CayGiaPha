package com.caygiapha.familytree.support;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.repository.PersonRepository;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** In-memory {@link PersonRepository} for Docker-free integration tests. */
public class InMemoryPersonRepository extends InMemoryRepository<Person>
        implements PersonRepository {

    @Override
    public List<Person> findByTreeId(UUID treeId) {
        return all().stream().filter(p -> Objects.equals(p.getTreeId(), treeId)).toList();
    }

    @Override
    public List<Person> findByTreeIdAndDeathStatusTrue(UUID treeId) {
        return findByTreeId(treeId).stream().filter(Person::isDeathStatus).toList();
    }

    @Override
    public Optional<Person> findByIdAndTreeId(UUID id, UUID treeId) {
        return all().stream()
                .filter(p -> Objects.equals(p.getId(), id) && Objects.equals(p.getTreeId(), treeId))
                .findFirst();
    }

    @Override
    public boolean existsByIdAndTreeId(UUID id, UUID treeId) {
        return findByIdAndTreeId(id, treeId).isPresent();
    }

    @Override
    public long countByTreeId(UUID treeId) {
        return findByTreeId(treeId).size();
    }
}
