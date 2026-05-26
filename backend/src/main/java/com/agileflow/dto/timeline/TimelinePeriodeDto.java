package com.agileflow.dto.timeline;

import java.util.List;

public record TimelinePeriodeDto(
        String dateMin,
        String dateMax,
        String dateAujourdhui,
        List<String> mois,
        List<String> semaines,
        List<String> trimestres
) {
}
