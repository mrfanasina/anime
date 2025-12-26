package com.fa.animesync.model

data class Anime(
    val id: Int,
    var fromPc: Boolean = true,
    val title: String,
    var description: String = "",
    var image_url: String = "",
    var note: Double = 0.0,
    val name: String,
    val title_nihon: String?,
    val title_english: String?,
    val title_romaji: String?,
    val path: String,
    val elo: Int,
    val synopsis: String?,
    val status: String?,
    val type: String?,
    val rank: Int?,
    val created_at: String?,
    val studio: String?,
    val seasons_count: Int,
    val seasons: String?
)
