# Requirements Document

## Introduction

This document specifies the requirements for a Vietnamese family tree (cây gia phả) web/mobile application. The application lets a user build and visualize the relationships of a Vietnamese clan as a graph rendered as a tree/diagram. The defining domain feature is automatic computation of the correct Vietnamese form of address (cách xưng hô) between any two persons, accounting for paternal-vs-maternal side, gender, birth order/age, and regional dialect (Bắc/Trung/Nam).

> **Active implementation baseline — 2026-07-13.** The production-priority implementation is
> the Next.js full-stack application under `frontend/`, using Next.js Route Handlers, Drizzle ORM,
> and PostgreSQL. The Spring Boot module is retained as an inactive reference implementation and
> future synchronization target; it is not the default runtime. User authentication uses
> email/password or Google sign-in for new accounts. Phone-only accounts are a legacy compatibility
> path: they may continue to sign in and recover their password through SMS when the provider is
> configured, but new phone registrations are not accepted. Verification codes remain valid for
> bounded flows that explicitly require them, such as password recovery or linking a person node.

The core data model is a graph: each Person is a node and each Relationship is a typed edge. Only primitive bloodline edges (parent-child) and marriage edges are stored; all higher-order kinship terms are derived from these edges. Relatives can be added in two modes: a well-defined primitive relationship (rendered as a SOLID line) from which address can be computed, and an asserted direct label such as "this person is my bác" (rendered as a DASHED line) that lacks intermediate nodes and therefore cannot yet be auto-derived. The system attempts to upgrade dashed relations to solid when intermediate nodes are added and warns on conflicts.

Each User receives one initial tree at sign-up and may explicitly create additional owned trees.
A User may also participate in trees as a Contributor or as the linked subject of a Person node.
Tree merging and cross-tree graph traversal are deferred to a later version.

## Glossary

- **Family_Tree_System**: The overall application that stores the relationship graph, computes forms of address, and renders the tree.
- **Auth_Service**: The component responsible for email/password and Google sign-up, password/Google sign-in, recovery, and server-side session management. Legacy phone accounts remain accepted for password sign-in and recovery.
- **Verification_Service**: The component that sends and validates bounded recovery or person-node claim codes over configured channels; it does not define the active sign-up/sign-in method.
- **Graph_Store**: The component that persists Person nodes and Relationship edges.
- **Kinship_Resolver**: The component that computes the Vietnamese form of address between two Person nodes given a viewpoint, using the relationship path, side, gender, birth order, and region.
- **Renderer**: The component that draws the relationship graph as a tree/diagram, including solid and dashed edges.
- **User**: A login account belonging to a real human who authenticates with the Auth_Service.
- **Person**: A node in the relationship graph representing an individual, which may or may not correspond to a User account.
- **Relationship**: A typed, directed edge between two Person nodes.
- **Primitive_Bloodline_Edge**: A stored parent-child Relationship (father-child or mother-child).
- **Marriage_Edge**: A stored spouse Relationship between two Person nodes, with a marital status.
- **Non_Bloodline_Relation**: A stored social Relationship (such as friend, teacher, colleague) that does not participate in kinship address computation.
- **Asserted_Relationship**: A user-provided direct kinship label between two Person nodes that lacks the intermediate nodes required to derive it; rendered as a DASHED line.
- **Derived_Relationship**: A kinship relationship computable from stored Primitive_Bloodline_Edges and Marriage_Edges; rendered as a SOLID line.
- **Form_Of_Address**: The Vietnamese kinship term (for example ông, bà, bác, chú, cô, dì, cậu, anh, em, cháu) used by one Person to address another.
- **Viewpoint** (ego node): The Person from whose perspective forms of address are computed.
- **Region**: A Vietnamese regional dialect setting with the values Bắc, Trung, or Nam that governs kinship term selection.
- **Owner**: The User who created and controls a given tree.
- **Contributor**: A trusted User accepted into a tree who may read all person data and add, edit, or delete Person nodes, Relationship edges, and photos, but may not configure, share, rename, or delete the tree; manage collaborators; send claim invitations; or change field visibility.
- **Linked_User**: A User whose authenticated identity has been verified and linked to a Person node. The User may edit that node, its photos, and its visibility but is not a tree administrator.
- **Reader**: An authenticated viewer admitted by a public or valid link-sharing policy who receives only the privacy-projected tree data and cannot mutate it.
- **Claimed_Node**: A Person node linked to a User after a destination-bound, session-authenticated verification flow. One node links to at most one User; one User may link to their corresponding node in multiple trees.
- **Content_Editor**: Either the tree Owner or an active Contributor. Linked_User permissions remain limited to the linked node.
- **Search_Service**: The component that searches and filters Person nodes within a tree by display name, by Form_Of_Address relative to the current Viewpoint, and by Person fields.
- **Help_System**: The in-application component that presents the usage guide explaining core concepts and workflows of the Family_Tree_System.

## Requirements

### Requirement 1: User Sign-Up

**User Story:** As a new user, I want to sign up using email and password, or use Google sign-in, so that I can create and own family trees.

#### Acceptance Criteria

