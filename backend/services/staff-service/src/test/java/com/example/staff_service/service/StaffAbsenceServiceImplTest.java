package com.example.staff_service.service;

import com.example.staff_service.dto.request.StaffAbsenceRequest;
import com.example.staff_service.entity.StaffAbsence;
import com.example.staff_service.entity.StaffMember;
import com.example.staff_service.exception.ApiException;
import com.example.staff_service.repository.StaffAbsenceRepository;
import com.example.staff_service.repository.StaffMemberRepository;
import com.example.staff_service.security.CurrentActorIdProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class StaffAbsenceServiceImplTest {

    @Mock
    private StaffMemberRepository staffMemberRepository;

    @Mock
    private StaffAbsenceRepository absenceRepository;

    @Mock
    private CurrentActorIdProvider currentActorIdProvider;

    @InjectMocks
    private StaffAbsenceServiceImpl absenceService;

    @Test
    void createAbsenceAllowsInactiveStaffAndPersistsTheRequestedInterval() {
        UUID staffId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        Instant startAt = Instant.parse("2026-11-10T09:30:00Z");
        Instant endAt = Instant.parse("2026-11-10T10:30:00Z");
        StaffMember inactiveStaff = StaffMember.builder().id(staffId).isActive(false).build();
        given(staffMemberRepository.findById(staffId)).willReturn(Optional.of(inactiveStaff));
        given(currentActorIdProvider.getCurrentUserId()).willReturn(actorId);
        given(absenceRepository.save(any(StaffAbsence.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        absenceService.createAbsence(staffId,
                new StaffAbsenceRequest(startAt, endAt, "PERSONAL", "Appointment"));

        org.mockito.ArgumentCaptor<StaffAbsence> captor =
                org.mockito.ArgumentCaptor.forClass(StaffAbsence.class);
        verify(absenceRepository).save(captor.capture());
        assertThat(captor.getValue().getStaffId()).isEqualTo(staffId);
        assertThat(captor.getValue().getStartAt()).isEqualTo(startAt);
        assertThat(captor.getValue().getEndAt()).isEqualTo(endAt);
        assertThat(captor.getValue().getAbsenceType()).isEqualTo("PERSONAL");
        assertThat(captor.getValue().getRecordedBy()).isEqualTo(actorId);
    }

    @Test
    void createAbsenceAllowsOverlappingRecordsToPreserveIndependentReasons() {
        UUID staffId = UUID.randomUUID();
        given(staffMemberRepository.findById(staffId))
                .willReturn(Optional.of(StaffMember.builder().id(staffId).isActive(true).build()));
        given(absenceRepository.save(any(StaffAbsence.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        Instant startAt = Instant.parse("2026-11-10T09:00:00Z");
        Instant endAt = Instant.parse("2026-11-10T11:00:00Z");

        absenceService.createAbsence(staffId,
                new StaffAbsenceRequest(startAt, endAt, "PERSONAL", "Reason A"));
        absenceService.createAbsence(staffId,
                new StaffAbsenceRequest(startAt.plusSeconds(1800), endAt.plusSeconds(1800),
                        "OTHER", "Reason B"));

        org.mockito.Mockito.verify(absenceRepository, org.mockito.Mockito.times(2)).save(any(StaffAbsence.class));
    }

    @Test
    void createAbsenceRejectsZeroLengthOrReversedIntervalsBeforeDatabaseAccess() {
        Instant startAt = Instant.parse("2026-11-10T09:30:00Z");

        assertThatThrownBy(() -> absenceService.createAbsence(UUID.randomUUID(),
                new StaffAbsenceRequest(startAt, startAt, "PERSONAL", null)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("phải trước");

        verifyNoInteractions(staffMemberRepository, absenceRepository, currentActorIdProvider);
    }

    @Test
    void getAbsencesReturnsRecordsIntersectingTheHalfOpenQueryRange() {
        UUID staffId = UUID.randomUUID();
        Instant from = Instant.parse("2026-11-10T09:00:00Z");
        Instant to = Instant.parse("2026-11-10T12:00:00Z");
        StaffAbsence absence = StaffAbsence.builder()
                .id(UUID.randomUUID())
                .staffId(staffId)
                .startAt(Instant.parse("2026-11-10T11:00:00Z"))
                .endAt(Instant.parse("2026-11-10T13:00:00Z"))
                .absenceType("PERSONAL")
                .build();
        given(staffMemberRepository.findById(staffId))
                .willReturn(Optional.of(StaffMember.builder().id(staffId).build()));
        given(absenceRepository.findByStaffIdAndStartAtBeforeAndEndAtAfterOrderByStartAtAsc(
                staffId, to, from)).willReturn(List.of(absence));

        var results = absenceService.getAbsences(staffId, from, to);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).absenceId()).isEqualTo(absence.getId());
        verify(absenceRepository)
                .findByStaffIdAndStartAtBeforeAndEndAtAfterOrderByStartAtAsc(staffId, to, from);
    }

    @Test
    void getAbsencesRejectsInvalidRangeBeforeDatabaseAccess() {
        Instant at = Instant.parse("2026-11-10T09:00:00Z");

        assertThatThrownBy(() -> absenceService.getAbsences(UUID.randomUUID(), at, at))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("from trước to");

        verifyNoInteractions(staffMemberRepository, absenceRepository);
    }

    @Test
    void updateAndDeleteRequireTheAbsenceToBelongToTheStaff() {
        UUID staffId = UUID.randomUUID();
        UUID absenceId = UUID.randomUUID();
        given(staffMemberRepository.findById(staffId))
                .willReturn(Optional.of(StaffMember.builder().id(staffId).isActive(true).build()));
        given(absenceRepository.findByIdAndStaffId(absenceId, staffId)).willReturn(Optional.empty());
        StaffAbsenceRequest request = new StaffAbsenceRequest(
                Instant.parse("2026-11-10T09:00:00Z"),
                Instant.parse("2026-11-10T10:00:00Z"),
                "PERSONAL",
                null);

        assertThatThrownBy(() -> absenceService.updateAbsence(staffId, absenceId, request))
                .isInstanceOf(com.example.staff_service.exception.StaffAbsenceNotFoundException.class);
        assertThatThrownBy(() -> absenceService.deleteAbsence(staffId, absenceId))
                .isInstanceOf(com.example.staff_service.exception.StaffAbsenceNotFoundException.class);
    }
}
