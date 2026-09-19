package com.caygiapha.familytree.platform.openapi;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI familyTreeOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Cây Gia Phả API")
                        .version("v1")
                        .description(
                                "Vietnamese family-tree reference API. Product auth is HttpOnly sessions; "
                                        + "Bearer JWT is the parallel portfolio surface under /api/v1/platform."))
                .components(new Components()
                        .addSecuritySchemes(
                                "bearer-jwt",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }
}