1. WHEN a visitor submits a sign-up request with an email address of 254 characters or fewer in valid email format (`local-part@domain`), a valid password, the current legal consents, and an allowed Region, THE Auth_Service SHALL create a verified User account associated with that email address.
2. IF a visitor attempts to create a new password account using a phone number, THEN THE Auth_Service SHALL reject the request, create no account, identify the identifier field, and direct the visitor to use email; this SHALL NOT disable existing legacy phone accounts.
3. THE Auth_Service SHALL accept a password only when it contains 8 to 128 characters, at least one ASCII letter, and at least one digit; otherwise it SHALL reject the request, create no account, and identify the password field.
4. WHEN a visitor successfully authenticates with a valid Google credential, THE Auth_Service SHALL sign in the matching email account or create a verified email account after obtaining any required current legal consents.
5. WHEN password or Google sign-up succeeds, THE Auth_Service SHALL establish an authenticated session and the Family_Tree_System SHALL make the user's tree-creation journey available without an OTP verification step.
6. IF a sign-up request uses an email already associated with an existing User account, THEN THE Auth_Service SHALL reject the request, SHALL NOT create a new User account, and SHALL return a message stating the email is already registered.
7. IF a sign-up request contains an email address that exceeds 254 characters or does not match the `local-part@domain` format, an unsupported Region, or missing current legal consent, THEN THE Auth_Service SHALL reject the request, SHALL NOT create a User account, and SHALL return a message identifying the invalid field.
8. THE Auth_Service SHALL store password verifiers as one-way password hashes and SHALL NOT store or log plaintext passwords or Google credentials.
9. IF a supplied Google credential cannot be verified, THEN THE Auth_Service SHALL reject the request, create no account or session, and return a non-sensitive authentication error.
10. WHEN a visitor creates a password account or a Google authentication creates a new account, THE Auth_Service SHALL require an explicit account display name, normalize its whitespace, reject control characters, enforce a normalized length of 1–100 Unicode characters, and store it independently from every Person node name.
11. WHEN an existing Google account signs in, THE Auth_Service SHALL NOT require or overwrite that account's stored display name.
12. THE Family_Tree_System SHALL allow an authenticated User to update only their own account display name using the same normalization and validation rules, while legacy accounts with no display name remain usable and use their identifier as a non-blocking fallback.

### Requirement 2: User Sign-In

**User Story:** As a registered user, I want to sign in using email and password or Google, while retaining access to a legacy phone account, so that I can access my family trees.

#### Acceptance Criteria

1. WHEN a User submits a valid password for an email account or an existing legacy phone account, THE Auth_Service SHALL establish an authenticated session valid for 30 days.
2. WHEN a User successfully authenticates with a valid Google credential matching a User account, THE Auth_Service SHALL establish an authenticated session valid for 30 days.
3. THE Auth_Service SHALL transmit the session identifier in an `HttpOnly`, `SameSite=Lax` cookie, SHALL use `Secure` in production, and SHALL validate expiry and revocation server-side.
4. IF a User submits an unknown identifier or an incorrect password, THEN THE Auth_Service SHALL reject the request using a uniform authentication-failure response that does not confirm whether the account exists.
5. IF a Google credential is invalid, expired, has the wrong audience, or does not provide a usable email identity, THEN THE Auth_Service SHALL reject the request and create no session.
6. WHEN password recovery is requested for an email account or an existing legacy phone account, THE Verification_Service SHALL use a hashed, bounded, single-use 15-minute recovery code, limit verification to five attempts, and apply identifier and source-address rate limits without revealing whether the identifier exists.
7. WHEN password recovery succeeds, THE Auth_Service SHALL revoke all prior sessions for the account, establish one fresh 30-day session for the current browser, and route the User to the tree list.
8. THE Auth_Service SHALL rate-limit password and Google authentication attempts by a non-reversible normalized-identifier key and source address and SHALL record authentication events without logging credentials, verification codes, destinations, or session tokens.
9. WHEN an authenticated User submits a sign-out request, THE Auth_Service SHALL terminate and invalidate the authenticated session.

### Requirement 3: Person Node Management

**User Story:** As a tree content editor, I want to create and edit person records, so that I can represent the members of my clan.

#### Acceptance Criteria

1. WHEN an authenticated Content_Editor submits a create-person request containing an explicit target tree, a valid display name, and a valid gender value, THE Graph_Store SHALL create a Person node within that tree and return the identifier of the created node.
2. THE Graph_Store SHALL store for each Person node a display name of 1 to 100 characters, a gender value restricted to one of the enumerated values {male, female}, an optional birth order as a positive integer from 1 to 99, and an optional birth year as a four-digit integer from 1000 to the current calendar year.
3. WHEN a Content_Editor submits an edit-person request for a Person node in an accessible tree containing field values that satisfy the bounds defined in criterion 2, THE Graph_Store SHALL update the specified fields of that Person node and leave all unspecified fields unchanged; a Linked_User may perform the same update only on their own Claimed_Node.
4. WHEN a Content_Editor submits a delete-person request for an editable Person node, THE Family_Tree_System SHALL prompt the editor to choose between cascade deletion and neighbor preservation as defined in Requirement 15, and SHALL NOT remove the Person node or any connected Relationship edge until one option is selected.
5. WHERE a Person node records a death status, THE Graph_Store SHALL store the death status as a boolean field of that Person node.
6. IF a create-person or edit-person request omits a required display name or gender value, or contains a display name, gender value, birth order, or birth year that violates the bounds defined in criterion 2, THEN THE Graph_Store SHALL reject the request, leave the target Person node unchanged, and return an error indication identifying the invalid field.
7. IF an editor submits a create-person, edit-person, or delete-person request targeting a Person node outside the explicitly selected tree or beyond the editor's capability, THEN THE Graph_Store SHALL reject the request, make no change to any Person node, and return an error indication that the target node is not accessible.

### Requirement 4: Relationship Graph Model

**User Story:** As a tree content editor, I want relationships stored as typed edges in a graph, so that kinship terms can be derived rather than stored individually.

#### Acceptance Criteria

