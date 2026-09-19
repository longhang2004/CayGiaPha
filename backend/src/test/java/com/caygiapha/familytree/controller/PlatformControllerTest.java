package com.caygiapha.familytree.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.repository.TreeRepository;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PlatformControllerTest {

    @Test
    void describesModularHexagonForReviewersWithoutLeakingFamilyRows() {
        TreeRepository trees = mock(TreeRepository.class);
        when(trees.count()).thenReturn(1L);

        Map<String, Object> body = new PlatformController(trees).architecture();

        assertThat(body.get("runtime")).asString().contains("Java 21");
        assertThat(body.get("productionPath")).asString().contains("Next.js");
        assertThat(body.get("auth")).asString().contains("JWT");
        assertThat(body.get("privacy")).asString().contains("Living-person");
        assertThat(body.get("events")).asString().contains("outbox");
        assertThat(body).doesNotContainKey("email");
        assertThat(body.get("seededTrees")).isEqualTo(1L);
    }
}
