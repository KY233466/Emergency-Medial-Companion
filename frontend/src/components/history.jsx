import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import './history.css';
import MedicalProfileCard from "./medicalProfile";

function History({ messages, onPlay, onPause, onResume, playingId, paused }) {
    const chatBoxRef = useRef(null);
    const audioRef = useRef(new Audio());
    const [currentId, setCurrentId] = useState(null);
    const inputContainerRef = useRef(null);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        const a = audioRef.current;
        return () => { a.pause(); }; // stop audio on unmount
    }, []);

    const [chatBoxHeight, setChatBoxHeight] = useState("100%");
    useEffect(() => {
        const adjustHeight = () => {
            if (inputContainerRef.current) {
                const inputHeight = inputContainerRef.current.offsetHeight;
                setChatBoxHeight(`calc(100% - ${inputHeight}px - 20px - 5px)`);
            }
        };
        adjustHeight();
        window.addEventListener("resize", adjustHeight);
        return () => {
            window.removeEventListener("resize", adjustHeight);
        };
    }, []);

    const handlePlay = (msg) => {
        if (!msg.audioUrl) return;
        const a = audioRef.current;

        // Toggle if clicking the same message that's already playing
        if (currentId === msg.id && !a.paused) {
            a.pause();
            a.currentTime = 0;
            setCurrentId(null);
            return;
        }

        a.pause();
        a.src = msg.audioUrl;
        a.currentTime = 0;
        a.play();
        setCurrentId(msg.id);
    };

    return (
        <div className="chat-container">
            <div
                className="chat-box"
                ref={chatBoxRef}
                style={{height: chatBoxHeight}}
            >
                {messages.map((msg, i) => {
                    if (msg.role === "card") {
                        return <MedicalProfileCard/>
                    }
                    const isUser = msg.role === 'user';
                    const isCurrent = !isUser && playingId === msg.id;
                    const isPlaying = isCurrent && !paused;
                    const canPlay = !isUser && !!msg.audioUrl;
                    const classes = ['message', isUser ? 'user' : 'bot'];
                    if (msg.type === 'error') classes.push('error');

                    const handleClick = () => {
                        if (!canPlay) return;
                        if (isCurrent) {
                            // toggle pause/resume
                            if (isPlaying) onPause();
                            else onResume();
                        } else {
                            onPlay(msg.audioUrl, msg.id);
                        }
                    };

                    return (
                        <div key={i} className={classes.join(' ')}>
                            <div className="bubble-row">
                                <div className="bubble-text">{msg.text}</div>

                                {canPlay && (
                                    // Toggle button
                                    <button
                                        className={`play-btn ${isPlaying ? 'playing' : ''}`}
                                        onClick={handleClick}
                                        title={isPlaying ? 'Pause' : (isCurrent && paused ? 'Resume' : 'Play')}
                                        aria-label={isPlaying ? 'Pause' : (isCurrent && paused ? 'Resume' : 'Play')}
                                    >
                                        {isPlaying ? '⏸ Stop' : '▶ Replay'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* hidden audio element */}
            <audio ref={audioRef} style={{display: 'none'}}/>
        </div>
    );
}

export default History;
