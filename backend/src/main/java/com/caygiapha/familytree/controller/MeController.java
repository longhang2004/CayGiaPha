package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.config.SessionCookieFactory;
import com.caygiapha.familytree.dto.DataExportResponse;
import com.caygiapha.familytree.dto.EraseNodeRequest;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.service.AuditService;
import com.caygiapha.familytree.service.DataRightsService;
import com.caygiapha.familytree.service.DataRightsService.EraseStrategy;
import java.util.Locale;
import java.util.UUID;
import com.caygiapha.familytree.dto.UpdateProfileRequest;
import com.caygiapha.familytree.dto.MeProfileResponse;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.repository.UserRepository;
import com.caygiapha.familytree.security.AuthContext;
import com.caygiapha.familytree.security.AuthorizationService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Self-service personal-data-rights endpoints for the authenticated subject (Requirement 22):
 *
 * <ul>
 *   <li>{@code GET    /api/v1/me/nodes/{personId}/export} — export the linked node's data (22.1).</li>
 *   <li>{@code POST   /api/v1/me/nodes/{personId}/erase}  — delete or anonymize the node (22.3).</li>
 *   <li>{@code DELETE /api/v1/me/account}                 — delete the account and owned tree (22.4).</li>
 * </ul>
 *
 * <p>Subject-only authorization and the cascade live in {@link DataRightsService}; each operation is
 * recorded to the audit log (25.2).
 */
@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    private final DataRightsService dataRightsService;
    private final AuditService auditService;
    private final SessionCookieFactory sessionCookieFactory;
    private final AuthorizationService authorizationService;
    private final UserRepository userRepository;

    public MeController(
            DataRightsService dataRightsService,
            AuditService auditService,
            SessionCookieFactory sessionCookieFactory,
            AuthorizationService authorizationService,
            UserRepository userRepository) {
        this.dataRightsService = dataRightsService;
        this.auditService = auditService;
        this.sessionCookieFactory = sessionCookieFactory;
        this.authorizationService = authorizationService;
        this.userRepository = userRepository;
    }

    @GetMapping("/nodes/{personId}/export")
    public DataExportResponse export(@PathVariable("personId") UUID personId) {
        DataExportResponse export = dataRightsService.exportNode(personId);
        auditService.record(AuditService.DATA_EXPORTED, "person", personId); // 25.2
        return export;
    }

    @PostMapping("/nodes/{personId}/erase")
    public ResponseEntity<Void> erase(
            @PathVariable("personId") UUID personId, @RequestBody EraseNodeRequest request) {
        EraseStrategy strategy = parseStrategy(request.strategy());
        dataRightsService.eraseNode(personId, strategy);
        auditService.record(AuditService.NODE_ERASED, "person", personId,
                strategy.name().toLowerCase(Locale.ROOT)); // 25.2
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/account")
    public ResponseEntity<Void> deleteAccount() {
        UUID deletedUserId = dataRightsService.deleteAccount();
        auditService.recordAs(deletedUserId, AuditService.ACCOUNT_DELETED, "user", deletedUserId, null);
        // Clear the now-defunct session cookie.
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, sessionCookieFactory.clear().toString())
                .build();
    }

    private EraseStrategy parseStrategy(String value) {
        if (value == null) {
            throw ApiException.validation("strategy", "Strategy is required (delete or anonymize).");
        }
        return switch (value.toLowerCase(Locale.ROOT)) {
            case "delete" -> EraseStrategy.DELETE;
            case "anonymize" -> EraseStrategy.ANONYMIZE;
            default -> throw ApiException.validation(
                    "strategy", "Strategy must be 'delete' or 'anonymize'.");
        };
    }

    @PatchMapping("/profile")
    public MeProfileResponse updateProfile(@RequestBody UpdateProfileRequest request) {
        AuthContext context = authorizationService.requireAuthenticatedViewer();
        User user = userRepository.findById(context.userId())
                .orElseThrow(() -> ApiException.notAuthorized("Bạn không có quyền cập nhật hồ sơ này."));

        if (request.displayName() == null) {
            throw ApiException.validation("displayName", "Vui lòng nhập tên hiển thị.");
        }

        String normalized = request.displayName().trim().replaceAll("\\s+", " ");
        if (normalized.isEmpty() || normalized.length() > 100) {
            throw ApiException.validation("displayName", "Tên hiển thị phải từ 1 đến 100 ký tự.");
        }

        if (normalized.matches(".*[\\x00-\\x1F\\x7F].*")) {
            throw ApiException.validation("displayName", "Tên hiển thị không hợp lệ.");
        }

        user.setDisplayName(normalized);
        userRepository.save(user);

        return new MeProfileResponse(user.getId(), user.getDisplayName());
    }
}
