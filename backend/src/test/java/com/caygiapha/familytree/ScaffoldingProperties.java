package com.caygiapha.familytree;

import static org.assertj.core.api.Assertions.assertThat;

import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;

/**
 * Smoke property test confirming the jqwik engine is wired into the build. Domain property
 * tests for design Properties 1-25 are added alongside their implementations in later tasks.
 */
class ScaffoldingProperties {

    @Property(tries = 100)
    void additionIsCommutative(@ForAll @IntRange(min = -1000, max = 1000) int a,
                               @ForAll @IntRange(min = -1000, max = 1000) int b) {
        assertThat(a + b).isEqualTo(b + a);
    }
}
