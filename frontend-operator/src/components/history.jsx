import React, { useState, useEffect, useRef } from "react";
import './history.css';
import MedicalProfileCard from "./medicalProfile";

function History({ messages, onPlay, onPause, onResume, playingId, paused, isFirstClick, setIsFirstClick }) {
    const chatBoxRef = useRef(null);
    const audioRef = useRef(new Audio());
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

    const PlayAudioBtn = ({ isPlaying, isCurrent, paused, onToggle }) => (
        <button
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={onToggle}
            title={isPlaying ? 'Pause' : (isCurrent && paused ? 'Resume' : 'Play')}
            aria-label={isPlaying ? 'Pause' : (isCurrent && paused ? 'Resume' : 'Play')}
        >
            {isFirstClick ? <div
                style={{
                    background: '#EF4444',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                }}
            >
                🔈 Tap to start
            </div> :
            isPlaying ? '⏸ Stop' : '▶ Replay'}
        </button>
    );

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
                    const isCurrent = !isUser && playingId === msg.id;
                    const isPlaying = isCurrent && !paused;

                    const handleClick = () => {
                        if (!canPlay) return;
                        if (isCurrent && isFirstClick) {
                            onPlay(msg.audioUrl, msg.id);
                        }
                        if (isCurrent) {
                            if (isPlaying) onPause();
                            else onResume();
                        } else {
                            onPlay(msg.audioUrl, msg.id);
                        }

                        setIsFirstClick(false);
                    };

                    if (msg.role === "card") {
                        return (
                            <MedicalProfileCard
                                key={i}
                                controls={
                                    canPlay ? (
                                        <PlayAudioBtn
                                            isPlaying={isPlaying}
                                            isCurrent={isCurrent}
                                            paused={paused}
                                            onToggle={handleClick}
                                        />
                                    ) : null
                                }
                            />
                        );
                    }

                    const classes = ['message', isUser ? 'user' : 'bot'];
                    if (msg.type === 'error') classes.push('error');

                    return (
                        <div key={i} className={classes.join(' ')}>
                            <div className="bubble-row">
                                <div className="bubble-text">{msg.text}</div>
                                {canPlay && (
                                    <PlayAudioBtn
                                        isPlaying={isPlaying}
                                        isCurrent={isCurrent}
                                        paused={paused}
                                        onToggle={handleClick}
                                    />
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