1. THE Graph_Store SHALL represent each relationship as a directed Relationship edge between two distinct Person nodes.
2. IF a create-relationship request specifies the same Person node as both source and target, THEN THE Graph_Store SHALL reject the request and return a self-reference-violation message indicating that source and target must differ.
3. THE Graph_Store SHALL support Primitive_Bloodline_Edge relationships restricted to father-child and mother-child types, directed from the parent Person node to the child Person node.
4. THE Graph_Store SHALL restrict each child Person node to at most one father-child Primitive_Bloodline_Edge and at most one mother-child Primitive_Bloodline_Edge.
5. THE Graph_Store SHALL support Marriage_Edge relationships that record a marital status whose value is exactly one of married, divorced, or deceased.
6. THE Graph_Store SHALL support Non_Bloodline_Relation relationships that record a social relationship type.
7. THE Graph_Store SHALL store each Asserted_Relationship together with the user-provided kinship label of 1 to 50 characters.
8. IF a create-relationship request references a Person node that does not exist in the Graph_Store, THEN THE Graph_Store SHALL reject the request and return a missing-node message indicating which referenced node was not found.
9. IF a create-relationship request would create a parent-child cycle in the Primitive_Bloodline_Edge set, THEN THE Graph_Store SHALL reject the request and return a cycle-violation message.

### Requirement 5: Add Relative as Derived Relationship (Solid Line)

**User Story:** As a tree content editor, I want to add a relative through a known primitive relationship, so that the system can compute forms of address precisely and render a solid line.

#### Acceptance Criteria

1. WHEN an authenticated Content_Editor adds a relative to a Person node in the selected tree using a parent-child relationship, THE Graph_Store SHALL store the relationship as a Primitive_Bloodline_Edge.
2. WHEN an authenticated Content_Editor adds a relative to a Person node in the selected tree using a spouse relationship, THE Graph_Store SHALL store the relationship as a Marriage_Edge.
3. WHEN a relationship is stored as a Primitive_Bloodline_Edge or Marriage_Edge, THE Renderer SHALL render the corresponding edge as a solid line.
4. WHEN an Owner adds a relative through a parent-child or spouse relationship, THE Kinship_Resolver SHALL compute and return a defined Form_Of_Address from the added Person toward every connected Person whose connecting path consists only of Derived_Relationships.
5. IF an add-relative request references a Person node outside the selected tree, THEN THE Graph_Store SHALL reject the request, return an error indicating the referenced node is invalid, and SHALL NOT create a Person node or edge.
6. WHEN a Content_Editor starts from the populated tree workspace, THE Family_Tree_System SHALL present creating a new connected Person and connecting two existing Person nodes as two distinct user intents.
7. WHEN a Content_Editor connects two existing Person nodes from a selected Person's information panel, THE Family_Tree_System SHALL keep that selected Person fixed, allow only a missing parent, child, or spouse primitive relationship, and SHALL NOT create a new Person node.

### Requirement 6: Add Relative as Asserted Relationship (Dashed Line)

**User Story:** As a tree content editor, I want to add a relative by a direct kinship label even when I do not know the intermediate linkage, so that I can record relatives such as a bác without first modeling the connecting ancestors.

#### Acceptance Criteria

1. WHEN a Content_Editor adds a relative using a direct kinship label of 1 to 50 characters without supplying the intermediate Person nodes, THE Graph_Store SHALL store the relationship as an Asserted_Relationship with the provided label and SHALL link it to exactly the two Person nodes specified by the editor.
2. IF a Content_Editor attempts to add a relative with a kinship label that is empty or exceeds 50 characters, THEN THE Graph_Store SHALL reject the request, SHALL NOT create any relationship or Person node, and SHALL return an error indication identifying the invalid label.
3. WHEN a relationship is stored as an Asserted_Relationship, THE Renderer SHALL render the corresponding edge as a dashed line that is visually distinct from edges representing non-asserted (derived) relationships.
4. WHILE a relationship between two Person nodes is an Asserted_Relationship, THE Kinship_Resolver SHALL return the stored asserted label as the Form_Of_Address for that relationship and SHALL NOT auto-derive any Form_Of_Address from either Person toward other nodes by traversing the asserted edge.

### Requirement 7: Upgrade and Conflict Detection for Asserted Relationships

**User Story:** As a tree owner, I want asserted relationships to be upgraded to derived relationships when I add the connecting nodes, so that the system can verify my earlier labels and compute address automatically.

#### Acceptance Criteria

1. WHEN an Owner adds one or more Primitive_Bloodline_Edges that complete an unbroken path of Primitive_Bloodline_Edges between two Person nodes previously joined by an Asserted_Relationship, THE Graph_Store SHALL upgrade that Asserted_Relationship to a Derived_Relationship.
2. WHEN an Asserted_Relationship is upgraded to a Derived_Relationship, THE Renderer SHALL render the connecting edge as a solid line within 1 second of the upgrade.
3. WHEN an Asserted_Relationship is upgraded, THE Kinship_Resolver SHALL compute the derived Form_Of_Address for the completed path.
4. WHEN the derived Form_Of_Address for an upgraded relationship matches the previously stored asserted label, THE Family_Tree_System SHALL mark the relationship as verified and SHALL NOT present a conflict warning.
5. IF the derived Form_Of_Address for an upgraded relationship differs from the previously stored asserted label, THEN THE Family_Tree_System SHALL present a conflict warning that displays both the asserted label and the derived Form_Of_Address, and SHALL retain the stored asserted label unchanged until the Owner resolves the conflict.

### Requirement 8: Kinship Address Resolution

**User Story:** As a user viewing a relative, I want to see the correct Vietnamese form of address relative to me, so that I know how to refer to that person.

#### Acceptance Criteria

