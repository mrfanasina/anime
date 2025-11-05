// components/Section.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Section({ title, data }) {
  const navigate = useNavigate();
  
  if (!data || data.length === 0) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold">{title}</h2>
        <Link to="#" className="text-sm text-blue-400 hover:underline">
          Voir tout
        </Link>
      </div>
      <div className="flex space-x-3 overflow-x-auto pb">
        {data.map((anime) => (
          <div
            key={anime.id}
            className="min-w-[150px rounded-xl shadow-md overflow-hidden hover:scale-105 transition-transform"
            onClick={() => navigate(`/details/${anime.id}`)}
          >
            <img
              src={anime.image_url || "/placeholder.jpg"}
              alt={anime.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-2">
              <h3 className="truncate font-semibold">{anime.title}</h3>
              {anime.progress && (
                <p className="text-xs">
                  {anime.progress}% vu
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
