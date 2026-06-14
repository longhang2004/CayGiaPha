package com.caygiapha.familytree.service;

import com.caygiapha.familytree.error.ApiException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Validates and sanitizes uploaded images (Requirement 24.1, 24.3, 24.4).
 *
 * <p>Accepts JPEG and PNG only (detected by magic bytes, not the client-declared type), enforces a
 * maximum size, and <strong>re-encodes</strong> the decoded pixels back to the same format. The
 * re-encode drops all ancillary metadata — including EXIF and any embedded GPS/geolocation tags —
 * because {@link ImageIO#write} emits only the image data, not the original metadata chunks (24.4).
 * It also neutralizes polyglot/malicious files, since only successfully decoded pixel data is
 * re-emitted.
 *
 * <p>WebP is intentionally unsupported here: stock {@code ImageIO} cannot decode or re-encode WebP,
 * so a metadata-stripping re-encode is not possible without an additional codec. WebP uploads are
 * rejected; adding support is a follow-up that introduces a WebP {@code ImageIO} plugin.
 */
@Component
public class ImageProcessor {

    public static final String JPEG = "image/jpeg";
    public static final String PNG = "image/png";

    /** A processed (validated, metadata-stripped) image ready to store. */
    public record ProcessedImage(String contentType, byte[] bytes, int width, int height) {}

    private final long maxBytes;

    public ImageProcessor(@Value("${app.photos.max-bytes:5242880}") long maxBytes) {
        this.maxBytes = maxBytes; // default 5 MiB
    }

    /**
     * Validate {@code input} and return a re-encoded, metadata-free copy.
     *
     * @throws ApiException {@code VALIDATION_ERROR} when the bytes are empty, exceed the size limit,
     *     or are not a decodable JPEG/PNG.
     */
    public ProcessedImage process(byte[] input) {
        if (input == null || input.length == 0) {
            throw ApiException.validation("file", "The uploaded file is empty.");
        }
        if (input.length > maxBytes) {
            throw ApiException.validation(
                    "file", "The image exceeds the maximum size of " + maxBytes + " bytes.");
        }

        String detected = detectType(input);
        if (detected == null) {
            throw ApiException.validation(
                    "file", "Unsupported image type; only JPEG and PNG are accepted.");
        }

        BufferedImage image = decode(input);
        if (image == null) {
            throw ApiException.validation("file", "The file is not a valid image.");
        }

        String formatName = JPEG.equals(detected) ? "jpeg" : "png";
        byte[] sanitized = reencode(image, formatName);
        return new ProcessedImage(detected, sanitized, image.getWidth(), image.getHeight());
    }

    /** Detect the image type by magic bytes (independent of the client-declared content type). */
    private String detectType(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return JPEG;
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return PNG;
        }
        return null;
    }

    private BufferedImage decode(byte[] input) {
        try {
            return ImageIO.read(new ByteArrayInputStream(input));
        } catch (IOException e) {
            return null;
        }
    }

    private byte[] reencode(BufferedImage image, String formatName) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            // JPEG has no alpha channel; drop any alpha so encoding succeeds and is metadata-free.
            BufferedImage toWrite = image;
            if ("jpeg".equals(formatName) && image.getColorModel().hasAlpha()) {
                BufferedImage rgb = new BufferedImage(
                        image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
                rgb.getGraphics().drawImage(image, 0, 0, null);
                toWrite = rgb;
            }
            if (!ImageIO.write(toWrite, formatName, out)) {
                throw ApiException.validation("file", "The image could not be processed.");
            }
            return out.toByteArray();
        } catch (IOException e) {
            throw ApiException.validation("file", "The image could not be processed.");
        }
    }
}