1. WHEN a User selects a Person node for a given Viewpoint, THE Kinship_Resolver SHALL compute, within 1 second, the Form_Of_Address used by the Viewpoint Person to address the selected Person.
2. THE Kinship_Resolver SHALL determine the Form_Of_Address using the relationship path through the graph, the paternal or maternal side of each path segment, the gender of the involved Person nodes, and the birth order or birth year of the involved Person nodes.
3. WHERE a path segment is on the paternal side, THE Kinship_Resolver SHALL select paternal-side terms (for example bác or chú) rather than the maternal-side term cậu.
4. WHERE the birth order or birth year of an involved Person node establishes that the relative was born before the connecting parent, THE Kinship_Resolver SHALL select the elder-sibling term, and WHERE the birth order or birth year establishes that the relative was born after the connecting parent, THE Kinship_Resolver SHALL select the younger-sibling term.
5. IF both the birth order and the birth year required to distinguish an elder-sibling term from a younger-sibling term are absent or equal for the involved Person nodes, THEN THE Kinship_Resolver SHALL return an unresolved-relationship indicator and SHALL NOT select either the elder-sibling or younger-sibling term.
6. FOR ALL pairs of Person nodes connected solely by Derived_Relationships, IF the Kinship_Resolver computes that Person A addresses Person B with a descendant term such as cháu, THEN the Kinship_Resolver SHALL compute that Person B addresses Person A with the corresponding ascendant term such as bác, chú, cô, dì, or cậu (symmetry property).
7. IF the relationship path between the Viewpoint Person and the selected Person cannot be resolved to a defined Form_Of_Address, THEN THE Kinship_Resolver SHALL return an unresolved-relationship indicator and SHALL retain the selected Person node and Viewpoint unchanged.
8. WHILE a tree uses Region Nam, WHEN the resolved path is an anh/chị/em relationship (`u1:d1`) or a bác/chú/cô/cậu/dì relationship (`u2:d1`) and the blood relative has an explicit birth order from 1 through 99, THE Family_Tree_System SHALL append the Southern calling number derived as birth order plus one to the displayed Form_Of_Address.
9. WHEN either eligible relationship in criterion 8 ends with a spouse hop, THE Family_Tree_System SHALL derive the displayed calling number from the explicit birth order of the blood relative immediately before that spouse hop.
10. THE Family_Tree_System SHALL NOT append an ordinal outside Region Nam, infer an ordinal from birth year or render order, or infer the term “Út”; missing, invalid, or privacy-redacted birth order SHALL fall back to the regional base term.
11. Displaying an ordinal SHALL NOT change the canonical-relation key, regional seed term, stored asserted label, asserted-upgrade behavior, or conflict detection.

### Requirement 9: Multi-Region Dialect Support

**User Story:** As a user, I want forms of address to follow my regional dialect, so that the terms match how my family actually speaks.

#### Acceptance Criteria

1. THE Kinship_Resolver SHALL read kinship terms from a configurable data layer keyed by Region, where Region is restricted to exactly one of the three values Bắc, Trung, or Nam.
2. WHEN a tree is created, THE Family_Tree_System SHALL assign and store a default Region for that tree, defaulting to Bắc when the Owner does not specify one.
3. WHEN the Kinship_Resolver computes a Form_Of_Address, THE Kinship_Resolver SHALL select the kinship term defined in the data layer for the tree's current default Region.
4. IF no kinship term is defined for the resolved relationship path under the tree's current default Region, THEN THE Kinship_Resolver SHALL return an indication that the Form_Of_Address is undefined for that Region and SHALL leave the tree's stored default Region unchanged.
5. WHEN an Owner changes the default Region of a tree to one of Bắc, Trung, or Nam, THE Kinship_Resolver SHALL compute every Form_Of_Address requested after the change using the newly selected Region.
6. IF an Owner attempts to set a tree's default Region to a value other than Bắc, Trung, or Nam, THEN THE Family_Tree_System SHALL reject the change and SHALL retain the previously stored default Region.
7. FOR ALL Regions in the set {Bắc, Trung, Nam}, THE Kinship_Resolver SHALL resolve every relationship path that it resolves for any other Region in the set to a defined Form_Of_Address (regional coverage property).
8. WHEN an Owner completes password or Google sign-up, THE Family_Tree_System SHALL allow the Owner to specify the new tree's default Region as one of Bắc, Trung, or Nam, SHALL create the tree with the specified Region, and SHALL default to Bắc when the Owner does not specify one; IF the specified value is not one of Bắc, Trung, or Nam, THEN THE Family_Tree_System SHALL reject sign-up with a validation error and SHALL NOT create the tree.

### Requirement 10: Change Point of View

**User Story:** As a user, I want to change the viewpoint to another person, so that I can see how that person addresses everyone else in the tree.

#### Acceptance Criteria

1. WHEN a User selects a Person node within a tree as the Viewpoint, THE Kinship_Resolver SHALL recompute the Form_Of_Address from the selected Viewpoint toward every other Person node in that tree.
2. WHEN the Viewpoint changes, THE Renderer SHALL display the recomputed forms of address within 2 seconds for a tree of up to 1,000 Person nodes without requiring any additional relationship data to be stored.
3. WHERE the relationship path between the selected Viewpoint and another Person node cannot be resolved to a defined Form_Of_Address, THE Kinship_Resolver SHALL return the unresolved-relationship indicator for that Person node.
4. IF a User selects as the Viewpoint a Person node that does not exist in the tree, THEN THE Family_Tree_System SHALL reject the request, leave the current Viewpoint unchanged, and return an error indication that the selected node is not in the tree.
5. THE user interface SHALL describe the kinship Viewpoint as “Xét vai vế theo [Tên]” and expose the change action as “Đổi người xét”; internal identifiers, telemetry enums, and REST paths MAY retain the stable `viewpoint` terminology, and camera/zoom controls MAY retain “góc nhìn”.

### Requirement 11: Node Linking and Verification

**User Story:** As a relative who was added to someone's tree, I want to sign in and confirm that a Person node represents me, so that my record is linked to my account.

#### Acceptance Criteria

