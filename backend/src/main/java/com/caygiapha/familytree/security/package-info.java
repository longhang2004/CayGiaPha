/**
 * Authentication and authorization for the API surface (design "Request Flow Summary" /
 * "Security Considerations"; Requirements 11.6, 13.4, 13.5).
 *
 * <p>{@link com.caygiapha.familytree.security.AuthenticationFilter} resolves the session cookie of
 * each request into an {@link com.caygiapha.familytree.security.AuthContext} and binds it via
 * {@link com.caygiapha.familytree.security.AuthContextHolder};
 * {@link com.caygiapha.familytree.security.AuthorizationService} classifies the caller as owner /
 * linked-claimed-user / neither and enforces the mutation-authorization model (Property 18).
 */
package com.caygiapha.familytree.security;
