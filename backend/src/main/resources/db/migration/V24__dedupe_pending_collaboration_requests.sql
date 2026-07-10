-- Preserve the newest request when older versions allowed duplicate pending generic joins.
WITH ranked_pending AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY tree_id, requester_user_id
            ORDER BY created_at DESC, id DESC
        ) AS row_number
    FROM collaboration_invitations
    WHERE status = 'pending'
      AND requester_user_id IS NOT NULL
)
UPDATE collaboration_invitations invitations
SET status = 'rejected'
FROM ranked_pending
WHERE invitations.id = ranked_pending.id
  AND ranked_pending.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_collaboration_pending_requester
    ON collaboration_invitations (tree_id, requester_user_id)
    WHERE status = 'pending'
      AND requester_user_id IS NOT NULL;
