package com.caygiapha.familytree.service;

import com.caygiapha.familytree.dto.CreatePersonRequest;
import com.caygiapha.familytree.dto.EditPersonRequest;
import com.caygiapha.familytree.dto.PersonVisibility;
import com.caygiapha.familytree.dto.VisibilityUpdateRequest;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.PersonRepository;
import java.time.Year;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Graph_Store operations for {@link Person} nodes: create, partial edit, and read, with full
 * field-bounds validation (Requirements 3.1, 3.2, 3.3, 3.5, 3.6, 3.7).
 *
 * <p>Validation is centralized here so create and edit share one path and every rejection is a
 * {@code VALIDATION_ERROR} naming the offending field (3.6). Edits are partial: only supplied
 * fields change and unspecified fields are left untouched (3.3). Operations that target a person
 * absent from the given tree are rejected as {@code NODE_NOT_ACCESSIBLE} (3.7).
 *
 * <p>Tree ownership/authorization is enforced by a later task (7.x); here the caller supplies the
 * tree context explicitly via {@code treeId}.
 */
@Service
public class PersonService {

    /** Allowed gender domain (criterion 3.2). */
    private static final Set<String> GENDERS = Set.of("male", "female");

    private static final int NAME_MIN = 1;
    private static final int NAME_MAX = 100;
    private static final int BIRTH_ORDER_MIN = 1;
    private static final int BIRTH_ORDER_MAX = 99;
    private static final int BIRTH_YEAR_MIN = 1000;

    private final PersonRepository personRepository;

