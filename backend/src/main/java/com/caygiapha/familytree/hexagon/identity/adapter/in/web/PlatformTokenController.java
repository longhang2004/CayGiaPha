package com.caygiapha.familytree.hexagon.identity.adapter.in.web;

import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.platform.security.JwtTokenService;
import com.caygiapha.familytree.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform/auth")
public class PlatformTokenController {

    private final UserRepository userRepository;
    private final JwtTokenService jwtTokenService;

    public PlatformTokenController(UserRepository userRepository, JwtTokenService jwtTokenService) {
        this.userRepository = userRepository;
        this.jwtTokenService = jwtTokenService;
    }

    @PostMapping(path = "/token", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> token(@Valid @RequestBody TokenRequest request) {
        User user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> ApiException.accountNotFound("Invalid email or password."));
        if (user.getPasswordHash() == null || !BCrypt.checkpw(request.password(), user.getPasswordHash())) {
            throw ApiException.accountNotFound("Invalid email or password.");
        }
        String token = jwtTokenService.issue(user.getId());
        return Map.of(
                "tokenType", "Bearer",
                "accessToken", token,
                "userId", user.getId());
    }

    public record TokenRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {}
}
