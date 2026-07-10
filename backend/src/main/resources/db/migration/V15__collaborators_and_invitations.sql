-- V15__collaborators_and_invitations.sql
-- Historical migration: do not add defaults here (see V22 for gen_random_uuid repair).
CREATE TABLE tree_collaborators (
    id UUID NOT NULL,
    tree_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'contributor',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_tree_collaborators PRIMARY KEY (id),
    CONSTRAINT fk_tree_collaborators_tree FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
    CONSTRAINT fk_tree_collaborators_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_tree_collaborators_tree_user UNIQUE (tree_id, user_id)
);

CREATE TABLE collaboration_invitations (
    id UUID NOT NULL,
    tree_id UUID NOT NULL,
    inviter_user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_collaboration_invitations PRIMARY KEY (id),
    CONSTRAINT fk_collaboration_invitations_tree FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
    CONSTRAINT fk_collaboration_invitations_inviter FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE
);
