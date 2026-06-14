package com.caygiapha.familytree.service;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.transaction.annotation.Transactional;

/**
 * Marks a domain mutation (a service method that writes to the Graph_Store or other tables) as
 * running in a single database transaction. Because the method is transactional, any exception it
 * throws — including the validation/structural {@code ApiException}s mapped by the global handler,
 * and the rollback triggered by a failed asserted-upgrade scan or a deletion strategy — rolls the
 * whole unit of work back, so a rejected request persists nothing. This satisfies the recurring
 * "leave unchanged / SHALL NOT create" acceptance criteria (e.g. 1.6, 1.7, 3.6, 4.2, 4.8, 4.9,
 * 11.7, 13.5, 16.8) via the design's atomicity principle.
 *
 * <p>This is a composed annotation: it is itself {@link Transactional} with rollback on any
 * {@link Exception} (not just unchecked ones), and exists so mutation methods read as
 * {@code @Mutation} rather than repeating transaction configuration.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Transactional(rollbackFor = Exception.class)
public @interface Mutation {
}
