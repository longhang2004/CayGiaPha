package com.caygiapha.familytree.security;

/** Tree-level role names exposed by the tree-detail API contract. */
public enum TreeAccessRole {
    OWNER,
    CONTRIBUTOR,
    LINKED,
    READER,
    NONE
}
