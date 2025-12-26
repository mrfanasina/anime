package com.fa.animesync.ui.home

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.fa.animesync.databinding.ItemAnimeBinding
import com.fa.animesync.model.Anime

class AnimeAdapter(
    private val animes: List<Anime>,
    private val onClick: (Anime) -> Unit
) : RecyclerView.Adapter<AnimeAdapter.AnimeViewHolder>() {

    inner class AnimeViewHolder(val binding: ItemAnimeBinding) :
        RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AnimeViewHolder {
        val binding = ItemAnimeBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return AnimeViewHolder(binding)
    }

    override fun onBindViewHolder(holder: AnimeViewHolder, position: Int) {
        val anime = animes[position]

        holder.binding.txtTitle.text = anime.name
        holder.binding.txtNote.text = anime.note.toString()
        holder.binding.fromPC.text = anime.fromPc.toString()
        if (anime.image_url.isNotEmpty()) {
            Glide.with(holder.itemView.context)
                .load(anime.image_url)
                .into(holder.binding.imgAnime)
        }

        holder.itemView.setOnClickListener {
            onClick(anime)
        }
    }

    override fun getItemCount() = animes.size
}
