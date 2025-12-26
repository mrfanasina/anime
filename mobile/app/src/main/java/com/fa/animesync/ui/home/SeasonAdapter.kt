package com.fa.animesync.ui.home

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.fa.animesync.databinding.ItemSeasonBinding
import com.fa.animesync.model.Season
import com.fa.animesync.model.Episode

class SeasonAdapter(
    private val seasons: List<Season>,
    private val onEpisodeClick: (Episode) -> Unit // callback clic épisode
) : RecyclerView.Adapter<SeasonAdapter.SeasonViewHolder>() {

    inner class SeasonViewHolder(val binding: ItemSeasonBinding) :
        RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SeasonViewHolder {
        val binding = ItemSeasonBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return SeasonViewHolder(binding)
    }

    override fun onBindViewHolder(holder: SeasonViewHolder, position: Int) {
        val season = seasons[position]
        holder.binding.txtSeason.text =
            "Saison ${season.season_number} - ${season.name}"

        // Configure le RecyclerView des épisodes
        holder.binding.recyclerEpisodes.layoutManager =
            LinearLayoutManager(holder.itemView.context)

        // Passe le callback au EpisodeAdapter
        holder.binding.recyclerEpisodes.adapter =
            EpisodeAdapter(season.episodes, onEpisodeClick)
    }

    override fun getItemCount() = seasons.size
}
