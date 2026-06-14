package com.caygiapha.familytree.service;

import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * Minimal domain service used to establish and exercise the controller -> service layering.
 * Real domain services (Graph_Store, Kinship_Resolver, etc.) are added in later tasks.
 */
@Service
public class HealthService {

    /**
     * @return a small status payload indicating the API is up.
     */
    public Map<String, String> status() {
        return Map.of(
                "service", "family-tree-api",
                "status", "UP");
    }
}
