package com.caygiapha.familytree.hexagon.kinship.adapter.out.redis;

import com.caygiapha.familytree.dto.ViewpointAddressesResponse;
import com.caygiapha.familytree.hexagon.kinship.adapter.out.memory.InMemoryKinshipCacheAdapter;
import com.caygiapha.familytree.hexagon.kinship.port.out.KinshipCachePort;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Primary
@Component
public class RedisKinshipCacheAdapter implements KinshipCachePort {

    private static final Logger log = LoggerFactory.getLogger(RedisKinshipCacheAdapter.class);
    private static final String KEY_PREFIX = "kinship:addresses:";

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final KinshipCachePort fallback;
    private final Duration ttl;

    public RedisKinshipCacheAdapter(
            ObjectProvider<StringRedisTemplate> redisProvider,
            ObjectMapper objectMapper,
            InMemoryKinshipCacheAdapter fallback,
            @Value("${app.kinship-cache.ttl-seconds:120}") long ttlSeconds) {
        this.redis = redisProvider.getIfAvailable();
        this.objectMapper = objectMapper;
        this.fallback = fallback;
        this.ttl = Duration.ofSeconds(ttlSeconds);
    }

    @Override
    public Optional<ViewpointAddressesResponse> get(UUID treeId, UUID egoId) {
        if (redis == null) {
            return fallback.get(treeId, egoId);
        }
        try {
            String json = redis.opsForValue().get(redisKey(treeId, egoId));
            if (json == null) {
                return fallback.get(treeId, egoId);
            }
            return Optional.of(objectMapper.readValue(json, ViewpointAddressesResponse.class));
        } catch (Exception ex) {
            log.warn("Kinship Redis get missed; using memory fallback");
            return fallback.get(treeId, egoId);
        }
    }

    @Override
    public void put(UUID treeId, UUID egoId, ViewpointAddressesResponse value) {
        fallback.put(treeId, egoId, value);
        if (redis == null) {
            return;
        }
        try {
            redis.opsForValue().set(redisKey(treeId, egoId), objectMapper.writeValueAsString(value), ttl);
            redis.opsForSet().add(indexKey(treeId), redisKey(treeId, egoId));
            redis.expire(indexKey(treeId), ttl);
        } catch (Exception ex) {
            log.warn("Kinship Redis put failed; memory cache still holds the value");
        }
    }

    @Override
    public void evictTree(UUID treeId) {
        fallback.evictTree(treeId);
        if (redis == null) {
            return;
        }
        try {
            var keys = redis.opsForSet().members(indexKey(treeId));
            if (keys != null && !keys.isEmpty()) {
                redis.delete(keys);
            }
            redis.delete(indexKey(treeId));
        } catch (Exception ex) {
            log.warn("Kinship Redis evict failed; memory cache was still cleared");
        }
    }

    private static String redisKey(UUID treeId, UUID egoId) {
        return KEY_PREFIX + treeId + ":" + egoId;
    }

    private static String indexKey(UUID treeId) {
        return KEY_PREFIX + "index:" + treeId;
    }
}
