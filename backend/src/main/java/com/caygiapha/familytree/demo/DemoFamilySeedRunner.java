package com.caygiapha.familytree.demo;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.Relationship;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.entity.User;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.RelationshipRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.repository.UserRepository;
import org.mindrot.jbcrypt.BCrypt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds a four-generation Northern Vietnamese family for local Docker reviews.
 * Gated by {@code app.demo.seed=true} so production Next.js databases stay untouched.
 */
@Component
@EnableConfigurationProperties(DemoProperties.class)
@ConditionalOnProperty(name = "app.demo.seed", havingValue = "true")
public class DemoFamilySeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoFamilySeedRunner.class);

    private final UserRepository userRepository;
    private final TreeRepository treeRepository;
    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final DemoProperties properties;

    public DemoFamilySeedRunner(
            UserRepository userRepository,
            TreeRepository treeRepository,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            DemoProperties properties) {
        this.userRepository = userRepository;
        this.treeRepository = treeRepository;
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String email = properties.email().trim().toLowerCase();
        if (userRepository.findByEmail(email).isPresent()) {
            log.info("Demo family already present for local review");
            return;
        }

        User owner = User.withEmail(email);
        owner.setVerified(true);
        owner.setDisplayName("Nguyễn Thị Lan");
        owner.setPasswordHash(BCrypt.hashpw(properties.password(), BCrypt.gensalt()));
        owner = userRepository.save(owner);

        Tree tree = new Tree(owner.getId(), "Bac", "Họ Nguyễn - Chi Hà Nội");
        tree.setLivingRedaction(true);
        tree = treeRepository.save(tree);

        Person ongNoi = person(tree, "Nguyễn Văn Thành", "male", 1, 1938, true);
        Person baNoi = person(tree, "Trần Thị Hoa", "female", 2, 1941, true);
        Person cha = person(tree, "Nguyễn Văn Minh", "male", 1, 1968, false);
        Person me = person(tree, "Phạm Thị Mai", "female", 2, 1970, false);
        Person chu = person(tree, "Nguyễn Văn Hùng", "male", 2, 1972, false);
        Person ego = person(tree, "Nguyễn Thị Lan", "female", 1, 1996, false);
        Person emTrai = person(tree, "Nguyễn Văn Đức", "male", 2, 1999, false);
        Person chau = person(tree, "Nguyễn Hà An", "female", 1, 2022, false);

        marriage(tree, ongNoi, baNoi);
        blood(tree, "bloodline_father", ongNoi, cha);
        blood(tree, "bloodline_mother", baNoi, cha);
        blood(tree, "bloodline_father", ongNoi, chu);
        blood(tree, "bloodline_mother", baNoi, chu);
        marriage(tree, cha, me);
        blood(tree, "bloodline_father", cha, ego);
        blood(tree, "bloodline_mother", me, ego);
        blood(tree, "bloodline_father", cha, emTrai);
        blood(tree, "bloodline_mother", me, emTrai);
        blood(tree, "bloodline_father", emTrai, chau);

        log.info("Seeded demo Northern Vietnamese family treeId={} (email omitted from logs)", tree.getId());
    }

    private Person person(Tree tree, String name, String gender, int birthOrder, int birthYear, boolean deceased) {
        Person person = new Person(tree.getId(), name, gender);
        person.setBirthOrder(birthOrder);
        person.setBirthYear(birthYear);
        person.setDeathStatus(deceased);
        person.setVisName("public");
        person.setVisBirthYear(deceased ? "public" : "private");
        return personRepository.save(person);
    }

    private void marriage(Tree tree, Person left, Person right) {
        Relationship edge = new Relationship(tree.getId(), "marriage", left.getId(), right.getId());
        edge.setMaritalStatus("married");
        relationshipRepository.save(edge);
    }

    private void blood(Tree tree, String type, Person parent, Person child) {
        relationshipRepository.save(new Relationship(tree.getId(), type, parent.getId(), child.getId()));
    }
}
