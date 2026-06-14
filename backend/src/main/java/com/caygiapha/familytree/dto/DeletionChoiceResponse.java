package com.caygiapha.familytree.dto;

import java.util.List;
import java.util.UUID;

/**
 * Response body for the first phase of deletion, {@code DELETE /api/v1/persons/{id}}: it presents
 * the Owner with the two deletion strategies and makes no change to the Graph_Store
 * (Requirements 3.4, 15.1, 15.2). The Owner then re-submits a chosen {@code strategy} to
 * {@code POST /api/v1/persons/{id}/delete} to actually execute the deletion.
 *
 * <p>Exactly two options are presented, matching the two mutually exclusive strategies of
 * Requirement 15: {@code "cascade"} (cascade deletion, 15.3) and {@code "preserve"} (neighbor
 * preservation, 15.4).
 *
 * @param personId the node the prompt refers to
 * @param options  exactly the two selectable strategies
 */
public record DeletionChoiceResponse(UUID personId, List<DeletionOption> options) {

    /** The {@code strategy} value accepted by the execute endpoint, plus a human-readable label. */
    public static final String STRATEGY_CASCADE = "cascade";

    /** The {@code strategy} value accepted by the execute endpoint for neighbor preservation. */
    public static final String STRATEGY_PRESERVE = "preserve";

    /**
     * A single selectable deletion strategy.
     *
     * @param strategy the value to send back in the execute request
     * @param label    a short human-readable description of the strategy's effect
     */
    public record DeletionOption(String strategy, String label) {
    }

    /**
     * Build the two-option choice for a target node (15.1). This is a pure value object; producing
     * it does not change any stored state (15.2).
     *
     * @param personId the target node
     * @return the two-option deletion choice
     */
    public static DeletionChoiceResponse forPerson(UUID personId) {
        return new DeletionChoiceResponse(
                personId,
                List.of(
                        new DeletionOption(
                                STRATEGY_CASCADE,
                                "Cascade deletion: remove this person, their relationships, and every"
                                        + " other person left disconnected as a result."),
                        new DeletionOption(
                                STRATEGY_PRESERVE,
                                "Neighbor preservation: remove this person and their relationships"
                                        + " but keep the neighbors, linking affected pairs with a"
                                        + " dashed (asserted) relationship.")));
    }
}
