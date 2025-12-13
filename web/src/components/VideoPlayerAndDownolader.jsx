import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Play, Pause, Download, Volume2, Maximize, Loader2, Zap, Link, Minimize } from 'lucide-react';
import { showToast } from "../utils/alerts"; // Assurez-vous que showToast est bien implémenté

const VideoPlayerWithHeader = ({ episodeId, apiUrl, animeName }) => {
    // Récupération des données du thème
    const { mode, primaryColors } = useSelector((state) => state.theme);
    const isDark = mode === "dark";

    // États du lecteur
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isBuffering, setIsBuffering] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [volume, setVolume] = useState(1);
    const [isSeeking, setIsSeeking] = useState(false);
    const [bufferedEnd, setBufferedEnd] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false); // État pour suivre le plein écran
    const [styleDuration, setStyleDuration] = useState(0); // Temps ecoulé en mode fixe ou dynamique
    const videoRef = useRef(null);
    const controlTimeoutRef = useRef(null);
    const progressRef = useRef(null); // Ref pour la barre de progression

    const streamUrl = `${apiUrl}/stream/${episodeId}`;
    const downloadUrl = `${apiUrl}/download/${episodeId}`;

    // Couleur d'accentuation pour la personnalisation
    const accentColor = primaryColors.accent || '#10b981';

    // --- Fonctions de Contrôle Vidéo ---

    const togglePlay = useCallback(() => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        if (isPlaying) {
            video.pause();
        } else {
            video.play().catch(error => console.error("Erreur de lecture:", error));
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const handleTimeUpdate = () => {
        if (videoRef.current && !isSeeking) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedData = () => {
        setIsLoading(false);
        setDuration(videoRef.current.duration);
        // Tenter la lecture immédiatement si le navigateur le permet
        videoRef.current.play().catch(error => {
            console.error("Lecture automatique bloquée:", error);
            setIsPlaying(false); // S'assurer que l'état correspond si la lecture échoue
        });
        setIsPlaying(true);
    };

    const handleProgress = () => {
        if (videoRef.current && videoRef.current.buffered.length > 0) {
            setBufferedEnd(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
        }
    };

    const handleWaiting = () => {
        if (duration > 0) {
            setIsBuffering(true);
        }
    };

    const handlePlaying = () => {
        setIsLoading(false);
        setIsBuffering(false);
    };
    
    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            setVolume(newVolume);
        }
    };

    const toggleFullscreen = useCallback(() => {
        const playerContainer = videoRef.current.parentElement;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            playerContainer.requestFullscreen().catch(err => {
                console.error(`Erreur d'activation du mode plein écran: ${err.message}`);
            });
        }
    }, []);

    // Mise à jour de l'état isFullScreen lors du changement d'état du plein écran du DOM
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // --- Gestion de la Barre de Progression (plus robuste) ---
    
    const calculateSeekTime = (e) => {
        if (!progressRef.current || !videoRef.current) return 0;

        const rect = progressRef.current.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        
        // Calculer le pourcentage de clic dans la barre
        const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return percentage * duration;
    };

    const handleSeek = (time) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleSeekMouseDown = (e) => {
        if (e.button !== 0 && !e.touches) return;
        setIsSeeking(true);
        const newTime = calculateSeekTime(e);
        handleSeek(newTime);

        // Ajout d'écouteurs pour le drag
        window.addEventListener('mousemove', handleSeekMouseMove);
        window.addEventListener('mouseup', handleSeekMouseUp);
        window.addEventListener('touchmove', handleSeekMouseMove);
        window.addEventListener('touchend', handleSeekMouseUp);
    };

    const handleSeekMouseMove = useCallback((e) => {
        if (isSeeking) {
            // Empêcher la sélection de texte pendant le drag
            e.preventDefault(); 
            const newTime = calculateSeekTime(e);
            setCurrentTime(newTime);
        }
    }, [isSeeking, duration]);

    const handleSeekMouseUp = useCallback((e) => {
        if (isSeeking) {
            const finalTime = calculateSeekTime(e);
            handleSeek(finalTime);
            setIsSeeking(false);
        }
        // Retirer les écouteurs de drag globaux
        window.removeEventListener('mousemove', handleSeekMouseMove);
        window.removeEventListener('mouseup', handleSeekMouseUp);
        window.removeEventListener('touchmove', handleSeekMouseMove);
        window.removeEventListener('touchend', handleSeekMouseUp);
    }, [isSeeking, duration]);

    // --- UX: Masquage des contrôles/Curseur et Gestion du Clavier ---
    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        if (controlTimeoutRef.current) {
            clearTimeout(controlTimeoutRef.current);
        }
        
        // Masquer les contrôles après 3 secondes d'inactivité
        controlTimeoutRef.current = setTimeout(() => {
            if (isPlaying && !isSeeking) {
                setShowControls(false);
            }
        }, 3000);
    }, [isPlaying, isSeeking]);

    const handleKeyDown = useCallback((e) => {
        if (!videoRef.current) return;

        switch (e.key) {
            case ' ': // Espace pour Play/Pause
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowRight': // Flèche droite pour avancer (5s)
                videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
                break;
            case 'ArrowLeft': // Flèche gauche pour reculer (5s)
                videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
                break;
            case 'ArrowUp': // Flèche haut pour augmenter le volume (5%)
                e.preventDefault();
                const newUpVolume = Math.min(1, videoRef.current.volume + 0.05);
                videoRef.current.volume = newUpVolume;
                setVolume(newUpVolume);
                break;
            case 'ArrowDown': // Flèche bas pour diminuer le volume (5%)
                e.preventDefault();
                const newDownVolume = Math.max(0, videoRef.current.volume - 0.05);
                videoRef.current.volume = newDownVolume;
                setVolume(newDownVolume);
                break;
            case 'f': // 'F' pour plein écran
            case 'F':
                toggleFullscreen();
                break;
            case 'm': // 'M' pour muet (mute)
            case 'M':
                videoRef.current.muted = !videoRef.current.muted;
                break;
            default:
                break;
        }
    }, [togglePlay, toggleFullscreen, duration]);

    const copyFluxUrl = () => {
        navigator.clipboard.writeText(streamUrl).then(() => {
            showToast("URL du flux copiée dans le presse-papiers !");
        }).catch(err => {
            console.error("Erreur de copie de l'URL du flux:", err);
            showToast("Échec de la copie de l'URL du flux.", 'error');
        });
    };

    // --- Effets pour gérer les écouteurs d'événements ---
    useEffect(() => {
        const videoElement = videoRef.current;
        const playerContainer = videoElement?.parentElement;
        
        // Écouteur pour le clavier (sur le conteneur du lecteur pour focalisation)
        playerContainer?.addEventListener('keydown', handleKeyDown);

        if (videoElement) {
            // Événements Vidéo
            videoElement.addEventListener('loadeddata', handleLoadedData);
            videoElement.addEventListener('timeupdate', handleTimeUpdate);
            videoElement.addEventListener('waiting', handleWaiting);
            videoElement.addEventListener('playing', handlePlaying);
            videoElement.addEventListener('progress', handleProgress);
            videoElement.addEventListener('pause', () => setIsPlaying(false));
            videoElement.addEventListener('play', () => setIsPlaying(true));

            // Gestion des contrôles via souris sur le conteneur
            playerContainer.addEventListener('mousemove', handleMouseMove);
            playerContainer.addEventListener('mouseleave', () => {
                if (isPlaying && !isSeeking) {
                    setShowControls(false);
                }
            });
        }
        
        // Le cleanup
        return () => {
            playerContainer?.removeEventListener('keydown', handleKeyDown);

            if (videoElement) {
                videoElement.removeEventListener('loadeddata', handleLoadedData);
                videoElement.removeEventListener('timeupdate', handleTimeUpdate);
                videoElement.removeEventListener('waiting', handleWaiting);
                videoElement.removeEventListener('playing', handlePlaying);
                videoElement.removeEventListener('progress', handleProgress);
                videoElement.removeEventListener('pause', () => setIsPlaying(false));
                videoElement.removeEventListener('play', () => setIsPlaying(true));
            }
            if (playerContainer) {
                playerContainer.removeEventListener('mousemove', handleMouseMove);
                if (controlTimeoutRef.current) {
                    clearTimeout(controlTimeoutRef.current);
                }
            }
        };
    }, [handleMouseMove, handleKeyDown, isPlaying, isSeeking]);


    // --- Utilitaire ---
    const formatTime = (time) => {
        if (isNaN(time) || time === Infinity || time < 0) return "0:00";
        const totalSeconds = Math.floor(time);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = (totalSeconds % 60).toString().padStart(2, "0");
        
        return hours > 0 ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
    };

    const progressPercentage = (currentTime / duration) * 100 || 0;
    const bufferPercentage = (bufferedEnd / duration) * 100 || 0;

    const isVideoLoading = isLoading || isBuffering;
    const inverseStyle = (current) => current === 0 ? currentTime : 0;
    return (
        <div
            className={`min-h-screen flex flex-col items-center justify-start py-8 transition-colors duration-300 ${
                isDark ? "bg-gray-900" : "bg-gray-100"
            }`}
        >
            {/* --- Header Stylisé --- */}
            <header
                className="w-full max-w-5xl mb-8 p-8 rounded-2xl shadow-2xl transition-all duration-300"
                style={{
                    background: `linear-gradient(135deg, ${primaryColors.main || '#3b82f6'} 0%, ${accentColor} 100%)`,
                    color: "white",
                }}
            >
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">{animeName}</h1>
                <p className="mt-2 text-lg sm:text-xl font-light opacity-90">
                    Épisode **{episodeId}**
                </p>
                <div className="mt-6 pt-4 border-t border-opacity-30 flex flex-wrap gap-3" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
                    <a
                        href={downloadUrl}
                        download
                        style={{ backgroundColor: accentColor, boxShadow: `0 4px 10px rgba(0,0,0,0.2)` }}
                        className="inline-flex items-center rounded-full space-x-2 px-6 py-3 text-sm font-semibold transition-all duration-300 transform hover:scale-[1.03] hover:shadow-xl"
                    >
                        <Download size={18} />
                        <span>Télécharger la Vidéo</span>
                    </a>

                    <button
                        style={{ backgroundColor: accentColor, boxShadow: `0 4px 10px rgba(0,0,0,0.2)` }}
                        onClick={copyFluxUrl}
                        className="inline-flex items-center rounded-full space-x-2 px-6 py-3 text-sm font-semibold transition-all duration-300 transform hover:scale-[1.03] hover:shadow-xl"
                    >
                        <Link size={18} />
                        <span>Copier l'URL du Flux</span>
                    </button>
                </div>
                <div className="mt-4 text-sm italic opacity-80 p-3 rounded-lg bg-opacity-10">
                    💡 **Conseil Pro:** Si la lecture présente des problèmes, copiez l'URL du Flux et ouvrez-le directement dans un lecteur vidéo externe comme **VLC** (Média &gt; Ouvrir un flux réseau...).
                </div>
            </header>

            {/* --- Lecteur Vidéo Immersif --- */}
            <div
                className={`w-full max-w-5xl aspect-video overflow-hidden relative shadow-2xl rounded-xl transition-all duration-300 ${
                    isPlaying && !showControls && !isVideoLoading ? 'cursor-none' : 'cursor-default'
                } ${isFullScreen ? 'rounded-none' : ''}`}
                // Le focus ring utilise la couleur d'accentuation pour une meilleure UI
                style={{ outline: isFullScreen ? 'none' : `2px solid transparent`, outlineOffset: isFullScreen ? '0' : '2px' }}
                onDoubleClick={toggleFullscreen}
                tabIndex={0} // Rend le div focusable pour les raccourcis clavier
            >
                {/* Élément Vidéo */}
                <video
                    ref={videoRef}
                    src={streamUrl}
                    onClick={togglePlay}
                    className="w-full h-full bg-dark object-contain"
                    controls={false}
                    // Pour améliorer l'UX mobile
                    playsInline 
                />

                {/* Overlay de chargement/buffering */}
                {isVideoLoading && (
                    <div className="absolute inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center pointer-events-none z-20">
                        <Loader2 className="animate-spin text-white mr-4" size={48} style={{ color: accentColor }} />
                        <span className="text-white text-xl font-semibold">
                            {isLoading ? 'Chargement initial...' : 'Mise en mémoire tampon...'}
                        </span>
                    </div>
                )}
                
                {/* Bouton de Play/Pause au centre (Grande touche UX) */}
                 {(showControls || !isPlaying) && !isVideoLoading && (
                    <div 
                        onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center bg-opacity-10 transition-opacity duration-200 hover:bg-opacity-20 z-10"
                    >
                        <button
                            className="p-4 rounded-full bg-gray-800 bg-opacity-60 hover:bg-opacity-80 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-4"
                            style={{ 
                                pointerEvents: 'auto',
                                boxShadow: `0 0 20px rgba(0,0,0,0.5)`,
                                ringColor: accentColor 
                            }}
                            title={isPlaying ? "Pause (Espace)" : "Lecture (Espace)"}
                        >
                            {isPlaying 
                                ? <Pause size={48} className="text-white fill-white" /> 
                                : <Play size={48} className="text-white fill-white" />
                            }
                        </button>
                    </div>
                )}


                {/* Overlay des Contrôles (Affichage conditionnel) */}
                <div
                    className={`absolute bottom-0 left-0 p-3 right-0 transition-opacity duration-300 z-30 ${
                        showControls || !isPlaying || isSeeking ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
                    } flex flex-col`}
                    style={{ 
                        pointerEvents: showControls || !isPlaying || isSeeking ? 'auto' : 'none',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)'
                    }}
                >
                    {/* Barre de Progression Personnalisée (Réf: progressRef) */}
                    <div 
                        ref={progressRef}
                        className="relative w-full h-4 cursor-pointer group" // Hauteur augmentée pour une meilleure UX mobile
                        onMouseDown={handleSeekMouseDown}
                        onTouchStart={handleSeekMouseDown} // Prise en charge du tactile
                    >
                        {/* Barre de base */}
                        <div className="absolute inset-0 h-1 mt-[7px] bg-white bg-opacity-30"></div>
                        
                        {/* Barre de Buffer (Chargement) */}
                        <div 
                            className="absolute h-1 mt-[7px] bg-white bg-opacity-50 transition-all duration-100"
                            style={{ width: `${bufferPercentage}%` }}
                        ></div>

                        {/* Barre de Temps Écoulé */}
                        <div 
                            className="absolute h-1 mt-[7px] transition-all duration-100"
                            style={{ width: `${progressPercentage}%`, backgroundColor: accentColor }}
                        ></div>
                        
                        {/* Curseur (Drag Handle) */}
                        <div 
                            className={`absolute w-4 h-4 rounded-full transition-all duration-150 transform -translate-x-1/2 ${
                                isSeeking ? 'scale-150' : 'group-hover:scale-125'
                            }`}
                            style={{ 
                                left: `${progressPercentage}%`, 
                                backgroundColor: accentColor, 
                                boxShadow: `0 0 10px ${accentColor}`,
                                // Ajout d'une zone de clic plus grande
                                pointerEvents: isSeeking ? 'none' : 'auto' 
                            }}
                        ></div>
                    </div>
                    
                    {/* Boutons de Contrôle */}
                    <div className="flex items-center justify-between p-4 pt-2">
                        
                        {/* Gauche: Play/Pause, Temps, Volume */}
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={togglePlay}
                                className="p-2 rounded-full text-white hover:bg-white hover:bg-opacity-20 transition"
                                title={isPlaying ? "Pause (Espace)" : "Lecture (Espace)"}
                            >
                                {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
                            </button>
                            
                            <span 
                                onClick={() => setStyleDuration(inverseStyle(styleDuration))} 
                                className="text-white font-mono text-sm sm:text-base opacity-90 cursor-pointer select-none"
                                title="Cliquer pour basculer entre Temps Total et Temps Restant"
                            >
                                {formatTime(currentTime)}
                                {' '}
                                {styleDuration === 0 
                                    ? `/ ${formatTime(duration)}` // Mode Temps Total: 0:00 | 45:30
                                    : `- ${formatTime(duration - currentTime)}` // Mode Temps Restant: 0:00 - 45:30
                                }
                            </span>

                            {/* Contrôle de Volume */}
                            <div className="flex items-center space-x-2 group/volume">
                                <Volume2 size={20} className="text-white cursor-pointer" title="Volume" />
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    // La barre de volume est visible au hover sur le groupe
                                    className="w-16 h-1 cursor-pointer transition-all duration-200 sm:opacity-0 sm:group-hover/volume:opacity-100 sm:group-focus-within/volume:opacity-100"
                                    style={{ accentColor: accentColor }}
                                />
                            </div>
                        </div>

                        {/* Droite: Plein Écran */}
                        <div className="flex items-center space-x-4">
                             <button
                                onClick={toggleFullscreen}
                                className="p-2 rounded-full text-white hover:bg-white hover:bg-opacity-20 transition"
                                title={isFullScreen ? "Quitter le Plein Écran (F)" : "Plein Écran (F)"}
                            >
                                {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Note d'aide mise à jour */}
            <div className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} flex flex-wrap items-center space-x-2 p-2`}>
                <Zap size={14} className={isDark ? 'text-yellow-400' : accentColor} />
                <span>**Raccourcis Clavier :** **Espace** (Play/Pause), **F** (Plein écran), **Flèches Gauche/Droite** (Avancer/Reculer 5s), **Flèches Haut/Bas** (Volume).</span>
            </div>
        </div>
    );
};

export default VideoPlayerWithHeader;