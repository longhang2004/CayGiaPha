package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.service.HealthService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Liveness endpoint. Confirms the web layer is wired to the service layer. All API endpoints
 * are served under the {@code /api/v1} prefix per the design's Components and Interfaces.
 */
@RestController
@RequestMapping("/api/v1")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return healthService.status();
    }
}
