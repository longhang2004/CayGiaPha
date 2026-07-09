package com.caygiapha.familytree.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class CsrfOriginFilterTest {

    private final CsrfOriginFilter filter =
            new CsrfOriginFilter("http://localhost:3000,https://caygiapha.example");

    @Test
    void allowsSafeMethodsWithoutOrigin() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/trees");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void allowsMutatingRequestWithoutOriginHeader() throws Exception {
        // curl / server-to-server / same-origin without Origin
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/signin");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void allowsMutatingRequestFromAllowlistedOrigin() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/signin");
        request.addHeader("Origin", "http://localhost:3000");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void rejectsMutatingRequestFromForeignOrigin() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/signin");
        request.addHeader("Origin", "https://evil.example");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    void allowsMutatingRequestWhenRefererMatchesAllowlist() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("PATCH", "/api/v1/persons/1");
        request.addHeader("Referer", "https://caygiapha.example/tree/abc");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(200);
    }
}
