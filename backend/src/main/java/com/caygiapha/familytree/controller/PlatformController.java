package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.repository.TreeRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform")
public class PlatformController {

    private final TreeRepository treeRepository;

    public PlatformController(TreeRepository treeRepository) {
        this.treeRepository = treeRepository;
    }

    @GetMapping("/architecture")
    public Map<String, Object> architecture() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("runtime", "Java 21 / Spring Boot 3.3 modular hexagonal monolith");
        body.put("productionPath", "Next.js 14 App Router. This Java API is the runnable portfolio reference.");
        body.put(
                "boundedContexts",
                new String[] {"identity", "family-graph", "kinship", "privacy", "invitation-claim", "platform"});
        body.put("persistence", "PostgreSQL + Flyway. Primitive parent-child and spouse edges only.");
        body.put("cache", "Redis read-through for viewpoint kinship maps, in-memory fallback");
        body.put("events", "Transactional outbox + in-process domain events");
        body.put("auth", "HttpOnly SESSION cookie (product) and HMAC JWT (API clients)");
        body.put("privacy", "Living-person redaction and sensitive-read audit");
        body.put("docs", "/api/v1/docs");
        body.put("metrics", "/actuator/prometheus");
        body.put("seededTrees", treeRepository.count());
        body.put("defaultRegion", Tree.DEFAULT_REGION);
        return body;
    }
}
