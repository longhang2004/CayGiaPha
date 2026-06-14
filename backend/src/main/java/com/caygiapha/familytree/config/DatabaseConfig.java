package com.caygiapha.familytree.config;

import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Bean;
import javax.sql.DataSource;
import java.net.URI;
import java.net.URISyntaxException;

/**
 * Custom database configuration to dynamically parse PostgreSQL connection URIs
 * (such as those provided by Supabase, Heroku, or other cloud providers in standard
 * URI format like {@code postgresql://user:pass@host:port/db}) into JDBC-compliant DataSource properties.
 */
@Configuration
public class DatabaseConfig {

    @Bean
    @Primary
    public DataSource dataSource(DataSourceProperties properties) {
        String url = properties.getUrl();
        if (url != null && (url.startsWith("postgresql://") || url.startsWith("postgres://"))) {
            try {
                // Temporarily replace scheme with http to leverage java.net.URI parsing
                String tempUrl = url.replaceFirst("^(postgresql|postgres)://", "http://");
                URI uri = new URI(tempUrl);
                
                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    properties.setUsername(parts[0]);
                    properties.setPassword(parts[1]);
                }
                
                int port = uri.getPort();
                String hostPort = uri.getHost() + (port != -1 ? ":" + port : "");
                String path = uri.getPath();
                
                // URL-decode the password (e.g. %40 to @)
                if (properties.getPassword() != null) {
                    try {
                        properties.setPassword(java.net.URLDecoder.decode(properties.getPassword(), "UTF-8"));
                    } catch (Exception ignored) {}
                }
                
                String jdbcUrl = "jdbc:postgresql://" + hostPort + path;
                properties.setUrl(jdbcUrl);
            } catch (URISyntaxException e) {
                // Fallback to simple prepending if URI structure is non-standard
                properties.setUrl("jdbc:" + url);
            }
        }
        return properties.initializeDataSourceBuilder().build();
    }
}
