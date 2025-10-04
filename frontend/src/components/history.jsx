import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import './history.css';

function History({messages, onPlay, playingId}) {
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
                    const isUser = msg.role === 'user';
                    const canPlay = !isUser && !!msg.audioUrl;
                    const isPlaying = !isUser && playingId === msg.id;
                    return (
                        <div key={i} className={`message ${isUser ? 'user' : 'bot'}`}>
                            <div className="bubble-row">
                                <div className="bubble-text">{msg.text}</div>
                                {canPlay && (
                                    <button
                                        className={`play-btn ${isPlaying ? 'playing' : ''}`}
                                        onClick={() => onPlay(msg.audioUrl, msg.id)}
                                        title={isPlaying ? 'Replaying…' : 'Play reply'}
                                    >
                                        ▶ Replay Audio
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
