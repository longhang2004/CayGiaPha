package com.caygiapha.familytree.support;

import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;

/**
 * A {@link org.springframework.transaction.PlatformTransactionManager} that gives the in-memory
 * repositories real {@code @Transactional}/{@code @Mutation} semantics for Docker-free integration
 * tests. When the outermost transaction begins it snapshots every registered repository's row set;
 * on commit the snapshots are discarded (mutations stand), and on rollback every repository is
 * restored to its pre-transaction row set.
 *
 * <p>This lets the real domain services prove the design's atomicity guarantee — a failed OTP
 * delivery rolls issuance back so no half-created code/session/claim is persisted — without a
 * database. Propagation is the standard {@code REQUIRED}: a nested {@code @Mutation} call
 * participates in the outer transaction. If a participating call fails, it marks the transaction
 * rollback-only, and the outermost completion performs the single snapshot restore.
 */
public class InMemoryTransactionManager extends AbstractPlatformTransactionManager {

    private final transient List<InMemoryRepository<?>> repositories;
    private final transient ThreadLocal<Holder> holder = new ThreadLocal<>();

    public InMemoryTransactionManager(List<InMemoryRepository<?>> repositories) {
        this.repositories = List.copyOf(repositories);
        setTransactionSynchronization(SYNCHRONIZATION_NEVER);
    }

    /** Thread-bound state for the active transaction: the snapshot and the rollback-only flag. */
    private static final class Holder {
        private Map<InMemoryRepository<?>, Map<UUID, Object>> snapshots;
        private boolean rollbackOnly;
    }

    /** Per-call transaction marker. */
    private static final class TxObject {
        private Holder holder;
        private boolean newTransaction;
    }

    @Override
    protected Object doGetTransaction() {
        TxObject tx = new TxObject();
        tx.holder = holder.get();
        return tx;
    }

    @Override
    protected boolean isExistingTransaction(Object transaction) {
        return ((TxObject) transaction).holder != null;
    }

    @Override
    protected void doBegin(Object transaction, TransactionDefinition definition) {
        Holder h = new Holder();
        h.snapshots = new IdentityHashMap<>();
        for (InMemoryRepository<?> repository : repositories) {
            h.snapshots.put(repository, repository.snapshotRaw());
        }
        holder.set(h);
        TxObject tx = (TxObject) transaction;
        tx.holder = h;
        tx.newTransaction = true;
    }

    @Override
    protected void doCommit(DefaultTransactionStatus status) {
        Holder h = holder.get();
        if (h != null && h.rollbackOnly) {
            // A participating call marked the transaction rollback-only: restore instead of commit.
            restore(h);
        }
    }

    @Override
    protected void doRollback(DefaultTransactionStatus status) {
        Holder h = holder.get();
        if (h != null) {
            restore(h);
        }
    }

    @Override
    protected void doSetRollbackOnly(DefaultTransactionStatus status) {
        Holder h = holder.get();
        if (h != null) {
            h.rollbackOnly = true;
        }
    }

    @Override
    protected void doCleanupAfterCompletion(Object transaction) {
        if (((TxObject) transaction).newTransaction) {
            holder.remove();
        }
    }

    private static void restore(Holder h) {
        h.snapshots.forEach(InMemoryRepository::restoreRaw);
    }
}
