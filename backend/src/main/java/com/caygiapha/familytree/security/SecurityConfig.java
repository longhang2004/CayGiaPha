package com.caygiapha.familytree.security;

import com.caygiapha.familytree.config.SessionCookieFactory;
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
 * <p>The design notes that a full Spring Security dependency is not required (the project does not
 * include {@code spring-security}); a {@link org.springframework.web.filter.OncePerRequestFilter}
 * registered here is sufficient to resolve the session into an {@link AuthContext} for every
 * {@code /api/v1/**} request. The filter runs early (high precedence) so the context is bound before
 * any controller executes; per-endpoint authorization is enforced downstream by
 * {@link AuthorizationService}.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public FilterRegistrationBean<AuthenticationFilter> authenticationFilterRegistration(
            SessionService sessionService,
            SessionCookieFactory sessionCookieFactory,
            UserRepository userRepository,
            TreeRepository treeRepository,
            AuthContextHolder authContextHolder) {
        AuthenticationFilter filter = new AuthenticationFilter(
                sessionService,
                sessionCookieFactory,
                userRepository,
                treeRepository,
                authContextHolder);

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
