package com.caygiapha.familytree.dto;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import java.util.List;
import java.util.UUID;

/**
 * Machine-readable export of a claimed node's data for its linked user (Requirement 22.1): all
 * stored fields of the Person node and the Relationship edges directly connecting it.
 */
public record DataExportResponse(PersonExport person, List<EdgeExport> incidentEdges) {

    public record PersonExport(
            UUID id,
            UUID treeId,
            String displayName,
            String gender,
            Integer birthOrder,
            Integer birthYear,
            boolean deathStatus,
            Boolean adoptionStatus,
            String visMarital,
            String visAdoption,
            String visDeath,
            String visName,
            String visBirthYear,
            String visPhoto) {

        static PersonExport from(Person p) {
            return new PersonExport(
                    p.getId(), p.getTreeId(), p.getDisplayName(), p.getGender(),
                    p.getBirthOrder(), p.getBirthYear(), p.isDeathStatus(), p.getAdoptionStatus(),
                    p.getVisMarital(), p.getVisAdoption(), p.getVisDeath(),
                    p.getVisName(), p.getVisBirthYear(), p.getVisPhoto());
        }
    }

    public record EdgeExport(
            UUID id, String type, UUID sourceId, UUID targetId,
            String maritalStatus, String socialType, String assertedLabel, String derivationState) {

        static EdgeExport from(Relationship r) {
            return new EdgeExport(
                    r.getId(), r.getType(), r.getSourceId(), r.getTargetId(),
                    r.getMaritalStatus(), r.getSocialType(), r.getAssertedLabel(),
                    r.getDerivationState());
        }
    }

    /** Build an export for a person and the edges incident to it. */
    public static DataExportResponse of(Person person, List<Relationship> incidentEdges) {
        return new DataExportResponse(
                PersonExport.from(person), incidentEdges.stream().map(EdgeExport::from).toList());
    }
}
