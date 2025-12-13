package com.fa.animesync.model

data class Anime(
    val id: Int,
    val title: String,
    var description: String = "",
    var imageUrl: String = "",   // 🔥 Ajout image
    var score: Double = 0.0      // 🌟 Ajout note
)