1. WHEN an Owner sends an invitation for a Person node that is not already a Claimed_Node to an email, or to a phone number belonging to a verified legacy account, THE Verification_Service SHALL deliver, within 60 seconds, a destination-bound link and a 6-digit numeric one-time verification code that remains valid for 15 minutes.
2. WHEN the invited recipient opens the link, THE Family_Tree_System SHALL require an authenticated session and preserve the internal return path through sign-in or sign-up.
3. WHEN the authenticated recipient submits a matching code within the validity period and the normalized destination equals the signed-in account's email or verified legacy phone, THE Verification_Service SHALL atomically mark the corresponding Person node as a Claimed_Node linked to that User account and grant Linked_User read access to the tree.
4. IF the code is wrong, expired, reused, over the five-attempt limit, or its destination does not match the signed-in account, THEN THE Verification_Service SHALL reject the claim and leave the Person node unclaimed without revealing another account's identity.
5. WHEN an Owner reissues an invitation for the same unclaimed Person node, THE Verification_Service SHALL invalidate every prior unconsumed claim code for that node.
6. WHILE a Person node is a Claimed_Node, THE Graph_Store SHALL permit edits to that node only by its linked User, the tree Owner, and an active Contributor; only the linked User and Owner may change its visibility.
7. IF an Owner attempts to invite an already Claimed_Node, or a non-Owner attempts to send a claim invitation, THEN THE Verification_Service SHALL reject the request and make no change.

### Requirement 12: Non-Bloodline Relationships

**User Story:** As a tree content editor, I want to record non-bloodline relationships such as friends and teachers, so that I can represent social connections without affecting kinship terms.

#### Acceptance Criteria

1. WHEN an authenticated Content_Editor submits a request to connect two distinct Person nodes in the selected tree using friend, teacher, or colleague, THE Graph_Store SHALL store a Non_Bloodline_Relation recording that type.
2. IF the request uses another type, references a Person outside the selected tree, or uses the same Person for both endpoints, THE Graph_Store SHALL reject it, identify the invalid field, and create no edge.
3. THE Kinship_Resolver SHALL exclude Non_Bloodline_Relation edges from Form_Of_Address computation and from all relationship path computations, including connection-finding between two Person nodes.
4. WHEN the Renderer draws a Non_Bloodline_Relation edge, THE Renderer SHALL render that edge using a line style distinct from the solid line used for Primitive_Bloodline_Edge and Marriage_Edge edges and distinct from the dashed line used for Asserted_Relationship edges.

### Requirement 13: Tree Ownership

**User Story:** As a user, I want to own multiple independent trees, so that I can organize separate family contexts without ambiguous authorization.

#### Acceptance Criteria

1. WHEN a User completes password or Google sign-up and owns no existing tree, THE Family_Tree_System SHALL create exactly one initial tree, assign that User as its Owner, and confirm creation.
2. AFTER sign-up, THE Family_Tree_System SHALL allow an authenticated User to explicitly create additional owned trees; each create request SHALL create exactly one tree and SHALL NOT establish an implicit default tree for later operations.
3. IF tree creation fails after account creation, THEN THE Family_Tree_System SHALL leave the User without a tree and return an error message indicating that tree creation did not complete.
4. THE Graph_Store SHALL permit content create, edit, and delete operations to the tree Owner and active Contributors; it SHALL permit a Linked_User to edit only their own Claimed_Node and its photos, and SHALL reserve tree configuration, sharing, deletion, collaborator management, and claim invitations to the Owner.
5. EVERY tree-scoped operation SHALL identify its target tree explicitly and SHALL be authorized against that same tree; no service may select the first or earliest owned tree as an implicit authorization scope.
6. IF a User attempts an operation without the capability required for the explicit target tree or node, THEN THE Family_Tree_System SHALL reject it, leave tree contents unchanged, and return a uniform authorization failure.

### Requirement 14: Privacy and Visibility

**User Story:** As a tree owner, I want to control the visibility of sensitive person information, so that details such as divorces, adoptions, and deceased status are shown only as intended.

#### Acceptance Criteria

1. THE Graph_Store SHALL store a visibility setting for each sensitive field of a Person node, where each sensitive field is one of marital status, adoption status, or death status, and where the visibility setting holds exactly one of the values "private" or "public".
2. WHEN a Person node is created without an explicit visibility setting for a sensitive field, THE Family_Tree_System SHALL set that field's visibility setting to "private".
3. WHILE a sensitive field's visibility setting is "private", THE Family_Tree_System SHALL include that field only for the tree Owner, an active Contributor, or the linked User when viewing their own Claimed_Node.
4. FOR every other authorized viewer, THE Family_Tree_System SHALL omit each private sensitive field while returning all other permitted fields.
5. WHILE a sensitive field's visibility setting is "public", THE Family_Tree_System SHALL include that field in the Person node response for every authorized viewer of the tree.

### Requirement 15: Person Node Deletion Cascade Choice

**User Story:** As a tree content editor, I want to choose what happens to neighboring records when I delete a person, so that I can either remove disconnected records or preserve their asserted kinship.

#### Acceptance Criteria

