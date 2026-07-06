package com.caygiapha.familytree.dto;

import java.util.List;
import java.util.UUID;

/** Full tree payload consumed by the graph page. */
public record TreeDetailResponse(
        UUID treeId,
        String name,
        String region,
        String sharing,
        boolean livingRedaction,
        List<PersonItem> persons,
        List<RelationshipItem> relationships) {

    public record PersonItem(
            UUID id,
            String displayName,
            String gender,
            Integer birthOrder,
            Integer birthYear,
            String phone,
            String email,
            Boolean deceased,
            Integer deathDay,
            Integer deathMonth,
            Integer deathYear,
            String deathCalendar,
            Boolean deathLunarLeap,
            String visName,
            String visBirthYear,
            String visPhoto,
            String visDeath,
            String visMarital,
            String visAdoption,
            boolean claimed) {}

    public record RelationshipItem(
            UUID id,
            String type,
            UUID sourceId,
            UUID targetId,
            String maritalStatus,
            String derivationState,
            String assertedLabel,
            String socialType) {}
}
