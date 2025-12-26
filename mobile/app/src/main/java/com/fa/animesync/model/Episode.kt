package com.fa.animesync.model

data class Episode(
    val id: Int,
    val name: String,
    val season_id: Int,
    val episode_number: Int,
    val path: String,
    val not_found: Boolean,
    val modified_time: String?,   // DateTime → String ISO
    val audio_languages: String?, // "fr,en,jp"
    val subtitles: String?,       // "fr,en"
    val upload_date: String?      // DateTime → String ISO
)
