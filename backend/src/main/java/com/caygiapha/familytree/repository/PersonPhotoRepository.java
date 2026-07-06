package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.PersonPhoto;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for {@link PersonPhoto} rows (Requirement 24). */
@Repository
public interface PersonPhotoRepository extends JpaRepository<PersonPhoto, UUID> {

    /** All photos of a person, newest first. */
    List<PersonPhoto> findByPersonIdOrderByCreatedAtDesc(UUID personId);

    /** A specific photo scoped to its person (authorization/ownership checks). */
    Optional<PersonPhoto> findByIdAndPersonId(UUID id, UUID personId);

    /** The person's current primary photo, if any. */
    Optional<PersonPhoto> findByPersonIdAndPrimaryTrue(UUID personId);

    /** All photos of a person (used to delete from storage on node deletion; 24.6). */
    List<PersonPhoto> findByPersonId(UUID personId);

    /** Delete all photo rows for a person (node deletion cascade; 24.6). */
    void deleteByPersonId(UUID personId);

    /** Delete all photo rows for a set of people during whole-tree deletion. */
    void deleteByPersonIdIn(java.util.Collection<UUID> personIds);
}