1. WHEN a Content_Editor submits a delete-person request for an editable Person node, THE Family_Tree_System SHALL present exactly two options, "cascade deletion" and "neighbor preservation", and SHALL make no change until one is selected.
2. IF the editor dismisses the deletion-choice prompt without selecting either option, THEN THE Family_Tree_System SHALL leave the target Person node and every connected Relationship edge unchanged.
3. WHEN the editor selects cascade deletion for a target Person node, THE Graph_Store SHALL remove the target Person node, remove every Relationship edge connected to the target Person node, and then repeatedly remove every other Person node that retains zero Relationship edges as a result of the removal, until no Person node that became edgeless through this operation remains.
4. WHEN the editor selects neighbor preservation for a target Person node, THE Graph_Store SHALL remove the target Person node and every Relationship edge connected to the target Person node, and SHALL retain every Person node that was connected to the target Person node.
5. WHILE neighbor preservation is being applied, FOR ALL pairs of distinct Person nodes (A, B) that were each connected to the target Person node by a Derived_Relationship and whose only Derived_Relationship path to each other passed through the target Person node, THE Graph_Store SHALL create an Asserted_Relationship between A and B labeled with the Form_Of_Address that the Kinship_Resolver computed between A and B immediately before the deletion.
6. WHEN the Graph_Store creates an Asserted_Relationship as a result of neighbor preservation, THE Renderer SHALL render that Relationship as a dashed line that is visually distinct from edges representing Derived_Relationships, consistent with Requirement 6.
7. IF, immediately before deletion, the Kinship_Resolver did not compute a defined Form_Of_Address between a neighbor pair (A, B), THEN THE Graph_Store SHALL NOT create an Asserted_Relationship for that pair during neighbor preservation.
8. WHERE neighbor preservation is selected and a Person node that was connected to the target Person node retains zero Relationship edges after the deletion, THE Graph_Store SHALL retain that Person node as an isolated Person node with no Relationship edges.
9. WHEN an Asserted_Relationship created by neighbor preservation is later completed by an unbroken path of Primitive_Bloodline_Edges, THE Graph_Store SHALL apply the upgrade and conflict-detection behavior defined in Requirement 7 to that Asserted_Relationship, including presenting a conflict warning when the newly derived Form_Of_Address differs from the retained label.
10. IF a Content_Editor submits a delete-person request targeting a Person node outside the explicitly selected tree, THEN THE Family_Tree_System SHALL reject the request, make no change to any Person node or Relationship edge, and return an error indication that the target node is not accessible.

### Requirement 16: Search and Filter Person Nodes

**User Story:** As a user, I want to search and filter the people in my tree by name, by how I address them, and by their attributes, so that I can quickly locate relevant relatives in a large tree.

#### Acceptance Criteria

1. WHEN a User submits a search query of 1 to 100 characters against display name, THE Search_Service SHALL return all and only the Person nodes in the current tree whose display name contains the query as a case-insensitive and diacritic-insensitive substring.
2. WHEN a User submits a search query against Form_Of_Address relative to the current Viewpoint, THE Search_Service SHALL return all and only the Person nodes whose computed Form_Of_Address from the current Viewpoint equals the query term.
3. THE Search_Service SHALL support filtering Person nodes by each of the following Person fields: gender value, side relative to the current Viewpoint (paternal or maternal), birth-year range defined by an inclusive lower bound and an inclusive upper bound, death status, claimed status (Claimed_Node or unclaimed), and relationship type (Primitive_Bloodline_Edge, Marriage_Edge, Asserted_Relationship, or Non_Bloodline_Relation).
4. WHEN a User applies two or more filters simultaneously, THE Search_Service SHALL return all and only the Person nodes that satisfy every applied filter.
5. FOR ALL combinations of applied filters, THE Search_Service SHALL return a result set that is a subset of the result set it returns when any one of those filters is removed (filter-monotonicity property).
6. IF no Person node satisfies the submitted search query and applied filters, THEN THE Search_Service SHALL return an empty result set and a no-matches indication.
7. WHEN a User submits a search or filter request against a tree of up to 1,000 Person nodes, THE Search_Service SHALL return the result set within 2 seconds.
8. IF a search query is empty or exceeds 100 characters, or a birth-year range specifies a lower bound greater than its upper bound, THEN THE Search_Service SHALL reject the request, return no result set, and return an error indication identifying the invalid field.
9. FOR a Southern ordinal display term, THE Search_Service SHALL compare address queries exactly after case-folding and removing Vietnamese diacritics: the base term SHALL match every corresponding relative, while the full ordinal term SHALL match only the relative whose ordinal is visible to the requester.

### Requirement 17: In-Application Usage Guide

**User Story:** As a user, I want an in-app guide that explains the core concepts and workflows, so that I can learn how to use the application without external help.

#### Acceptance Criteria

1. THE Family_Tree_System SHALL provide access to the Help_System from the main application interface.
2. THE Help_System SHALL contain at least one section addressing each of the following topics: the distinction between solid Derived_Relationship lines and existing dashed Asserted_Relationship lines; how to add a new Person through a Derived_Relationship; how to connect two existing Person nodes through a Derived_Relationship; how to interpret and resolve existing asserted-edge conflicts; how the Kinship_Resolver computes a Form_Of_Address; how to change the Viewpoint; how to use “Xác nhận đây là tôi” to link a Person node; and how to select a Region. The mounted UI guide SHALL NOT instruct users to create a new Asserted_Relationship while that creation flow is intentionally unavailable from the UI.
3. WHEN a User opens the Help_System, THE Family_Tree_System SHALL display the guide content within 2 seconds.
4. WHEN a User selects one of the topics listed in criterion 2 from the Help_System, THE Help_System SHALL display the section corresponding to the selected topic.
5. FOR ALL topics listed in criterion 2, THE Help_System SHALL provide a corresponding section that is reachable from the Help_System entry point (topic-coverage property).

### Requirement 18: Accessibility Across Age Groups

**User Story:** As a user of any age, including elderly and younger relatives, I want the application to be legible and easy to operate, so that everyone in the family can use it comfortably.

#### Acceptance Criteria

1. THE Family_Tree_System SHALL provide a text-size setting that scales application text from 100% up to at least 200% of the default size without loss of content or functionality.
2. WHEN the text-size setting is changed, THE Family_Tree_System SHALL apply the selected size to all subsequently rendered screens.
3. THE Renderer SHALL render text against its background with a contrast ratio of at least 4.5:1 for normal-size text and at least 3:1 for large-scale text, aligned with WCAG 2.1 success criterion 1.4.3.
4. WHERE the application is operated on a touch device, THE Renderer SHALL render each interactive touch target with a size of at least 44 by 44 CSS pixels.
5. THE Family_Tree_System SHALL expose every interactive control and informational element with a programmatically determinable name, role, and value compatible with screen readers, aligned with WCAG 2.1 success criterion 4.1.2.
6. THE Family_Tree_System SHALL provide keyboard-only navigation that reaches every interactive control, aligned with WCAG 2.1 success criterion 2.1.1.
7. THE Family_Tree_System SHALL provide clearly labelled buttons for all core actions (e.g., zoom, pan, focus) instead of relying solely on icon-only buttons.
8. THE Family_Tree_System SHALL ensure all touch or gesture-based interactions have non-gesture, visible button equivalents.

