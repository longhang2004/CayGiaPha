package com.caygiapha.familytree;

import static org.assertj.core.api.Assertions.assertThat;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RegionKinshipTermRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.UserRepository;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration test that runs the full Spring context, Flyway migrations, and JPA schema validation
 * against a <strong>real PostgreSQL running in Docker</strong> (the {@code docker compose} database
 * in {@code backend/docker-compose.yml}), connecting over JDBC.
 *
 * <p>This complements {@link FamilyTreeApiApplicationTests} (which uses Testcontainers to manage its
 * own container). On environments where Testcontainers' in-JVM Docker client is incompatible with
 * the local Docker daemon, this test still exercises the real-database path because JDBC over TCP
 * works regardless. The datasource defaults to the Compose database and is overridable via the
 * standard {@code SPRING_DATASOURCE_*} environment variables.
 *
 * <p>Tagged {@code dockerdb} and gated by {@link #dockerDbReachable()} so it is <em>skipped</em>
 * (never failed) when the database is not running — keeping CI without Docker green. Run it with the
 * Compose database up:
 *
 * <pre>{@code
 *   cd backend && docker compose up -d
 *   mvn -Dtest=ComposeDbIntegrationTest test
 * }</pre>
 */
@SpringBootTest
@ActiveProfiles("test")
@Tag("dockerdb")
@Transactional
@EnabledIf("com.caygiapha.familytree.ComposeDbIntegrationTest#dockerDbReachable")
class ComposeDbIntegrationTest {

    private static final String DEFAULT_URL = "jdbc:postgresql://localhost:5432/familytree";
    private static final String DEFAULT_USER = "familytree";
    private static final String DEFAULT_PASSWORD = "familytree";

    private static String url() {
        String env = System.getenv("SPRING_DATASOURCE_URL");
        return env != null && !env.isBlank() ? env : DEFAULT_URL;
    }

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", ComposeDbIntegrationTest::url);
        registry.add("spring.datasource.username", () -> envOr("SPRING_DATASOURCE_USERNAME", DEFAULT_USER));
        registry.add("spring.datasource.password", () -> envOr("SPRING_DATASOURCE_PASSWORD", DEFAULT_PASSWORD));
    }

    private static String envOr(String key, String fallback) {
        String v = System.getenv(key);
        return v != null && !v.isBlank() ? v : fallback;
    }

    /**
     * Whether the Docker Postgres is reachable on its JDBC host/port; when not, the whole test is
     * skipped rather than failed (so a no-Docker build stays green).
     */
    static boolean dockerDbReachable() {
        try {
            // jdbc:postgresql://host:port/db -> strip the jdbc: prefix so URI can parse host/port.
            URI uri = URI.create(url().substring("jdbc:".length()));
            String host = uri.getHost() != null ? uri.getHost() : "localhost";
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress(host, port), 1000);
                return true;
            }
        } catch (Exception e) {
            return false;
        }
    }

    @Autowired private UserRepository userRepository;
    @Autowired private TreeRepository treeRepository;
    @Autowired private PersonRepository personRepository;
    @Autowired private RegionKinshipTermRepository regionKinshipTermRepository;
    @Autowired private com.caygiapha.familytree.repository.RelationshipRepository relationshipRepository;
    @Autowired private com.caygiapha.familytree.repository.ClaimRepository claimRepository;
    @Autowired private com.caygiapha.familytree.repository.SessionRepository sessionRepository;
    @Autowired private com.caygiapha.familytree.repository.UserConsentRepository userConsentRepository;
    @Autowired private com.caygiapha.familytree.repository.PersonPhotoRepository personPhotoRepository;
    @Autowired private com.caygiapha.familytree.service.DataRightsService dataRightsService;
    @Autowired private com.caygiapha.familytree.security.AuthContextHolder authContextHolder;

    /**
     * The Flyway-seeded {@code region_kinship_terms} satisfy the regional-coverage invariant against
     * the real database: every region defines the same key set (66 keys x 3 regions = 198 rows
     * after the V4 extended-kinship seed).
     */
    @Test
    void seededRegionTermsHaveFullCoverageAgainstRealDb() {
        assertThat(regionKinshipTermRepository.count()).isEqualTo(198);
        assertThat(regionKinshipTermRepository.findByRegion("Bac")).hasSize(66);
        assertThat(regionKinshipTermRepository.findByRegion("Trung")).hasSize(66);
        assertThat(regionKinshipTermRepository.findByRegion("Nam")).hasSize(66);
    }

    /**
     * V4 extended-kinship seed against the real database: cousins (anh/chị/em họ),
     * great-grandparents (cụ ông/bà in Bắc, ông/bà cố in Trung/Nam), and great-grandchildren
     * (chắt). (Requirement 9.1, 9.3)
     */
    @Test
    void extendedKinshipTermsAreSeededAgainstRealDb() {
        // Cousins (u2:d2): rank follows the parent's seniority, pan-regional terms.
        assertThat(term("Bac", "u2:d2:PATERNAL:MALE:ELDER:s0")).isEqualTo("anh họ");
        assertThat(term("Nam", "u2:d2:MATERNAL:FEMALE:ELDER:s0")).isEqualTo("chị họ");
        assertThat(term("Trung", "u2:d2:PATERNAL:MALE:YOUNGER:s0")).isEqualTo("em họ");
        assertThat(term("Trung", "u2:d2:MATERNAL:FEMALE:YOUNGER:s0")).isEqualTo("em họ");

        // Great-grandparents (u3:d0): dialect split cụ (Bắc) vs cố (Trung/Nam).
        assertThat(term("Bac", "u3:d0:PATERNAL:MALE:SELF:s0")).isEqualTo("cụ ông");
        assertThat(term("Bac", "u3:d0:MATERNAL:FEMALE:SELF:s0")).isEqualTo("cụ bà");
        assertThat(term("Nam", "u3:d0:PATERNAL:MALE:SELF:s0")).isEqualTo("ông cố");
        assertThat(term("Trung", "u3:d0:MATERNAL:FEMALE:SELF:s0")).isEqualTo("bà cố");

        // Great-grandchildren (u0:d3): pan-regional "chắt".
        assertThat(term("Bac", "u0:d3:SELF:MALE:SELF:s0")).isEqualTo("chắt");
        assertThat(term("Nam", "u0:d3:SELF:FEMALE:SELF:s0")).isEqualTo("chắt");
    }

    /**
     * V3 migration correctness against the real database: in Central (Trung) and Southern (Nam)
     * usage the father's elder sister is "cô" (not "bác") and her husband is "dượng" (not "bác"),
     * while Northern (Bac) retains "bác". (Requirement 9.1, 9.3)
     */
    @Test
    void centralAndSouthernPaternalAuntTermsAreCorrectedAgainstRealDb() {
        // Father's elder sister (blood): u2:d1:PATERNAL:FEMALE:ELDER:s0
        assertThat(term("Bac", "u2:d1:PATERNAL:FEMALE:ELDER:s0")).isEqualTo("bác");
        assertThat(term("Trung", "u2:d1:PATERNAL:FEMALE:ELDER:s0")).isEqualTo("cô");
        assertThat(term("Nam", "u2:d1:PATERNAL:FEMALE:ELDER:s0")).isEqualTo("cô");

        // Husband of father's elder sister (in-law): u2:d1:PATERNAL:MALE:ELDER:s1
        assertThat(term("Bac", "u2:d1:PATERNAL:MALE:ELDER:s1")).isEqualTo("bác");
        assertThat(term("Trung", "u2:d1:PATERNAL:MALE:ELDER:s1")).isEqualTo("dượng");
        assertThat(term("Nam", "u2:d1:PATERNAL:MALE:ELDER:s1")).isEqualTo("dượng");
    }

    private String term(String region, String canonicalRelation) {
        return regionKinshipTermRepository
                .findByRegionAndCanonicalRelation(region, canonicalRelation)
                .orElseThrow(() -> new AssertionError(
                        "missing term for " + region + " / " + canonicalRelation))
                .getTerm();
    }

    /**
     * A real persistence round-trip through the actual schema: persist a user, their single tree,
     * and a person, then read the person back scoped to the tree. Runs in a transaction that is
     * rolled back, so it leaves the database unchanged.
     */
    @Test
    void persistenceRoundTripAgainstRealSchema() {
        User user = userRepository.save(User.withEmail("itest+" + UUID.randomUUID() + "@example.com"));
        Tree tree = treeRepository.save(new Tree(user.getId()));
        Person saved = personRepository.save(new Person(tree.getId(), "Nguyễn Văn Test", "male"));

        Optional<Person> read = personRepository.findByIdAndTreeId(saved.getId(), tree.getId());

        assertThat(read).isPresent();
        assertThat(read.get().getDisplayName()).isEqualTo("Nguyễn Văn Test");
        assertThat(read.get().getGender()).isEqualTo("male");
        assertThat(tree.getRegion()).isEqualTo("Bac"); // default region on creation (9.2)
    }

    /**
     * Account deletion cascades the owned tree and the user's data against the real schema and its
     * foreign keys (Requirement 22.4): persons, edges, claims, share tokens, photos, sessions, and
     * consents are all removed, and the user row is gone. Verifies FK ordering and the
     * {@code ON DELETE CASCADE} on {@code person_photos} hold against PostgreSQL.
     */
    @Test
    void deleteAccountCascadesEverythingAgainstRealSchema() {
        User user = userRepository.save(User.withEmail("rights+" + UUID.randomUUID() + "@example.com"));
        Tree tree = treeRepository.save(new Tree(user.getId()));
        Person parent = personRepository.save(new Person(tree.getId(), "Cha", "male"));
        Person child = personRepository.save(new Person(tree.getId(), "Con", "female"));
        relationshipRepository.save(new com.caygiapha.familytree.entity.Relationship(
                tree.getId(), "bloodline_father", parent.getId(), child.getId()));
        claimRepository.save(new com.caygiapha.familytree.entity.Claim(child.getId(), user.getId()));
        sessionRepository.save(new com.caygiapha.familytree.entity.Session(
                user.getId(), java.time.Instant.now().plusSeconds(3600),
                "a".repeat(64)));
        userConsentRepository.save(
                new com.caygiapha.familytree.entity.UserConsent(user.getId(), "tos", 1));
        personPhotoRepository.save(new com.caygiapha.familytree.entity.PersonPhoto(
                child.getId(), "persons/" + child.getId() + "/" + UUID.randomUUID(),
                "image/jpeg", 10L, 1, 1));

        authContextHolder.set(
                com.caygiapha.familytree.security.AuthContext.authenticated(user.getId(), tree.getId()));
        try {
            dataRightsService.deleteAccount(); // 22.4
        } finally {
            authContextHolder.clear();
        }

        assertThat(userRepository.findById(user.getId())).isEmpty();
        assertThat(treeRepository.findByOwnerUserId(user.getId())).isEmpty();
        assertThat(personRepository.findByTreeId(tree.getId())).isEmpty();
        assertThat(relationshipRepository.findByTreeId(tree.getId())).isEmpty();
        assertThat(claimRepository.findByPersonId(child.getId())).isEmpty();
        assertThat(sessionRepository.findByUserId(user.getId())).isEmpty();
        assertThat(personPhotoRepository.findByPersonId(child.getId())).isEmpty(); // FK cascade
    }
}
