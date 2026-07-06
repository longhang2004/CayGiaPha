package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.config.SessionCookieFactory;
import com.caygiapha.familytree.dto.AuthSessionResponse;
import com.caygiapha.familytree.dto.SignInRequest;
import com.caygiapha.familytree.dto.SignInResponse;
import com.caygiapha.familytree.dto.SignInVerifyRequest;
import com.caygiapha.familytree.dto.SignInVerifyResponse;
import com.caygiapha.familytree.dto.SignUpRequest;
import com.caygiapha.familytree.dto.SignUpVerifyRequest;
import com.caygiapha.familytree.dto.SignUpVerifyResponse;
import com.caygiapha.familytree.dto.GoogleAuthRequest;
import com.caygiapha.familytree.entity.Session;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.UserRepository;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthContextHolder;
import com.caygiapha.familytree.service.AuditService;
import com.caygiapha.familytree.service.AuthService;
import com.caygiapha.familytree.service.ConsentService;
import com.caygiapha.familytree.service.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Auth_Service sign-up, sign-in, and session endpoints (Requirements 1.1–1.3, 1.5–1.9, 2.1, 2.3,
 * 2.4, 2.5, 2.8, 9.2, 13.1, 13.2, 13.3):
 *
 * <ul>
 *   <li>{@code POST /api/v1/auth/signup} — create an unverified account for a phone/email and
 *       trigger a verification code.</li>
 *   <li>{@code POST /api/v1/auth/signup/verify} — submit the code to verify the account; on success
 *       the user's single tree is created with the default region.</li>
 *   <li>{@code POST /api/v1/auth/signin} — request a sign-in code for a verified identifier
 *       (account-not-found otherwise; 2.4).</li>
 *   <li>{@code POST /api/v1/auth/signin/verify} — submit the code; on success a 30-day session is
 *       established and its opaque token set in the {@code HttpOnly}/{@code Secure}/{@code SameSite}
 *       session cookie (2.3).</li>
 *   <li>{@code POST /api/v1/auth/signout} — revoke the current session and clear the cookie
 *       (2.8).</li>
 * </ul>
 *
 * <p>These are part of the minimized unauthenticated surface (design Security Considerations).
 * Validation and duplicate/verification handling live in {@link AuthService} and surface through
 * the global error envelope.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final SessionCookieFactory sessionCookieFactory;
    private final ConsentService consentService;
    private final RateLimiter rateLimiter;
    private final AuditService auditService;
    private final AuthContextHolder authContextHolder;
    private final UserRepository userRepository;

    public AuthController(
            AuthService authService,
            SessionCookieFactory sessionCookieFactory,
            ConsentService consentService,
            RateLimiter rateLimiter,
            AuditService auditService,
            AuthContextHolder authContextHolder,
            UserRepository userRepository) {
        this.authService = authService;
        this.sessionCookieFactory = sessionCookieFactory;
        this.consentService = consentService;
        this.rateLimiter = rateLimiter;
        this.auditService = auditService;
        this.authContextHolder = authContextHolder;
        this.userRepository = userRepository;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signUp(@RequestBody SignUpRequest request, HttpServletRequest http) {
        // 25.1 — throttle code requests per identifier and per source address.
        rateLimiter.check("signup:" + request.identifier());
        rateLimiter.check("ip:" + http.getRemoteAddr());
        if (request.password() != null) {
            AuthService.PasswordSignUpResult result = authService.signUpWithPassword(
                    request.identifier(),
                    request.password(),
                    request.region(),
                    request.acceptedTos(),
                    request.acceptedPrivacy());
            auditService.recordAs(result.session().getUserId(), AuditService.SIGN_UP_VERIFIED, "user",
                    result.session().getUserId(), null); // 25.2
            return ResponseEntity.status(HttpStatus.CREATED)
                    .header(
                            HttpHeaders.SET_COOKIE,
                            sessionCookieFactory.create(result.session().getId()).toString())
                    .body(result.response());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.signUp(request.identifier()));
    }

    @PostMapping("/signup/verify")
    public SignUpVerifyResponse verifySignUp(@RequestBody SignUpVerifyRequest request) {
        // 23.3 — refuse account verification (and thus tree creation) without both consents, before
        // the code is checked, so nothing is created when consent is missing.
        consentService.requireConsent(request.acceptedTos(), request.acceptedPrivacy());
        SignUpVerifyResponse response =
                authService.verifySignUp(request.identifier(), request.code(), request.region());
        // 23.2 — record acceptance of the current document versions with a timestamp.
        consentService.recordConsent(response.userId());
        auditService.recordAs(response.userId(), AuditService.SIGN_UP_VERIFIED, "user",
                response.userId(), null); // 25.2
        return response;
    }

    @PostMapping("/signin")
    public ResponseEntity<?> signIn(@RequestBody SignInRequest request, HttpServletRequest http) {
        // 25.1 — throttle sign-in code requests per identifier and per source address.
        rateLimiter.check("signin:" + request.identifier());
        rateLimiter.check("ip:" + http.getRemoteAddr());
        if (request.password() != null) {
            Session session = authService.signInWithPassword(request.identifier(), request.password());
            auditService.recordAs(session.getUserId(), AuditService.SIGN_IN, "user",
                    session.getUserId(), null); // 25.2
            return ResponseEntity.ok()
                    .header(
                            HttpHeaders.SET_COOKIE,
                            sessionCookieFactory.create(session.getId()).toString())
                    .body(new SignInVerifyResponse(session.getUserId(), session.getExpiresAt()));
        }
        return ResponseEntity.ok(authService.signIn(request.identifier()));
    }

    @PostMapping("/signin/verify")
    public ResponseEntity<SignInVerifyResponse> verifySignIn(
            @RequestBody SignInVerifyRequest request) {
        Session session = authService.verifySignIn(request.identifier(), request.code());
        auditService.recordAs(session.getUserId(), AuditService.SIGN_IN, "user",
                session.getUserId(), null); // 25.2
        // 2.3 — deliver the opaque token only in the HttpOnly/Secure/SameSite session cookie.
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.SET_COOKIE,
                        sessionCookieFactory.create(session.getId()).toString())
                .body(new SignInVerifyResponse(session.getUserId(), session.getExpiresAt()));
    }

    @PostMapping("/google")
    public ResponseEntity<SignInVerifyResponse> verifyGoogleAuth(@RequestBody GoogleAuthRequest request) {
        Session session = authService.verifyGoogleAuth(request.idToken(), request.region(), request.acceptedTos(), request.acceptedPrivacy());
        auditService.recordAs(session.getUserId(), AuditService.SIGN_IN, "user",
                session.getUserId(), "google"); // Or another audit action
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.SET_COOKIE,
                        sessionCookieFactory.create(session.getId()).toString())
                .body(new SignInVerifyResponse(session.getUserId(), session.getExpiresAt()));
    }

    @GetMapping("/session")
    public AuthSessionResponse session() {
        AuthContext auth = authContextHolder.current();
        if (!auth.isAuthenticated()) {
            throw ApiException.accountNotFound("No active session found.");
        }

        User user = userRepository.findById(auth.userId())
                .orElseThrow(() -> ApiException.accountNotFound(
                        "No user found for current session."));
        String identifier = user.getPhone() != null ? user.getPhone() : user.getEmail();
        return new AuthSessionResponse(
                user.getId(),
                auth.ownedTreeId().orElse(null),
                identifier == null ? "" : identifier,
                user.isVerified(),
                "admin".equals(user.getRole()) ? "admin" : "user");
    }

    @PostMapping("/signout")
    public ResponseEntity<Void> signOut(
            @CookieValue(name = SessionCookieFactory.COOKIE_NAME, required = false)
                    String sessionCookie) {
        // 2.8 — revoke the current session (no-op if absent/invalid) and clear the cookie.
        sessionCookieFactory.parseToken(sessionCookie).ifPresent(token -> {
            authService.signOut(token);
            auditService.record(AuditService.SIGN_OUT, "session", null); // 25.2
        });
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, sessionCookieFactory.clear().toString())
                .build();
    }
}
