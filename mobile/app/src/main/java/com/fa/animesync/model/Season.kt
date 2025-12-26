package com.fa.animesync.model

data class Season(
    val id: Int,
    val name: String,
    val anime_id: Int,
    val season_number: Int,
    val episodes: List<Episode> = emptyList()
)