    public PersonService(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    /**
     * Create a person within the given tree after validating every field bound, returning the new
     * node id (Requirements 3.1, 3.2, 3.5, 3.6).
     *
     * @return the identifier of the created person node
     * @throws ApiException {@code VALIDATION_ERROR} naming the first invalid field
     */
    @Mutation
    public UUID create(CreatePersonRequest request) {
        if (request.treeId() == null) {
            throw ApiException.validation("treeId", "Tree id is required.");
        }
        // Required fields must be present for creation (3.1, 3.6).
        validateDisplayName(request.displayName());
        validateGender(request.gender());
        validateBirthOrder(request.birthOrder()); // optional; validated only when present
        validateBirthYear(request.birthYear()); // optional; validated only when present
        validateDeathDate(request.deathDay(), request.deathMonth(), request.deathYear(), request.deathCalendar(), request.deathLunarLeap());

        Person person = new Person(request.treeId(), request.displayName(), request.gender());
        person.setBirthOrder(request.birthOrder());
        person.setBirthYear(request.birthYear());

        boolean isDeceased = Boolean.TRUE.equals(request.deathStatus())
                || request.deathDay() != null
                || request.deathMonth() != null;
        person.setDeathStatus(isDeceased);

        if (isDeceased) {
            person.setDeathDay(request.deathDay());
            person.setDeathMonth(request.deathMonth());
            person.setDeathYear(request.deathYear());
            person.setDeathCalendar(request.deathCalendar() != null ? request.deathCalendar() : "lunar");
            person.setDeathLunarLeap(Boolean.TRUE.equals(request.deathLunarLeap()));
        }

        return personRepository.save(person).getId();
    }

    /**
     * Partially edit a person in the given tree: validate and apply only the supplied fields,
     * leaving unspecified fields unchanged (Requirements 3.3, 3.6, 3.7). A nonexistent target is
     * rejected and nothing is changed.
     *
     * @return the updated person
     * @throws ApiException {@code NODE_NOT_ACCESSIBLE} when the target is not in the tree, or
     *                      {@code VALIDATION_ERROR} naming the first invalid supplied field
     */
    @Mutation
    public Person edit(UUID treeId, UUID personId, EditPersonRequest request) {
        Person person = requirePerson(treeId, personId);

        // Validate all supplied fields first so a rejection leaves the node entirely unchanged.
        if (request.displayName() != null) {
            validateDisplayName(request.displayName());
        }
        if (request.gender() != null) {
            validateGender(request.gender());
        }
        if (request.birthOrder() != null) {
            validateBirthOrder(request.birthOrder());
        }
        if (request.birthYear() != null) {
            validateBirthYear(request.birthYear());
        }

        Integer finalDay = request.deathDay() != null ? request.deathDay() : person.getDeathDay();
        Integer finalMonth = request.deathMonth() != null ? request.deathMonth() : person.getDeathMonth();
        Integer finalYear = request.deathYear() != null ? request.deathYear() : person.getDeathYear();
        String finalCalendar = request.deathCalendar() != null ? request.deathCalendar() : person.getDeathCalendar();
        Boolean finalLeap = request.deathLunarLeap() != null ? request.deathLunarLeap() : person.getDeathLunarLeap();

        boolean willBeDeceased = Boolean.TRUE.equals(request.deathStatus())
                || (request.deathStatus() == null && person.isDeathStatus())
                || request.deathDay() != null
                || request.deathMonth() != null;

        if (willBeDeceased) {
            validateDeathDate(finalDay, finalMonth, finalYear, finalCalendar, finalLeap);
        }

        // Apply only the specified fields (3.3).
        if (request.displayName() != null) {
            person.setDisplayName(request.displayName());
        }
        if (request.gender() != null) {
            person.setGender(request.gender());
        }
        if (request.birthOrder() != null) {
            person.setBirthOrder(request.birthOrder());
        }
        if (request.birthYear() != null) {
            person.setBirthYear(request.birthYear());
        }

        if (Boolean.FALSE.equals(request.deathStatus())) {
            person.setDeathStatus(false);
            person.setDeathDay(null);
            person.setDeathMonth(null);
            person.setDeathYear(null);
            person.setDeathCalendar("lunar");
            person.setDeathLunarLeap(false);
        } else if (willBeDeceased) {
            person.setDeathStatus(true);
            if (request.deathDay() != null) person.setDeathDay(request.deathDay());
            if (request.deathMonth() != null) person.setDeathMonth(request.deathMonth());
            if (request.deathYear() != null) person.setDeathYear(request.deathYear());
            if (request.deathCalendar() != null) person.setDeathCalendar(request.deathCalendar());
            if (request.deathLunarLeap() != null) person.setDeathLunarLeap(request.deathLunarLeap());
        }

        return personRepository.save(person);
    }

    /**
     * Set the per-field visibility of a person's sensitive fields, partially updating only the
     * supplied settings and leaving unspecified ones unchanged (Requirements 14.1, 14.2). Each
     * supplied value must be exactly {@code "private"} or {@code "public"} (14.1); any other value
     * rejects the whole request as {@code VALIDATION_ERROR} naming the offending field and leaves
     * the node unchanged. A nonexistent target is rejected as {@code NODE_NOT_ACCESSIBLE} (3.7).
     *
     * <p>Owner-only authorization is enforced by the controller before this is invoked (Requirement
     * 14 is a tree-owner control).
     *
     * @return the updated person
     */
    @Mutation
    public Person setVisibility(UUID treeId, UUID personId, VisibilityUpdateRequest request) {
        Person person = requirePerson(treeId, personId);

        // Validate every supplied setting first so a rejection leaves the node entirely unchanged.
        validateVisibility("visMarital", request.visMarital());
        validateVisibility("visAdoption", request.visAdoption());
        validateVisibility("visDeath", request.visDeath());
        validateVisibility("visName", request.visName());
        validateVisibility("visBirthYear", request.visBirthYear());
        validateVisibility("visPhoto", request.visPhoto());

        // Apply only the specified settings (partial update).
        if (request.visMarital() != null) {
            person.setVisMarital(request.visMarital());
        }
        if (request.visAdoption() != null) {
            person.setVisAdoption(request.visAdoption());
        }
        if (request.visDeath() != null) {
            person.setVisDeath(request.visDeath());
        }
        if (request.visName() != null) {
            person.setVisName(request.visName());
        }
        if (request.visBirthYear() != null) {
            person.setVisBirthYear(request.visBirthYear());
        }
        if (request.visPhoto() != null) {
            person.setVisPhoto(request.visPhoto());
        }

        return personRepository.save(person);
    }

    /**
     * Read a person scoped to the given tree (Requirement 3.7 for the not-accessible case). Privacy
     * filtering of sensitive fields (14.3-14.5) is applied at the response-projection layer using
     * the viewer's authorization role.
     *
     * @throws ApiException {@code NODE_NOT_ACCESSIBLE} when the target is not in the tree
     */
    @Transactional(readOnly = true)
    public Person read(UUID treeId, UUID personId) {
        return requirePerson(treeId, personId);
    }

    private Person requirePerson(UUID treeId, UUID personId) {
        if (treeId == null || personId == null) {
            throw ApiException.nodeNotAccessible("The target node is not accessible.");
        }
        return personRepository
                .findByIdAndTreeId(personId, treeId)
                .orElseThrow(() ->
                        ApiException.nodeNotAccessible("The target node is not accessible."));
    }

    // ----- Field-bounds validation (criterion 3.2); each names the offending field (3.6) -----

    private void validateDisplayName(String displayName) {
        if (displayName == null || displayName.length() < NAME_MIN || displayName.length() > NAME_MAX) {
            throw ApiException.validation(
                    "displayName", "Display name must be 1 to 100 characters.");
        }
    }

    private void validateGender(String gender) {
        if (gender == null || !GENDERS.contains(gender)) {
            throw ApiException.validation("gender", "Gender must be one of {male, female}.");
        }
    }

    private void validateBirthOrder(Integer birthOrder) {
        if (birthOrder != null && (birthOrder < BIRTH_ORDER_MIN || birthOrder > BIRTH_ORDER_MAX)) {
            throw ApiException.validation("birthOrder", "Birth order must be between 1 and 99.");
        }
    }

    private void validateBirthYear(Integer birthYear) {
        if (birthYear != null) {
            int currentYear = Year.now().getValue();
            if (birthYear < BIRTH_YEAR_MIN || birthYear > currentYear) {
                throw ApiException.validation(
                        "birthYear", "Birth year must be between 1000 and the current year.");
            }
        }
    }

    private void validateVisibility(String field, String value) {
        // Optional in a partial update: only a supplied value is constrained to {private, public}.
        if (value != null && !PersonVisibility.isValid(value)) {
            throw ApiException.validation(
                    field, "Visibility must be one of {private, public}.");
        }
    }

    private void validateDeathDate(Integer day, Integer month, Integer year, String calendar, Boolean leap) {
        if (day == null && month == null && year == null && calendar == null && leap == null) {
            return;
        }
        if (day != null || month != null) {
            if (day == null) {
                throw ApiException.validation("deathDay", "Ngày mất là bắt buộc khi có tháng mất.");
            }
            if (month == null) {
                throw ApiException.validation("deathMonth", "Tháng mất là bắt buộc khi có ngày mất.");
            }
            if (day < 1 || day > 31) {
                throw ApiException.validation("deathDay", "Ngày mất phải từ 1 đến 31.");
            }
            if (month < 1 || month > 12) {
                throw ApiException.validation("deathMonth", "Tháng mất phải từ 1 đến 12.");
            }
        }
        if (year != null) {
            int currentYear = Year.now().getValue();
            if (year < 1000 || year > currentYear) {
                throw ApiException.validation("deathYear", "Năm mất phải từ 1000 đến " + currentYear + ".");
            }
        }
        if (calendar != null) {
            if (!"solar".equals(calendar) && !"lunar".equals(calendar)) {
                throw ApiException.validation("deathCalendar", "Lịch phải là 'solar' hoặc 'lunar'.");
            }
        }
    }
}
