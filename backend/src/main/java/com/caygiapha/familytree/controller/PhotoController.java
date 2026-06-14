package com.caygiapha.familytree.controller;

import com.caygiapha.familytree.dto.PhotoResponse;
import com.caygiapha.familytree.entity.PersonPhoto;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.service.PhotoService;
import com.caygiapha.familytree.service.PhotoService.ServedImage;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Person photo endpoints (Requirement 24):
 *
 * <ul>
 *   <li>{@code POST   /api/v1/persons/{id}/photos}              upload an image (multipart). (24.1)</li>
 *   <li>{@code GET    /api/v1/persons/{id}/photos}              list a node's photos (metadata).</li>
 *   <li>{@code GET    /api/v1/persons/{id}/photos/{photoId}}    stream an image, access-gated. (24.5)</li>
 *   <li>{@code PATCH  /api/v1/persons/{id}/photos/{photoId}/primary} set the primary photo. (24.2)</li>
 *   <li>{@code DELETE /api/v1/persons/{id}/photos/{photoId}}    delete an image. (24.8)</li>
 * </ul>
 *
 * <p>Authorization, validation, metadata-stripping, and visibility gating live in
 * {@link PhotoService}.
 */
@RestController
@RequestMapping("/api/v1/persons/{personId}/photos")
public class PhotoController {

    private final PhotoService photoService;

    public PhotoController(PhotoService photoService) {
        this.photoService = photoService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PhotoResponse upload(
            @PathVariable("personId") UUID personId,
            @RequestParam("treeId") UUID treeId,
            @RequestParam("file") MultipartFile file) {
        return PhotoResponse.from(photoService.upload(treeId, personId, bytesOf(file)));
    }

    @GetMapping
    public List<PhotoResponse> list(
            @PathVariable("personId") UUID personId,
            @RequestParam("treeId") UUID treeId,
            @RequestHeader(value = "X-Share-Token", required = false) String shareToken) {
        return photoService.list(treeId, personId, shareToken).stream()
                .map(PhotoResponse::from).toList();
    }

    @GetMapping("/{photoId}")
    public ResponseEntity<byte[]> serve(
            @PathVariable("personId") UUID personId,
            @PathVariable("photoId") UUID photoId,
            @RequestParam("treeId") UUID treeId,
            @RequestHeader(value = "X-Share-Token", required = false) String shareToken) {
        ServedImage image = photoService.serve(treeId, personId, photoId, shareToken);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.noCache().cachePrivate())
                .body(image.bytes());
    }

    @PatchMapping("/{photoId}/primary")
    public PhotoResponse setPrimary(
            @PathVariable("personId") UUID personId,
            @PathVariable("photoId") UUID photoId,
            @RequestParam("treeId") UUID treeId) {
        PersonPhoto photo = photoService.setPrimary(treeId, personId, photoId);
        return PhotoResponse.from(photo);
    }

    @DeleteMapping("/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable("personId") UUID personId,
            @PathVariable("photoId") UUID photoId,
            @RequestParam("treeId") UUID treeId) {
        photoService.delete(treeId, personId, photoId);
    }

    private static byte[] bytesOf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.validation("file", "An image file is required.");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw ApiException.validation("file", "The uploaded file could not be read.");
        }
    }
}
