package com.fa.animesync.model

data class AnimeDetails(
    val id: Int,
    val name: String,
    val description: String,
    val image_url: String,
    val note: Double,
    val seasons: List<Season>
)