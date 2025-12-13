package com.fa.animesync.ui.home

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.fa.animesync.R
import com.fa.animesync.model.Anime

class AnimeAdapter(private val animeList: List<Anime>) : RecyclerView.Adapter<AnimeAdapter.AnimeViewHolder>() {

    class AnimeViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val imageView: ImageView = itemView.findViewById(R.id.imageAnime)
        val titleTextView: TextView = itemView.findViewById(R.id.textAnimeTitle)
        val descriptionTextView: TextView = itemView.findViewById(R.id.textAnimeDescription)
        val scoreTextView: TextView = itemView.findViewById(R.id.textAnimeScore)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AnimeViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_anime, parent, false)
        return AnimeViewHolder(view)
    }

    override fun onBindViewHolder(holder: AnimeViewHolder, position: Int) {
        val anime = animeList[position]

        holder.titleTextView.text = anime.title
        holder.descriptionTextView.text = anime.description
        holder.scoreTextView.text = "⭐ Note : ${anime.score}"

        Glide.with(holder.itemView.context)
            .load(anime.imageUrl)
            .placeholder(R.drawable.placeholder_image) // Mets une image par défaut dans res/drawable/
            .into(holder.imageView)
    }

    override fun getItemCount(): Int = animeList.size
}
