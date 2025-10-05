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

                    // Handle info messages with structured data
                    if (msg.role === 'info') {
                        return (
                            <div key={i} className="message info">
                                <div className="info-card">
                                    {msg.type === 'patient' && (
                                        <div>
                                            <h4>👤 Patient Info Extracted</h4>
                                            <p><strong>Name:</strong> {msg.data.name || 'N/A'}</p>
                                            <p><strong>Age:</strong> {msg.data.age || 'N/A'}</p>
                                            <p><strong>Injury:</strong> {msg.data.injury || 'N/A'}</p>
                                            {msg.data.allergies && <p><strong>Allergies:</strong> {msg.data.allergies}</p>}
                                        </div>
                                    )}
                                    {msg.type === 'database' && (
                                        <div>
                                            <h4>🗄️ Database Record Found</h4>
                                            <p><strong>Name:</strong> {msg.data.name}</p>
                                            <p><strong>Age:</strong> {msg.data.age}</p>
                                            <p><strong>Medical History:</strong> {msg.data.medical_history}</p>
                                            <p><strong>Allergies:</strong> {msg.data.allergies}</p>
                                        </div>
                                    )}
                                    {msg.type === 'knowledge' && (
                                        <div>
                                            <h4>📚 Knowledge Base Match</h4>
                                            {msg.data.results.map((r, idx) => (
                                                <div key={idx} style={{marginTop: '8px'}}>
                                                    <p><strong>Symptom:</strong> {r.symptom}</p>
                                                    <p><strong>Severity:</strong> <span style={{color: r.severity === 'Critical' ? '#EF4444' : '#F59E0B'}}>{r.severity}</span></p>
                                                    <p><strong>Conditions:</strong> {r.conditions.join(', ')}</p>
                                                    <p><strong>Treatment:</strong> {r.treatment}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {msg.type === 'hospitals' && (
                                        <div>
                                            <h4>🏥 Hospital Resources</h4>
                                            {msg.data.hospitals.slice(0, 3).map((h, idx) => (
                                                <div key={idx} style={{marginTop: '12px', borderTop: idx > 0 ? '1px solid #ddd' : 'none', paddingTop: '8px'}}>
                                                    <p><strong>{h.name}</strong></p>
                                                    <p style={{fontSize: '0.9em'}}>{h.address}</p>
                                                    <p><strong>Blood:</strong> {h.blood_plasma.length} types ({h.blood_plasma.map(b => `${b.type}: ${b.stock}`).join(', ')})</p>
                                                    <p><strong>Meds:</strong> {h.medications.slice(0, 2).map(m => m.name).join(', ')}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
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
