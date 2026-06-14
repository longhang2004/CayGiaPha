package com.caygiapha.familytree.support;

import com.caygiapha.familytree.entity.VerificationCode;
import com.caygiapha.familytree.repository.VerificationCodeRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** In-memory {@link VerificationCodeRepository} for Docker-free integration tests. */
public class InMemoryVerificationCodeRepository extends InMemoryRepository<VerificationCode>
        implements VerificationCodeRepository {

    private static final Comparator<VerificationCode> BY_ISSUED_DESC =
            Comparator.comparing(VerificationCode::getIssuedAt).reversed();

    @Override
    public List<VerificationCode> findByPurposeAndUserIdOrderByIssuedAtDesc(
            String purpose, UUID userId) {
        return all().stream()
                .filter(c -> c.getPurpose().equals(purpose) && Objects.equals(c.getUserId(), userId))
                .sorted(BY_ISSUED_DESC)
                .toList();
    }

    @Override
    public List<VerificationCode> findByPurposeAndPersonIdOrderByIssuedAtDesc(
            String purpose, UUID personId) {
        return all().stream()
                .filter(c -> c.getPurpose().equals(purpose)
                        && Objects.equals(c.getPersonId(), personId))
                .sorted(BY_ISSUED_DESC)
                .toList();
    }

    @Override
    public Optional<VerificationCode> findFirstByPurposeAndUserIdAndConsumedFalseOrderByIssuedAtDesc(
            String purpose, UUID userId) {
        return all().stream()
                .filter(c -> c.getPurpose().equals(purpose)
                        && Objects.equals(c.getUserId(), userId)
                        && !c.isConsumed())
                .sorted(BY_ISSUED_DESC)
                .findFirst();
    }

    @Override
    public Optional<VerificationCode>
            findFirstByPurposeAndPersonIdAndConsumedFalseOrderByIssuedAtDesc(
                    String purpose, UUID personId) {
        return all().stream()
                .filter(c -> c.getPurpose().equals(purpose)
                        && Objects.equals(c.getPersonId(), personId)
                        && !c.isConsumed())
                .sorted(BY_ISSUED_DESC)
                .findFirst();
    }

    @Override
    public List<VerificationCode> findByPurposeAndUserIdAndConsumedFalse(
            String purpose, UUID userId) {
        return all().stream()
                .filter(c -> c.getPurpose().equals(purpose)
                        && Objects.equals(c.getUserId(), userId)
                        && !c.isConsumed())
                .toList();
    }

    @Override
    public List<VerificationCode> findByPurposeAndPersonIdAndConsumedFalse(
            String purpose, UUID personId) {
        return all().stream()
                .filter(c -> c.getPurpose().equals(purpose)
                        && Objects.equals(c.getPersonId(), personId)
                        && !c.isConsumed())
                .toList();
    }

    @Override
    public void deleteByUserId(UUID userId) {
        all().stream()
                .filter(c -> Objects.equals(c.getUserId(), userId))
                .forEach(c -> store.remove(idOf(c)));
    }

    @Override
    public void deleteByPersonIdIn(java.util.Collection<UUID> personIds) {
        all().stream()
                .filter(c -> personIds.contains(c.getPersonId()))
                .forEach(c -> store.remove(idOf(c)));
    }
}
