package com.fa.animesync.ui.home

import android.Manifest
import android.app.AlertDialog
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.fa.animesync.R
import com.fa.animesync.databinding.FragmentHomeBinding
import com.fa.animesync.model.Anime
import com.fa.animesync.ui.details.AnimeDetailsFragment
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
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

    private var cameraProvider: ProcessCameraProvider? = null
    private var navigating = false

    /* ===================== PERMISSION CAMÉRA ===================== */

    private val cameraPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) openScanner()
            else showErrorDialog("Permission caméra refusée")
        }

    /* ===================== LIFECYCLE ===================== */

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

        setupRecycler()
        loadLocalAnimes()
        loadPcAnimesIfCached()
        setupQrButton()
    }

    override fun onResume() {
        super.onResume()
        navigating = false
    }

    override fun onDestroyView() {
        super.onDestroyView()
        closeScanner()
        _binding = null
    }

    /* ===================== RECYCLER ===================== */

    private fun setupRecycler() {
        animeAdapter = AnimeAdapter(allAnimes) { anime ->
            openAnimeDetails(anime)
        }

        binding.recyclerViewAnime.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = animeAdapter
        }
    }

    /* ===================== NAVIGATION ===================== */

    private fun openAnimeDetails(anime: Anime) {
        if (!anime.fromPc) {
            Toast.makeText(requireContext(), "fromPc", Toast.LENGTH_SHORT).show()
        }
        if (navigating) return
        navigating = true

        closeScanner()

        val bundle = Bundle().apply {
            putInt("anime_id", anime.id)
            putBoolean("fromPc", anime.fromPc)
            if (!anime.fromPc) { // local
                putString("anime_path", anime.path)
            }
        }

        findNavController().navigate(
            R.id.action_nav_home_to_animeDetailsFragment,
            bundle
        )
    }
    /* ===================== QR SCANNER ===================== */

    private fun setupQrButton() {
        binding.btnScanQr.setOnClickListener {
            if (ContextCompat.checkSelfPermission(
                    requireContext(),
                    Manifest.permission.CAMERA
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                openScanner()
            } else {
                cameraPermission.launch(Manifest.permission.CAMERA)
            }
        }
    }

    private fun openScanner() {
        binding.qrContainer.visibility = View.VISIBLE
        startQrScan()
    }

    private fun closeScanner() {
        binding.qrContainer.visibility = View.GONE
        cameraProvider?.unbindAll()
    }

    @OptIn(ExperimentalGetImage::class)
    private fun startQrScan() {
        val providerFuture = ProcessCameraProvider.getInstance(requireContext())

        providerFuture.addListener({
            cameraProvider = providerFuture.get()

            val preview = Preview.Builder().build().apply {
                setSurfaceProvider(binding.cameraPreview.surfaceProvider)
            }

            val analyzer = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()

            val scanner = BarcodeScanning.getClient()

            analyzer.setAnalyzer(ContextCompat.getMainExecutor(requireContext())) { imageProxy ->
                val mediaImage = imageProxy.image ?: run {
                    imageProxy.close()
                    return@setAnalyzer
                }

                val image = InputImage.fromMediaImage(
                    mediaImage,
                    imageProxy.imageInfo.rotationDegrees
                )

                scanner.process(image)
                    .addOnSuccessListener { barcodes ->
                        barcodes.firstOrNull()?.rawValue?.let { ip ->
                            saveIp(ip)
                            closeScanner()
                            fetchPcAnimes(ip)
                        }
                    }
                    .addOnCompleteListener {
                        imageProxy.close()
                    }
            }

            cameraProvider?.unbindAll()
            cameraProvider?.bindToLifecycle(
                viewLifecycleOwner,
                CameraSelector.DEFAULT_BACK_CAMERA,
                preview,
                analyzer
            )

        }, ContextCompat.getMainExecutor(requireContext()))
    }

    /* ===================== DONNÉES ===================== */

    private fun loadLocalAnimes() {
        val folder = File("/storage/emulated/0/Movies/Anime")
        if (!folder.exists()) return

        folder.listFiles()?.forEachIndexed { index, file ->
            if (file.isDirectory) {
                allAnimes.add(
                    Anime(
                        id = index,
                        title = file.name,
                        description = "Depuis le téléphone",
                        image_url = "",
                        note = 0.0,
                        name = file.name,
                        title_nihon = null,
                        title_english = null,
                        title_romaji = null,
                        path = file.absolutePath,
                        elo = 0,
                        synopsis = null,
                        status = null,
                        type = null,
                        rank = null,
                        created_at = null,
                        studio = null,
                        seasons_count = 0,
                        fromPc = false,
                        seasons = null
                    )
                )
            }
        }
        animeAdapter.notifyDataSetChanged()
    }

    private fun loadPcAnimesIfCached() {
        loadIp()?.let { fetchPcAnimes(it) }
    }

    private fun fetchPcAnimes(backUrl: String) {
        val retrofit = Retrofit.Builder()
            .baseUrl("$backUrl/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        retrofit.create(AnimeApi::class.java)
            .getAnimesFromPC()
            .enqueue(object : Callback<List<Anime>> {
                override fun onResponse(
                    call: Call<List<Anime>>,
                    response: Response<List<Anime>>
                ) {
                    if (response.isSuccessful) {
                        response.body()?.let {
                            allAnimes.addAll(it)
                            animeAdapter.notifyDataSetChanged()
                        }
                    }
                }

                override fun onFailure(call: Call<List<Anime>>, t: Throwable) {
                    showErrorDialog(t.localizedMessage ?: "Erreur réseau")
                }
            })
    }

    private fun saveIp(backUrl: String) {
        requireContext()
            .getSharedPreferences("anime_sync", Context.MODE_PRIVATE)
            .edit()
            .putString("backUrl", backUrl)
            .apply()
    }

    private fun loadIp(): String? =
        requireContext()
            .getSharedPreferences("anime_sync", Context.MODE_PRIVATE)
            .getString("backUrl", null)

    /* ===================== UI ===================== */
    private fun showErrorDialog(message: String) {
        AlertDialog.Builder(requireContext())
            .setTitle("Erreur")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }

    /* ===================== API ===================== */

    interface AnimeApi {
        @GET("anime")
        fun getAnimesFromPC(): Call<List<Anime>>
    }

    interface JikanApi {
        @GET("v4/anime")
        fun searchAnime(@Query("q") query: String): Call<JikanResponse>
    }

    data class JikanResponse(val data: List<JikanAnime>)
    data class JikanAnime(
        val synopsis: String?,
        val images: JikanImages?,
        val score: Double?
    )

    data class JikanImages(val jpg: JikanImageDetail)
    data class JikanImageDetail(val image_url: String)
}
