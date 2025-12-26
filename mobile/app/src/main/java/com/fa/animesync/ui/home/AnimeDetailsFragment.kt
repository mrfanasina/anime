package com.fa.animesync.ui.details

import android.content.Context
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.view.*
import android.widget.FrameLayout
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.bumptech.glide.Glide
import com.fa.animesync.R
import com.fa.animesync.databinding.FragmentAnimeDetailsBinding
import com.fa.animesync.model.AnimeDetails
import com.fa.animesync.model.Season
import com.fa.animesync.model.Episode
import com.fa.animesync.ui.home.SeasonAdapter
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.common.MediaItem
import retrofit2.*
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Path
import java.io.File
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class AnimeDetailsFragment : Fragment() {

    private var _binding: FragmentAnimeDetailsBinding? = null
    private val binding get() = _binding!!

    private var animeId: Int = -1
    private var animePath: String? = null
    private var fromPc: Boolean = false

    private var exoPlayer: ExoPlayer? = null
    private var isFullscreen = false

    private lateinit var fullscreenContainer: FrameLayout
    private var originalPlayerParent: ViewGroup? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        animeId = arguments?.getInt("anime_id", -1) ?: -1
        animePath = arguments?.getString("anime_path")
        fromPc = arguments?.getBoolean("fromPc", false) ?: false
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAnimeDetailsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        fullscreenContainer =
            requireActivity().findViewById(R.id.fullscreenContainer)

        binding.btnFullscreen.setOnClickListener { toggleFullscreen() }

        if (fromPc) loadPcAnimeDetails()
        else loadLocalAnimeDetails()
    }

    /* ===================== FULLSCREEN ===================== */

    private fun toggleFullscreen() {
        if (isFullscreen) exitFullscreen()
        else enterFullscreen()
    }

    private fun enterFullscreen() {
        val activity = requireActivity()

        isFullscreen = true
        activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

        WindowCompat.setDecorFitsSystemWindows(activity.window, false)
        WindowInsetsControllerCompat(
            activity.window,
            activity.window.decorView
        ).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        (activity as AppCompatActivity).supportActionBar?.hide()

        // 🔥 MOVE PLAYER TO ACTIVITY CONTAINER
        originalPlayerParent = binding.playerView.parent as ViewGroup
        originalPlayerParent?.removeView(binding.playerView)

        fullscreenContainer.visibility = View.VISIBLE
        fullscreenContainer.addView(
            binding.playerView,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )

        binding.btnFullscreen.setImageResource(R.drawable.ic_fullscreen)
    }

    private fun exitFullscreen() {
        val activity = requireActivity()

        isFullscreen = false
        activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED

        WindowCompat.setDecorFitsSystemWindows(activity.window, true)
        WindowInsetsControllerCompat(
            activity.window,
            activity.window.decorView
        ).show(WindowInsetsCompat.Type.systemBars())

        (activity as AppCompatActivity).supportActionBar?.show()

        // 🔥 MOVE PLAYER BACK TO FRAGMENT
        fullscreenContainer.removeView(binding.playerView)
        fullscreenContainer.visibility = View.GONE
        originalPlayerParent?.addView(binding.playerView)

        binding.btnFullscreen.setImageResource(R.drawable.ic_fullscreen)
    }

    /* ===================== LOCAL ===================== */

    private fun loadLocalAnimeDetails() {
        Toast.makeText(requireContext(), "local", Toast.LENGTH_SHORT).show()

        val root = File(animePath ?: return)
        if (!root.exists()) return

        val seasons = mutableListOf<Season>()
        val animeId = 0

        val videoFiles = root.listFiles()
            ?.filter { it.isFile && it.extension.lowercase() in listOf("mp4", "mkv", "avi") }

        if (!videoFiles.isNullOrEmpty()) {
            seasons.add(
                Season(
                    id = 0,
                    name = "Saison 1",
                    episodes = videoFiles.mapIndexed { index, file ->
                        Episode(
                            id = index,
                            name = file.name,
                            path = file.absolutePath,
                            season_id = 0,
                            episode_number = index + 1,
                            not_found = false,
                            modified_time = "",
                            audio_languages = "",
                            subtitles = "",
                            upload_date = ""
                        )
                    },
                    anime_id = animeId,
                    season_number = 1
                )
            )
        }

        binding.txtTitle.text = root.name
        binding.txtDescription.text = "Animé local"
        binding.txtNote.text = "—"

        binding.recyclerSeasons.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerSeasons.adapter =
            SeasonAdapter(seasons) { episode -> playEpisode(episode, false) }
    }

    /* ===================== PC ===================== */

    private fun loadPcAnimeDetails() {
        val ip = loadIp() ?: return

        Retrofit.Builder()
            .baseUrl(ip)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AnimeApi::class.java)
            .getAnimeDetails(animeId)
            .enqueue(object : Callback<AnimeDetails> {
                override fun onResponse(
                    call: Call<AnimeDetails>,
                    response: Response<AnimeDetails>
                ) {
                    if (response.isSuccessful) displayAnime(response.body())
                }

                override fun onFailure(call: Call<AnimeDetails>, t: Throwable) {
                    Toast.makeText(requireContext(), "Anime introuvable", Toast.LENGTH_SHORT).show()
                }
            })
    }

    private fun displayAnime(anime: AnimeDetails?) {
        anime ?: return

        binding.txtTitle.text = anime.name
        binding.txtDescription.text = anime.description
        binding.txtNote.text = anime.note.toString()

        Glide.with(requireContext()).load(anime.image_url).into(binding.imgAnime)

        binding.recyclerSeasons.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerSeasons.adapter =
            SeasonAdapter(anime.seasons) { episode -> playEpisode(episode, fromPc) }
    }

    /* ===================== PLAYER ===================== */

    private fun playEpisode(episode: Episode, fromPc: Boolean) {
        val url = if (fromPc) {
            "${loadIp()}/player/stream/${episode.id}"
        } else {
            "file://${episode.path}"
        }

        binding.playerContainer.visibility = View.VISIBLE

        exoPlayer?.release()
        exoPlayer = ExoPlayer.Builder(requireContext()).build()
        binding.playerView.player = exoPlayer

        exoPlayer?.setMediaItem(MediaItem.fromUri(url))
        exoPlayer?.prepare()
        exoPlayer?.play()
    }

    private fun loadIp(): String? =
        requireContext()
            .getSharedPreferences("anime_sync", Context.MODE_PRIVATE)
            .getString("backUrl", null)

    override fun onDestroyView() {
        if (isFullscreen) exitFullscreen()
        exoPlayer?.release()
        _binding = null
        super.onDestroyView()
    }

    interface AnimeApi {
        @GET("anime/with-progress/{id}")
        fun getAnimeDetails(@Path("id") id: Int): Call<AnimeDetails>
    }
}
