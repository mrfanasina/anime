package com.fa.animesync.remote
import retrofit2.Call
import retrofit2.http.GET
import com.fa.animesync.model.Post

interface ApiService {
    @GET("posts")
    fun getPosts(): Call<List<Post>>
}