package com.caygiapha.familytree.security;

import com.caygiapha.familytree.config.SessionCookieFactory;
import com.caygiapha.familytree.platform.security.JwtTokenService;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.UserRepository;
import com.caygiapha.familytree.service.SessionService;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * Registers the {@link AuthenticationFilter} as a plain servlet filter over the API surface.
 *
 * <p>Spring Security is on the classpath as a permit-all filter chain (see
 * {@code HttpSecurityConfiguration}). This servlet filter still resolves the SESSION cookie or
 * Bearer JWT into an {@link AuthContext} for every {@code /api/v1/**} request. The filter runs
 * early so the context is bound before any controller executes; per-endpoint authorization stays
 * fail-closed in {@link AuthorizationService}.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public FilterRegistrationBean<AuthenticationFilter> authenticationFilterRegistration(
            SessionService sessionService,
            SessionCookieFactory sessionCookieFactory,
            UserRepository userRepository,
            TreeRepository treeRepository,
            AuthContextHolder authContextHolder,
            JwtTokenService jwtTokenService) {
        AuthenticationFilter filter = new AuthenticationFilter(
                sessionService,
                sessionCookieFactory,
                userRepository,
                treeRepository,
                authContextHolder,
                jwtTokenService);

        FilterRegistrationBean<AuthenticationFilter> registration =
                new FilterRegistrationBean<>(filter);
        registration.addUrlPatterns("/api/v1/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        registration.setName("authenticationFilter");
        return registration;
    }

    @Bean
    public FilterRegistrationBean<CsrfOriginFilter> csrfOriginFilterRegistration(
            CsrfOriginFilter csrfOriginFilter) {
        FilterRegistrationBean<CsrfOriginFilter> registration =
                new FilterRegistrationBean<>(csrfOriginFilter);
        registration.addUrlPatterns("/api/*");
        // Run before authentication so cross-origin mutations are rejected early.
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 5);
        registration.setName("csrfOriginFilter");
        return registration;
    }
}
