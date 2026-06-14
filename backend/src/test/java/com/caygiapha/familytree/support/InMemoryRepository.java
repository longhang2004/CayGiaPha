package com.caygiapha.familytree.support;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery;

/**
 * Minimal map-backed in-memory {@link JpaRepository} for Docker-free service-level integration
 * tests. It implements just enough of the repository contract to let the real domain services
 * ({@code AuthService}, {@code VerificationCodeService}, {@code ClaimService}, {@code SessionService})
 * run end-to-end without a database or Testcontainers.
 *
 * <p>On {@link #save} a {@code null} {@code id} field is populated with a random {@link UUID} via
 * reflection, simulating JPA identity assignment so subsequent look-ups succeed. Query methods not
 * exercised by these tests throw {@link UnsupportedOperationException} so accidental reliance on
 * them surfaces immediately rather than returning misleading empty results.
 */
public abstract class InMemoryRepository<T> implements JpaRepository<T, UUID> {

    /** Insertion-ordered backing store keyed by entity id. */
    protected final Map<UUID, T> store = new LinkedHashMap<>();

    /** All stored entities in insertion order (used by subclass finders). */
    protected List<T> all() {
        return new ArrayList<>(store.values());
    }

    /**
     * Shallow membership snapshot of the backing store, used by {@link InMemoryTransactionManager}
     * to simulate the {@code @Mutation} transaction boundary: a rollback restores the set of rows
     * that existed when the transaction began, so a row saved inside a transaction that later fails
     * (e.g. on an OTP provider outage) is removed again.
     */
    public Map<UUID, Object> snapshotRaw() {
        return new LinkedHashMap<>(store);
    }

    /** Restore the backing store to a previously taken {@link #snapshotRaw() snapshot}. */
    @SuppressWarnings("unchecked")
    public void restoreRaw(Map<UUID, Object> snapshot) {
        store.clear();
        snapshot.forEach((id, entity) -> store.put(id, (T) entity));
    }

    protected UUID idOf(T entity) {
        return (UUID) readField(entity, "id");
    }

    @Override
    public <S extends T> S save(S entity) {
        if (readField(entity, "id") == null) {
            writeField(entity, "id", UUID.randomUUID());
        }
        store.put((UUID) readField(entity, "id"), entity);
        return entity;
    }

    @Override
    public <S extends T> List<S> saveAll(Iterable<S> entities) {
        List<S> result = new ArrayList<>();
        for (S entity : entities) {
            result.add(save(entity));
        }
        return result;
    }

    @Override
    public Optional<T> findById(UUID id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public boolean existsById(UUID id) {
        return id != null && store.containsKey(id);
    }

    @Override
    public List<T> findAll() {
        return all();
    }

    @Override
    public long count() {
        return store.size();
    }

    @Override
    public void deleteById(UUID id) {
        store.remove(id);
    }

    @Override
    public void delete(T entity) {
        store.remove(idOf(entity));
    }

    @Override
    public void deleteAll() {
        store.clear();
    }

    // ---- reflection helpers ----

    protected static Object readField(Object entity, String name) {
        try {
            Field field = declaredField(entity.getClass(), name);
            field.setAccessible(true);
            return field.get(entity);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    protected static void writeField(Object entity, String name, Object value) {
        try {
            Field field = declaredField(entity.getClass(), name);
            field.setAccessible(true);
            field.set(entity, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Field declaredField(Class<?> type, String name) throws NoSuchFieldException {
        Class<?> current = type;
        while (current != null) {
            try {
                return current.getDeclaredField(name);
            } catch (NoSuchFieldException ignored) {
                current = current.getSuperclass();
            }
        }
        throw new NoSuchFieldException(name);
    }

    // ---- unused JpaRepository surface ----

    @Override
    public List<T> findAllById(Iterable<UUID> ids) {
        throw new UnsupportedOperationException();
    }

    @Override
    public void deleteAllById(Iterable<? extends UUID> ids) {
        throw new UnsupportedOperationException();
    }

    @Override
    public void deleteAll(Iterable<? extends T> entities) {
        throw new UnsupportedOperationException();
    }

    @Override
    public List<T> findAll(Sort sort) {
        throw new UnsupportedOperationException();
    }

    @Override
    public Page<T> findAll(Pageable pageable) {
        throw new UnsupportedOperationException();
    }

    @Override
    public void flush() {
        // no-op: writes are immediately visible in the map
    }

    @Override
    public <S extends T> S saveAndFlush(S entity) {
        return save(entity);
    }

    @Override
    public <S extends T> List<S> saveAllAndFlush(Iterable<S> entities) {
        return saveAll(entities);
    }

    @Override
    public void deleteAllInBatch(Iterable<T> entities) {
        throw new UnsupportedOperationException();
    }

    @Override
    public void deleteAllByIdInBatch(Iterable<UUID> ids) {
        throw new UnsupportedOperationException();
    }

    @Override
    public void deleteAllInBatch() {
        store.clear();
    }

    @Override
    @SuppressWarnings("deprecation")
    public T getOne(UUID id) {
        throw new UnsupportedOperationException();
    }

    @Override
    @SuppressWarnings("deprecation")
    public T getById(UUID id) {
        throw new UnsupportedOperationException();
    }

    @Override
    public T getReferenceById(UUID id) {
        throw new UnsupportedOperationException();
    }

    @Override
    public <S extends T> Optional<S> findOne(Example<S> example) {
        throw new UnsupportedOperationException();
    }

    @Override
    public <S extends T> List<S> findAll(Example<S> example) {
        throw new UnsupportedOperationException();
    }

    @Override
    public <S extends T> List<S> findAll(Example<S> example, Sort sort) {
        throw new UnsupportedOperationException();
    }

    @Override
    public <S extends T> Page<S> findAll(Example<S> example, Pageable pageable) {
        throw new UnsupportedOperationException();
    }

    @Override
    public <S extends T> long count(Example<S> example) {
        throw new UnsupportedOperationException();
    }

    @Override
    public <S extends T> boolean exists(Example<S> example) {
        throw new UnsupportedOperationException();
    }

    @Override
    public <S extends T, R> R findBy(
            Example<S> example, Function<FetchableFluentQuery<S>, R> queryFunction) {
        throw new UnsupportedOperationException();
    }
}
