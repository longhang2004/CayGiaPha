package com.caygiapha.familytree.repository;

import com.caygiapha.familytree.entity.FeedbackMessage;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for admin feedback inbox rows. */
@Repository
public interface FeedbackMessageRepository extends JpaRepository<FeedbackMessage, UUID> {

    List<FeedbackMessage> findTop50ByOrderByCreatedAtDesc();

    long countByStatus(String status);
}
