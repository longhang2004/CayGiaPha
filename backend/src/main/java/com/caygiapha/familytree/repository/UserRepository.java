package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link User} accounts (Requirements 1.x, 2.x, 13.1).
 *
 * <p>Exposes identifier lookups used by the {@code Auth_Service} for the duplicate-identifier check
 * (1.6) and for resolving an account from a submitted phone/email during verification and sign-in.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /** Whether an account already exists for the given phone number (duplicate check; 1.6). */
    boolean existsByPhone(String phone);

    /** Whether an account already exists for the given email address (duplicate check; 1.6). */
    boolean existsByEmail(String email);

    /** Resolve an account by phone number. */
    Optional<User> findByPhone(String phone);

    /** Resolve an account by email address. */
    Optional<User> findByEmail(String email);
}
