import { db } from "../db";
import type { CreatePersonRequest } from "./person";
import { personService } from "./person";
import type { CreateRelationshipCommand, RelationshipMutationResult } from "./relationship";
import { relationshipService } from "./relationship";
import { ApiException } from "./errors";

export interface CreateRelativeRequest {
  treeId: string;
  person: Omit<CreatePersonRequest, "treeId">;
  relationship: Omit<CreateRelationshipCommand, "treeId" | "sourceId" | "targetId"> & {
    existingPersonId: string;
    newPersonPosition: "source" | "target";
  };
}

export interface CreateRelativeResult {
  personId: string;
  relationship: RelationshipMutationResult;
}

export class RelativeService {
  async create(request: CreateRelativeRequest): Promise<CreateRelativeResult> {
    if (!request.treeId) {
      throw ApiException.validation("treeId", "Tree id is required.");
    }
    if (!request.person || typeof request.person !== "object") {
      throw ApiException.validation("person", "Person details are required.");
    }
    const relationship = request.relationship;
    if (!relationship || typeof relationship !== "object") {
      throw ApiException.validation("relationship", "Relationship details are required.");
    }
    if (!relationship.existingPersonId) {
      throw ApiException.validation("existingPersonId", "An existing person is required.");
    }
    if (relationship.newPersonPosition !== "source" && relationship.newPersonPosition !== "target") {
      throw ApiException.validation(
        "newPersonPosition",
        "New person position must be one of {source, target}.",
      );
    }

    const created = await db.transaction(async (tx) => {
      const personId = await personService.createWithStore(tx, {
        ...request.person,
        treeId: request.treeId,
      });
      const sourceId = relationship.newPersonPosition === "source"
        ? personId
        : relationship.existingPersonId;
      const targetId = relationship.newPersonPosition === "target"
        ? personId
        : relationship.existingPersonId;
      const edge = await relationshipService.createWithStore(tx, {
        treeId: request.treeId,
        type: relationship.type,
        sourceId,
        targetId,
        maritalStatus: relationship.maritalStatus,
        socialType: relationship.socialType,
        assertedLabel: relationship.assertedLabel,
      });
      return { personId, edge };
    });

    return {
      personId: created.personId,
      relationship: await relationshipService.finalizeCreatedEdge(
        request.treeId,
        request.relationship.type,
        created.edge,
      ),
    };
  }
}

export const relativeService = new RelativeService();
