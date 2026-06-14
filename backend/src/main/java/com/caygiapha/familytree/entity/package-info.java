/**
 * JPA entities mapped to the PostgreSQL schema owned by Flyway. Each entity mirrors a table
 * defined in {@code db/migration} exactly (table and column names, nullability, and types) so
 * that Hibernate's {@code ddl-auto=validate} succeeds at startup.
 *
 * <p>Foreign keys to tables outside this task's scope (for example {@code trees}) are mapped as
 * plain {@code UUID} columns rather than entity associations; the structural constraints they
 * back are enforced by the database schema and the service layer.
 */
package com.caygiapha.familytree.entity;
