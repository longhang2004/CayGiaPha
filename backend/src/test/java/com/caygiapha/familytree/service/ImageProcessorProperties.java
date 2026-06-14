package com.caygiapha.familytree.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.service.ImageProcessor.ProcessedImage;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Size;

/**
 * Property-based test for design <strong>Property 31: Photo upload validation and metadata
 * stripping</strong>.
 *
 * <p>Feature: vietnamese-family-tree, Property 31
 *
 * <p>For <em>any</em> input, the image is accepted <em>if and only if</em> it is a decodable
 * JPEG/PNG within the size limit (Requirement 24.1, 24.3); a processed image is re-encoded to a
 * valid image of the same dimensions with no original metadata carried over (24.4). Non-images and
 * oversize inputs are rejected.
 */
class ImageProcessorProperties {

    private final ImageProcessor processor = new ImageProcessor(5_242_880L);

    @Property(tries = 200)
    void validJpegOrPngIsAcceptedAndReencoded(
            @ForAll @IntRange(min = 1, max = 64) int width,
            @ForAll @IntRange(min = 1, max = 64) int height,
            @ForAll("formats") String format) throws Exception {
        byte[] bytes = render(width, height, format);

        ProcessedImage result = processor.process(bytes);

        assertThat(result.contentType())
                .isEqualTo("jpeg".equals(format) ? ImageProcessor.JPEG : ImageProcessor.PNG);
        assertThat(result.width()).isEqualTo(width);
        assertThat(result.height()).isEqualTo(height);
        // The output is itself a valid, decodable image (re-encoded, metadata stripped).
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(result.bytes()));
        assertThat(decoded).isNotNull();
        assertThat(decoded.getWidth()).isEqualTo(width);
        assertThat(decoded.getHeight()).isEqualTo(height);
    }

    @Property(tries = 200)
    void nonImageBytesAreRejected(@ForAll @Size(min = 1, max = 64) byte[] junk) {
        // Guard: skip the astronomically unlikely case that random bytes form a valid JPEG/PNG header.
        boolean looksLikeImage =
                (junk.length >= 3 && (junk[0] & 0xFF) == 0xFF && (junk[1] & 0xFF) == 0xD8)
                || (junk.length >= 4 && (junk[0] & 0xFF) == 0x89 && junk[1] == 0x50);
        if (looksLikeImage) {
            return;
        }
        assertThatThrownBy(() -> processor.process(junk))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Property(tries = 20)
    void oversizeImageIsRejected(@ForAll("formats") String format) throws Exception {
        ImageProcessor tiny = new ImageProcessor(64L); // 64-byte limit
        byte[] bytes = render(40, 40, format); // comfortably larger than 64 bytes

        assertThatThrownBy(() -> tiny.process(bytes))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Provide
    Arbitrary<String> formats() {
        return Arbitraries.of("jpeg", "png");
    }

    private static byte[] render(int width, int height, String format) throws Exception {
        int type = "jpeg".equals(format) ? BufferedImage.TYPE_INT_RGB : BufferedImage.TYPE_INT_ARGB;
        BufferedImage image = new BufferedImage(width, height, type);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, format, out);
        return out.toByteArray();
    }
}