> Note: The acceptance criteria above target machine-verifiable, WCAG-aligned thresholds (scalable text, contrast ratios, touch-target size, programmatic names/roles, keyboard reachability). Full accessibility conformance cannot be confirmed by automated checks alone; it additionally requires manual testing with assistive technologies (for example screen readers) and expert accessibility review.

### Requirement 19: Tree-Level Sharing and Read Authorization

**User Story:** As a tree owner, I want to control who can view my tree, so that strangers cannot read my family's information.

#### Acceptance Criteria

1. THE Family_Tree_System SHALL store for each tree a sharing setting holding exactly one of "private", "link", or "public", and SHALL default that setting to "private" when none is specified.
2. THE Family_Tree_System SHALL require an authenticated session for every request that reads Person nodes, Relationship edges, or computed forms of address.
3. WHILE a tree's sharing setting is "private", THE Family_Tree_System SHALL permit read access only to the tree Owner, active Contributors, and Users linked to a Claimed_Node in that tree.
4. WHILE a tree's sharing setting is "link", THE Family_Tree_System SHALL permit read access — in addition to the Owner, Contributors, and linked users — only to a requester who presents a valid, unguessable share token for that tree.
5. WHEN an Owner generates or revokes a share token, THE Family_Tree_System SHALL respectively issue a new unguessable token or invalidate the existing token, and SHALL deny "link" read access made through a revoked token.
6. WHILE a tree's sharing setting is "public", THE Family_Tree_System SHALL permit read access to any authenticated User, subject to the per-person and living-person visibility rules of Requirements 14, 20, and 21.
7. IF a requester who is not authorized to read a tree under criteria 3–6 requests any read of that tree, THEN THE Family_Tree_System SHALL reject the request, disclose no Person or Relationship data, and return a uniform authorization-failure message that does not reveal whether the tree exists.
8. THE Family_Tree_System SHALL restrict changing a tree's sharing setting and managing its share token to the tree Owner.

### Requirement 20: Protection of Living Persons

**User Story:** As a user, I want details of living relatives hidden from people who are not family, so that living individuals are protected from misuse.

#### Acceptance Criteria

1. THE Family_Tree_System SHALL treat a Person node as a Living_Person unless its death status is true or its birth year is more than 100 years before the current year.
2. WHILE a Person node is a Living_Person, Living_Person redaction is enabled, and the viewer is neither the tree Owner, an active Contributor, nor the linked User of that node's Claimed_Node, THE Family_Tree_System SHALL omit birth year and birth order and replace the display name with a non-identifying placeholder, except for fields set to "public" (Requirement 21).
3. WHILE a Person node is not a Living_Person, THE Family_Tree_System SHALL apply only the per-field visibility rules of Requirements 14 and 21 and SHALL NOT apply Living_Person redaction.
4. THE Family_Tree_System SHALL provide a per-tree Living_Person-redaction setting, controllable only by the Owner, defaulting to enabled.
5. WHERE Living_Person redaction omits or replaces fields, THE Family_Tree_System SHALL still return enough of the person's node identity and graph position to render the tree structure without exposing the protected fields.
6. WHEN birth order is omitted by the privacy projection, THE Family_Tree_System SHALL omit its Southern ordinal from viewpoint-address and search results and SHALL NOT allow a full-ordinal query to reveal that hidden value.

### Requirement 21: Extended Field Visibility

**User Story:** As a tree owner or a claimed user, I want to control the visibility of name, birth year, and photo, so that identifying details are shown only as intended.

#### Acceptance Criteria

1. THE Graph_Store SHALL store a visibility setting holding exactly one of "private" or "public" for each of the following additional Person fields: display name, birth year, and primary photo.
2. WHEN a Person node is created without an explicit visibility setting for one of these fields, THE Family_Tree_System SHALL set the display-name and birth-year visibility to "public" and the primary-photo visibility to "private" (so a shared genealogy is usable by default while living individuals remain protected by Requirement 20 and photos stay private by default).
3. WHILE one of these fields' visibility setting is "private", THE Family_Tree_System SHALL include that field only for the tree Owner, an active Contributor, or the linked User when viewing their own Claimed_Node.
4. FOR every other viewer, a private display name SHALL be replaced with a non-identifying placeholder while every other permitted field is returned.
5. THE Family_Tree_System SHALL restrict changing these visibility settings to the tree Owner and, for a Claimed_Node, its linked User.

### Requirement 22: Personal Data Rights

**User Story:** As a person whose record is stored in a tree, I want to access, correct, and remove my own data, so that I retain control over my personal information.

#### Acceptance Criteria

1. WHEN the linked User of a Claimed_Node requests an export of their node's data, THE Family_Tree_System SHALL return a machine-readable export of all stored fields of that Person node and of the Relationship edges directly connecting it.
2. WHEN the linked User of a Claimed_Node submits a correction to a field they are permitted to edit, THE Family_Tree_System SHALL apply the correction subject to the same validation as an Owner edit.
3. WHEN the linked User of a Claimed_Node requests removal of their personal data, THE Family_Tree_System SHALL, according to the option the User selects, either delete the Person node applying the deletion-choice behavior of Requirement 15 or irreversibly anonymize the node's identifying fields, and SHALL record that the request was made.
4. WHEN a User requests deletion of their own User account, THE Family_Tree_System SHALL delete or irreversibly anonymize the account's personal data, delete every tree the account owns together with those trees' Person nodes, Relationship edges, invitations, share tokens, and associated images, remove the User from trees where they are only a Contributor, detach their claims according to the selected data-rights strategy, and terminate all sessions.
5. IF an unauthenticated requester, or a User who is not the subject of the data, attempts a data-rights operation in criteria 1–4, THEN THE Family_Tree_System SHALL reject the request and make no change.

