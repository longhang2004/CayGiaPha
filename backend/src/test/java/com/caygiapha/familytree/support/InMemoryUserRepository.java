package com.caygiapha.familytree.support;

import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.repository.UserRepository;
import java.util.Objects;
import java.util.Optional;

/** In-memory {@link UserRepository} for Docker-free integration tests. */
public class InMemoryUserRepository extends InMemoryRepository<User> implements UserRepository {

    @Override
    public boolean existsByPhone(String phone) {
        return all().stream().anyMatch(u -> Objects.equals(u.getPhone(), phone));
    }

    @Override
    public boolean existsByEmail(String email) {
        return all().stream().anyMatch(u -> Objects.equals(u.getEmail(), email));
    }

    @Override
    public Optional<User> findByPhone(String phone) {
        return all().stream().filter(u -> Objects.equals(u.getPhone(), phone)).findFirst();
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return all().stream().filter(u -> Objects.equals(u.getEmail(), email)).findFirst();
    }
}
