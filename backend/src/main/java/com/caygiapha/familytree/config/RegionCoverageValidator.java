package com.caygiapha.familytree.config;

import com.caygiapha.familytree.service.RegionCoverageService;
import com.caygiapha.familytree.service.RegionCoverageService.CoverageResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Fails fast at startup when the seeded {@code region_kinship_terms} configuration violates the
 * regional-coverage property (Requirement 9.7): every canonical relation defined for any region
 * must be defined for all three (Bắc/Trung/Nam). Running this as an {@link ApplicationRunner} means
 * a mis-seeded migration is caught the moment the application boots rather than as a subtle
 * undefined-for-region result at request time.
 *
 * <p>The coverage logic itself lives in {@link RegionCoverageService} so it is reusable by the
 * regional-coverage property test (Property 16). An empty table trivially satisfies coverage (all
 * regions have the empty key set), so this runner only objects to a genuinely lop-sided seed.
 */
@Component
public class RegionCoverageValidator implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RegionCoverageValidator.class);

    private final RegionCoverageService regionCoverageService;

    public RegionCoverageValidator(RegionCoverageService regionCoverageService) {
        this.regionCoverageService = regionCoverageService;
    }

    @Override
    public void run(ApplicationArguments args) {
        CoverageResult result = regionCoverageService.checkCoverage();
        if (!result.complete()) {
            // Surfacing the gaps and aborting startup (9.7).
            throw new IllegalStateException(
                    "Startup aborted — " + result.describeGaps());
        }
        log.info("Region kinship-term coverage check passed: {}", result.describeGaps());
    }
}
