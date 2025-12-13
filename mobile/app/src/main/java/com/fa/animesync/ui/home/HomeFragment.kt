package com.fa.animesync.ui.home

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.bumptech.glide.Glide
import com.fa.animesync.databinding.FragmentHomeBinding
import com.fa.animesync.model.Anime
import retrofit2.*
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Query
import java.io.File

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    private lateinit var animeAdapter: AnimeAdapter
    private val allAnimes = mutableListOf<Anime>()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.recyclerViewAnime.layoutManager = LinearLayoutManager(requireContext())
        animeAdapter = AnimeAdapter(allAnimes)
        binding.recyclerViewAnime.adapter = animeAdapter

        // 📁 Ajoute les animés locaux
        val localAnimes = fetchLocalAnimes()
        localAnimes.forEach { enrichAnimeInfo(it) }
        allAnimes.addAll(localAnimes)
        animeAdapter.notifyDataSetChanged()

        // 🌐 Demande l'IP du PC
        promptForIp { ip ->
            fetchPcAnimes(ip) { pcAnimes, errorMessage ->
                if (errorMessage != null) {
                    showErrorDialog(errorMessage)
                } else {
                    pcAnimes.forEach { enrichAnimeInfo(it) }
                    allAnimes.addAll(pcAnimes)
                    animeAdapter.notifyDataSetChanged()
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    // 🎬 Récupère les animés locaux
    private fun fetchLocalAnimes(): List<Anime> {
        val animes = mutableListOf<Anime>()
        val animeFolder = File("/storage/emulated/0/Movies/Anime")

        if (animeFolder.exists()) {
            animeFolder.listFiles()?.forEachIndexed { index, file ->
                if (file.isDirectory) {
                    animes.add(
                        Anime(
                            id = index,
                            title = file.name,
                            description = "Depuis le téléphone"
                        )
                    )
                }
            }
        }
        return animes
    }

    // 🌐 Boîte de dialogue pour entrer l'IP
    private fun promptForIp(onIpEntered: (String) -> Unit) {
        val editText = EditText(requireContext()).apply {
            hint = "192.168.1.42"
        }

        AlertDialog.Builder(requireContext())
            .setTitle("Adresse IP du PC")
            .setMessage("Entre l'adresse IP locale du PC\n(ex: 192.168.1.42)")
            .setView(editText)
            .setCancelable(false)
            .setPositiveButton("Valider") { _, _ ->
                val ip = editText.text.toString().trim()
                if (ip.isNotEmpty()) {
                    onIpEntered(ip)
                }
            }
            .show()
    }

    // 🔁 Appelle FastAPI pour récupérer les animés depuis le PC + gestion des erreurs
    private fun fetchPcAnimes(ip: String, onResult: (List<Anime>, String?) -> Unit) {
        val retrofit = Retrofit.Builder()
            .baseUrl("http://$ip:8000/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val api = retrofit.create(AnimeApi::class.java)
        api.getAnimesFromPC().enqueue(object : Callback<List<Anime>> {
            override fun onResponse(call: Call<List<Anime>>, response: Response<List<Anime>>) {
                if (response.isSuccessful) {
                    onResult(response.body() ?: emptyList(), null)
                } else {
                    onResult(emptyList(), "Erreur du serveur : ${response.code()} ${response.message()}")
                }
            }

            override fun onFailure(call: Call<List<Anime>>, t: Throwable) {
                onResult(emptyList(), "Échec de la connexion à l'API : ${t.localizedMessage}")
            }
        })
    }

    // 🌐 Enrichit un animé via l’API Jikan
    private fun enrichAnimeInfo(anime: Anime) {
        val retrofit = Retrofit.Builder()
            .baseUrl("https://api.jikan.moe/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val api = retrofit.create(JikanApi::class.java)
        api.searchAnime(anime.title).enqueue(object : Callback<JikanResponse> {
            override fun onResponse(call: Call<JikanResponse>, response: Response<JikanResponse>) {
                if (response.isSuccessful) {
                    val result = response.body()?.data?.firstOrNull()
                    if (result != null) {
                        anime.description = result.synopsis ?: "Pas de synopsis"
                        anime.imageUrl = result.images?.jpg?.image_url ?: ""
                        anime.score = result.score ?: 0.0
                        animeAdapter.notifyDataSetChanged()
                    }
                }
            }

            override fun onFailure(call: Call<JikanResponse>, t: Throwable) {
                // Ignorer les erreurs réseau (optionnel)
            }
        })
    }

    // ❗ Affiche une boîte de dialogue d'erreur
    private fun showErrorDialog(message: String) {
        AlertDialog.Builder(requireContext())
            .setTitle("Erreur")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }

    // 🔗 Interface Retrofit vers FastAPI
    interface AnimeApi {
        @GET("animes")
        fun getAnimesFromPC(): Call<List<Anime>>
    }

    // 🔗 Interface Jikan
    interface JikanApi {
        @GET("v4/anime")
        fun searchAnime(@Query("q") query: String): Call<JikanResponse>
    }

    // 🔄 Modèles pour réponse Jikan
    data class JikanResponse(val data: List<JikanAnime>)

    data class JikanAnime(
        val mal_id: Int,
        val title: String,
        val synopsis: String?,
        val images: JikanImages?,
        val score: Double?
    )

    data class JikanImages(val jpg: JikanImageDetail)

    data class JikanImageDetail(val image_url: String)
}
