package com.caygiapha.familytree.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.caygiapha.familytree.dto.ViewpointAddressesResponse;
import com.caygiapha.familytree.error.ApiException;
import com.caygiapha.familytree.error.ErrorCode;
import com.caygiapha.familytree.security.AuthorizationService;
import com.caygiapha.familytree.service.ViewpointAddressService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link ViewpointController}: it requires an authenticated viewer and delegates the
 * change-viewpoint all-addresses computation to {@link ViewpointAddressService} (Requirement 10).
 */
class ViewpointControllerTest {

    private ViewpointAddressService viewpointAddressService;
    private AuthorizationService authorizationService;
    private ViewpointController controller;

    private final UUID treeId = UUID.randomUUID();
    private final UUID egoId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        viewpointAddressService = mock(ViewpointAddressService.class);
        authorizationService = mock(AuthorizationService.class);
        controller = new ViewpointController(viewpointAddressService, authorizationService);
    }

    @Test
    void requiresAuthenticatedViewerThenDelegates() {
        ViewpointAddressesResponse expected =
                new ViewpointAddressesResponse(egoId, List.of());
        when(viewpointAddressService.computeAddresses(treeId, egoId)).thenReturn(expected);

        ViewpointAddressesResponse body = controller.addresses(treeId, egoId, null);

        verify(authorizationService).requireReadAccess(treeId, null);
        verify(viewpointAddressService).computeAddresses(treeId, egoId);
        assertThat(body).isSameAs(expected);
    }

    @Test
    void unauthenticatedViewerIsRejectedBeforeComputing() {
        doThrow(ApiException.notAuthorized("nope"))
                .when(authorizationService).requireReadAccess(treeId, null);

        assertThatThrownBy(() -> controller.addresses(treeId, egoId, null))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.code()).isEqualTo(ErrorCode.NOT_AUTHORIZED));
        verify(viewpointAddressService, never()).computeAddresses(treeId, egoId);
    }
}