### Requirement 23: Terms of Service, Privacy Policy, and Consent

**User Story:** As both the operator and a user, I want clear terms and recorded consent, so that personal data is handled lawfully and transparently.

#### Acceptance Criteria

1. THE Family_Tree_System SHALL make a Terms of Service document and a Privacy Policy document accessible from the application without requiring authentication.
2. WHEN a User completes sign-up, THE Family_Tree_System SHALL require the User to accept the current Terms of Service and Privacy Policy and SHALL record the acceptance together with the accepted document version and a timestamp.
3. IF a User does not accept the current Terms of Service and Privacy Policy during sign-up, THEN THE Family_Tree_System SHALL NOT create the account.
4. WHEN the version of the Terms of Service or Privacy Policy changes, THE Family_Tree_System SHALL require re-acceptance from each User before that User's next data-mutating operation and SHALL record the new acceptance.
5. THE Privacy Policy SHALL state the categories of personal data stored, the purposes of processing, the data-subject rights of Requirement 22, and a contact point for data-protection requests.
6. WHEN a Content_Editor adds or edits a Person node representing another person, THE Family_Tree_System SHALL present a notice that the editor is responsible for having a lawful basis to record that person's data.

### Requirement 24: Person Photos

**User Story:** As a user, I want to attach photos to a person, so that the tree shows faces while photos stay protected.

#### Acceptance Criteria

1. WHEN an authorized editor of a Person node uploads an image of a supported type (JPEG or PNG) within the configured maximum size, THE Family_Tree_System SHALL store the image associated with that Person node, and SHALL support associating more than one image with a single Person node.
2. THE Family_Tree_System SHALL allow designating exactly one stored image of a Person node as that node's primary photo.
3. IF an uploaded file is not a supported image type (JPEG or PNG) or exceeds the configured maximum size, THEN THE Family_Tree_System SHALL reject the upload, store no image, and return an error identifying the problem. (WebP support is deferred pending an image codec; uploads of other types, including WebP, are rejected.)
4. WHEN the Family_Tree_System stores an uploaded image, THE Family_Tree_System SHALL strip embedded metadata, including any geolocation/EXIF data, before persisting the image.
5. THE Family_Tree_System SHALL serve a stored image only to a viewer authorized to view that Person node under Requirements 14, 19, 20, and 21, and SHALL govern primary-photo exposure by the primary-photo visibility setting of Requirement 21.
6. WHEN a Person node is deleted, THE Family_Tree_System SHALL delete every image associated with that node from image storage.
7. THE Family_Tree_System SHALL store image binary content outside the primary relational database in object storage and SHALL persist only an image reference and its metadata in the database.
8. THE Family_Tree_System SHALL permit the tree Owner and active Contributors to upload, delete, and set the primary photo for any Person node; a Linked_User may do so only for their own Claimed_Node. Only the Owner or linked User may change photo visibility.

### Requirement 25: Abuse Prevention and Audit Logging

**User Story:** As the operator, I want abuse protections and audit trails, so that misuse is limited and traceable.

#### Acceptance Criteria

1. THE Family_Tree_System SHALL rate-limit verification-code requests per identifier and per source address, and SHALL reject requests exceeding the configured threshold with a retry indication that does not reveal whether the identifier exists.
2. THE Family_Tree_System SHALL record an audit-log entry for each authentication event, each sharing-setting change, each visibility change, each data-rights operation, and each Person-node deletion, capturing the actor, the action, the target, and a timestamp.
3. THE Family_Tree_System SHALL NOT record verification codes, session tokens, or share tokens in plaintext in the audit log.
4. WHEN read access to a tree is denied under Requirement 19, THE Family_Tree_System SHALL return a uniform authorization-failure response that does not reveal whether the tree exists.

### Requirement 26: Collaboration Invitation Links

**User Story:** As a tree owner, I want to share a reusable invitation link, so that relatives can request collaboration without manually entering a code.

#### Acceptance Criteria

1. WHEN a tree Owner creates a generic collaboration invitation, THE Family_Tree_System SHALL issue both a six-character code and a copyable link referencing the same invitation, valid for seven days and reusable by multiple Users.
2. WHEN an authenticated User confirms a valid generic invitation link or code, THE Family_Tree_System SHALL create exactly one pending request for that User and source invitation and SHALL require Owner approval before granting collaboration access.
3. WHEN the Owner approves a pending request, THE Family_Tree_System SHALL add the requesting User as a contributor exactly once and mark the request joined; repeated submission or approval SHALL NOT create duplicates.
4. IF an unauthenticated requester opens an invitation link, THE Family_Tree_System SHALL redirect to sign-in, preserve the invitation return path across sign-in and sign-up, and return to the invitation after successful authentication.
5. WHEN an authenticated User opens a direct email invitation, THE Family_Tree_System SHALL permit viewing and acceptance only when the normalized account email matches the invited email.
6. IF an invitation is missing, expired, inactive, or belongs to another email account, THE Family_Tree_System SHALL disclose no invited email or tree data and SHALL return the uniform public message "Lời mời không hợp lệ".
7. THE Family_Tree_System SHALL rate-limit collaboration join attempts by authenticated User and source address and SHALL NOT expose a raw invitation code from the invitation-detail endpoint.

> Compliance note: Requirements 19–26 establish the product and technical mechanisms for protecting personal data (access control, living-person protection, data-subject rights, consent capture, photo handling, collaboration invitations, and abuse/audit controls). The wording of the Terms of Service and Privacy Policy documents (Requirement 23) and the determination of the applicable legal basis are legal matters that require review by qualified counsel; these requirements specify the system behavior, not the legal text. They are informed by Vietnam's Law on Personal Data Protection (2025), which supersedes Decree 13/2023/ND-CP.
