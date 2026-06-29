package com.caygiapha.familytree.service;

import com.caygiapha.familytree.dto.PersonVisibility;
import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.entity.PersonPhoto;
import com.caygiapha.familytree.entity.Tree;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.repository.PersonPhotoRepository;
import com.caygiapha.familytree.repository.PersonRepository;
import com.caygiapha.familytree.repository.TreeRepository;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.security.AuthorizationService.Role;
import com.caygiapha.familytree.service.ImageProcessor.ProcessedImage;
import java.util.List;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

/**
 * Person photo operations (Requirement 24): upload (validated + metadata-stripped), primary
 * selection, access-gated serving, and deletion. Bytes live in {@link StorageService}; only a
 * reference + metadata are persisted (24.7). Mutations are restricted to the tree owner or the
 * node's linked user (24.8); serving is gated by tree read access plus the {@code vis_photo} and
 * Living_Person rules (24.5).
 */
@Service
public class PhotoService {

    /** A photo's bytes and content type, ready to stream to an authorized viewer. */
    public record ServedImage(String contentType, byte[] bytes) {}

    private final PersonRepository personRepository;
    private final PersonPhotoRepository photoRepository;
    private final TreeRepository treeRepository;
    private final StorageService storageService;
    private final ImageProcessor imageProcessor;
    private final AuthorizationService authorizationService;
    private final LivingPersonPolicy livingPersonPolicy;

    public PhotoService(
            PersonRepository personRepository,
            PersonPhotoRepository photoRepository,
            TreeRepository treeRepository,
            StorageService storageService,
            ImageProcessor imageProcessor,
            AuthorizationService authorizationService,
            LivingPersonPolicy livingPersonPolicy) {
        this.personRepository = personRepository;
        this.photoRepository = photoRepository;
        this.treeRepository = treeRepository;
        this.storageService = storageService;
        this.imageProcessor = imageProcessor;
        this.authorizationService = authorizationService;
        this.livingPersonPolicy = livingPersonPolicy;
    }

    /** Upload a validated, metadata-stripped image for the node (24.1, 24.3, 24.4, 24.8). */
    @Mutation
    public PersonPhoto upload(UUID treeId, UUID personId, byte[] bytes, Integer photoYear, String description) {
        authorizationService.requireMutationPermitted(treeId, personId); // 24.8
        requirePerson(treeId, personId);

        ProcessedImage image = imageProcessor.process(bytes); // 24.3/24.4 — validate + strip
        String objectKey = "persons/" + personId + "/" + UUID.randomUUID();
        storageService.put(objectKey, image.bytes(), image.contentType());

        PersonPhoto photo = new PersonPhoto(
                personId, objectKey, image.contentType(), image.bytes().length,
                image.width(), image.height(), photoYear, description);
        if (photoRepository.findByPersonId(personId).isEmpty()) {
            photo.setPrimary(true); // first photo becomes the primary by default
        }
        return photoRepository.save(photo);
    }

    /** Designate a photo as the node's primary, clearing any prior primary (24.2, 24.8). */
    @Mutation
    public PersonPhoto setPrimary(UUID treeId, UUID personId, UUID photoId) {
        authorizationService.requireMutationPermitted(treeId, personId); // 24.8
        requirePerson(treeId, personId);
        PersonPhoto target = photoRepository.findByIdAndPersonId(photoId, personId)
                .orElseThrow(() -> ApiException.nodeNotAccessible("The photo is not accessible."));

        // Clear the existing primary first (the partial unique index allows only one primary).
        photoRepository.findByPersonIdAndPrimaryTrue(personId).ifPresent(current -> {
            if (!current.getId().equals(photoId)) {
                current.setPrimary(false);
                photoRepository.saveAndFlush(current);
            }
        });
        target.setPrimary(true);
        return photoRepository.save(target);
    }

    /** List a node's photos for an authorized viewer (metadata only). */
    @Transactional(readOnly = true)
    public List<PersonPhoto> list(UUID treeId, UUID personId, String shareToken) {
        authorizationService.requireReadAccess(treeId, shareToken);
        requirePerson(treeId, personId);
        return photoRepository.findByPersonIdOrderByCreatedAtDesc(personId);
    }

    /** Serve a photo's bytes, gated by read access plus vis_photo / Living_Person rules (24.5). */
    @Transactional(readOnly = true)
    public ServedImage serve(UUID treeId, UUID personId, UUID photoId, String shareToken) {
        authorizationService.requireReadAccess(treeId, shareToken); // 24.5 / 19.x
        Person person = requirePerson(treeId, personId);
        PersonPhoto photo = photoRepository.findByIdAndPersonId(photoId, personId)
                .orElseThrow(() -> ApiException.nodeNotAccessible("The photo is not accessible."));

        if (!photoVisible(treeId, person)) {
            throw ApiException.notAuthorized("You are not authorized to view this photo.");
        }
        return new ServedImage(photo.getContentType(), storageService.get(photo.getObjectKey()));
    }

    /** Delete a photo's bytes and row (24.8). */
    @Mutation
    public void delete(UUID treeId, UUID personId, UUID photoId) {
        authorizationService.requireMutationPermitted(treeId, personId); // 24.8
        requirePerson(treeId, personId);
        PersonPhoto photo = photoRepository.findByIdAndPersonId(photoId, personId)
                .orElseThrow(() -> ApiException.nodeNotAccessible("The photo is not accessible."));
        storageService.delete(photo.getObjectKey());
        photoRepository.delete(photo);
    }

    /** Delete all of a node's photos from storage and the database (node deletion cleanup; 24.6). */
    @Mutation
    public void deleteAllForPerson(UUID personId) {
        List<PersonPhoto> photos = photoRepository.findByPersonId(personId);
        for (PersonPhoto p : photos) {
            storageService.delete(p.getObjectKey());
        }
        photoRepository.deleteByPersonId(personId);
    }

    /**
     * Whether the current viewer may see the node's primary photo: a privileged viewer always; any
     * other viewer only when {@code vis_photo} is public and the person is not a redacted
     * Living_Person (24.5).
     */
    private boolean photoVisible(UUID treeId, Person person) {
        boolean privileged = authorizationService.classify(treeId, person.getId()) != Role.NEITHER;
        if (privileged) {
            return true;
        }
        if (!PersonVisibility.PUBLIC.equals(person.getVisPhoto())) {
            return false;
        }
        boolean livingRedaction =
                treeRepository.findById(treeId).map(Tree::isLivingRedaction).orElse(true);
        return !(livingRedaction && livingPersonPolicy.isLiving(person));
    }

    private Person requirePerson(UUID treeId, UUID personId) {
        return personRepository.findByIdAndTreeId(personId, treeId)
                .orElseThrow(() -> ApiException.nodeNotAccessible("The target node is not accessible."));
    }
}
