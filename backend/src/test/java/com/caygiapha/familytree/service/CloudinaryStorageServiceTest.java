package com.caygiapha.familytree.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.cloudinary.Url;
import com.cloudinary.utils.ObjectUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CloudinaryStorageServiceTest {

    private Cloudinary mockCloudinary;
    private Uploader mockUploader;
    private Url mockUrl;
    private CloudinaryStorageService storageService;

    @BeforeEach
    void setUp() {
        mockCloudinary = mock(Cloudinary.class);
        mockUploader = mock(Uploader.class);
        mockUrl = mock(Url.class);

        when(mockCloudinary.uploader()).thenReturn(mockUploader);
        when(mockCloudinary.url()).thenReturn(mockUrl);
        when(mockUrl.secure(anyBoolean())).thenReturn(mockUrl);

        storageService = new CloudinaryStorageService(
                "",
                "test-cloud",
                "test-key",
                "test-secret"
        );
        // Inject the mocked Cloudinary instance
        ReflectionTestUtils.setField(storageService, "cloudinary", mockCloudinary);
    }

    @Test
    void testPutSuccess() throws IOException {
        byte[] content = "test-image".getBytes();
        String key = "persons/123/abc";
        String contentType = "image/jpeg";

        when(mockUploader.upload(eq(content), anyMap())).thenReturn(Map.of());

        storageService.put(key, content, contentType);

        verify(mockUploader).upload(eq(content), argThat(map ->
                key.equals(map.get("public_id")) &&
                Boolean.TRUE.equals(map.get("overwrite")) &&
                "image".equals(map.get("resource_type"))
        ));
    }

    @Test
    void testPutFailure() throws IOException {
        byte[] content = "test-image".getBytes();
        String key = "persons/123/abc";

        when(mockUploader.upload(eq(content), anyMap())).thenThrow(new IOException("Connection failed"));

        assertThrows(RuntimeException.class, () -> storageService.put(key, content, "image/jpeg"));
    }

    @Test
    void testDeleteSuccess() throws IOException {
        String key = "persons/123/abc";

        when(mockUploader.destroy(eq(key), anyMap())).thenReturn(Map.of());

        storageService.delete(key);

        verify(mockUploader).destroy(eq(key), anyMap());
    }

    @Test
    void testDeleteFailure() throws IOException {
        String key = "persons/123/abc";

        when(mockUploader.destroy(eq(key), anyMap())).thenThrow(new IOException("API Error"));

        assertThrows(RuntimeException.class, () -> storageService.delete(key));
    }

    @Test
    void testConstructorMissingConfig() {
        assertThrows(IllegalArgumentException.class, () ->
                new CloudinaryStorageService("", "", "", "")
        );
    }

    @Test
    void testConstructorWithUrl() {
        CloudinaryStorageService service = new CloudinaryStorageService(
                "cloudinary://12345:secret@testcloud",
                "",
                "",
                ""
        );
        assertNotNull(ReflectionTestUtils.getField(service, "cloudinary"));
    }
}
