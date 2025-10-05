import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import IconButton from '@mui/material/IconButton';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import { useAudioRecorder } from 'react-audio-voice-recorder';
import { io } from "socket.io-client";
import History from "./components/history";

import "./App.css";

const host = 'http://localhost:5000/'
const socket = io(host)

export default function App() {
  const {
    startRecording,
    stopRecording,
    recordingBlob,
    isRecording
  } = useAudioRecorder();

  const [messages, setMessages] = useState(
      [{"role": "card"},
        {"role": "bot", "text" : "I am equipped with his medical history and the ability to search the web for medial related knowledge. Please hit record to ask your question."},
      ]);
  const pendingPlayRef = useRef(null);        // stores { url, id } to play after user gesture
  const [showTapToPlay, setShowTapToPlay] = useState(false); // small prompt when autoplay is blocked

  useEffect(() => {
    const INTRO_ID = 'intro-audio';
    const INTRO_URL = `${host}static/audio/20251004_202134.mp3`; // served by Flask
    // Don't call play() yet—queue it to avoid NotAllowedError
    pendingPlayRef.current = { url: INTRO_URL, id: INTRO_ID };
    setShowTapToPlay(true);
  }, []);

  // Trigger any pending audio playback (used by first tap/click)
  const enableAudioNow = () => {
    if (pendingPlayRef.current) {
      const { url, id } = pendingPlayRef.current;
      pendingPlayRef.current = null;
      playAudio(url, id);
    }
    setShowTapToPlay(false);
  };

  useEffect(() => {
    const once = () => {
      enableAudioNow();
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('touchstart', once);
      window.removeEventListener('keydown', once);
    };
    window.addEventListener('pointerdown', once, { once: true });
    window.addEventListener('touchstart', once, { once: true });
    window.addEventListener('keydown', once, { once: true });
    return () => {
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('touchstart', once);
      window.removeEventListener('keydown', once);
    };
  }, []);

  // ONE shared audio element
  const playerRef = useRef(new Audio());
  const [playingId, setPlayingId] = useState(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const a = playerRef.current;
    const onEnded = () => { setPlayingId(null); setPaused(false); };
    const onPause = () => setPaused(true);
    const onPlay = () => setPaused(false);

    a.addEventListener('ended', onEnded);
    a.addEventListener('pause', onPause);
    a.addEventListener('play', onPlay);
    return () => {
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('play', onPlay);
    };
  }, []);

  const playAudio = async (url, id = null) => {
    const a = playerRef.current;
    try {
      a.pause();
      a.src = url;
      a.currentTime = 0;
      await a.play();
      if (id) setPlayingId(id);
      setPaused(false);
    } catch (err) {
      if (err && (err.name === 'NotAllowedError' || err.code === 0)) {
        // Queue for replay after first user interaction
        pendingPlayRef.current = { url, id };
        setShowTapToPlay(true);
        console.warn('Autoplay blocked; waiting for user gesture.');
      } else {
        console.warn('Play failed:', err);
      }
    }
  };

  const pauseAudio = () => {
    const a = playerRef.current;
    if (!a.paused) a.pause(); // `paused` will flip via event listener
  };

  const resumeAudio = () => {
    const a = playerRef.current;
    if (a.paused) a.play().catch(() => {});
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('transcription', (data) => {
      console.log('Transcription:', data.text);
      setMessages(prev => [...prev, { id: `${data.req_id}:t`, role: 'user', text: data.text }]);
      // Optionally update the UI to show the transcription
    });

    socket.on('no_transcription', (data) => {
      const politeMsg = "No speech was detected in the recording. Please try again from a quieter location or move closer to the microphone.";
      setMessages(prev => [
        ...prev,
        { id: `${data.req_id}:e`, role: 'user', type: 'error', text: politeMsg }
      ]);
    });

    socket.on('response', (data) => {
      setMessages(prev => [...prev, { id: data.req_id, role: 'bot', text: data.text, audioUrl: null }]);
      console.log('Response Text:', data.text);
      // Optionally update the UI to show the response text
    });

    socket.on('audio_url', (data) => {
      const full = host + data.url;
      setMessages(prev => prev.map(m => m.id === data.req_id ? { ...m, audioUrl: full } : m));
      // AUTOPLAY right away
      playAudio(full, data.req_id);
      console.log('Received audio URL:', host + data.url);
      // Handle playing the received audio URL here
    });

    return () => {
      socket.off('connect');
      socket.off('transcription');
      socket.off('no_transcription');
      socket.off('response');
      socket.off('audio_url');
    };
  }, []);

  useEffect(() => {
    axios.get(host + 'healthz').then(r => console.log('Is backend reached:', r.data));
  }, []);

  useEffect(() => {
    if (recordingBlob) {
      console.log('Sending audio blob to the server', recordingBlob);
      const reader = new FileReader();
      reader.onload = function (event) {
        const arrayBuffer = event.target.result;
        socket.emit('audio_data', arrayBuffer)
      };

      reader.readAsArrayBuffer(recordingBlob);
    }
  }, [recordingBlob]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {showTapToPlay && (
        <div
          onClick={enableAudioNow}
          style={{
            position: 'fixed',
            bottom: 76,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: '#1f2937',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          🔈 Tap to enable audio
        </div>
      )}
      <div style={{flex: "1 1 auto",
        minHeight: 0,
        overflow: "hidden"}}>
        <History
            messages={messages}
            playingId={playingId}
            paused={paused}
            onPlay={(url,id)=>playAudio(url,id)}
            onPause={pauseAudio}
            onResume={resumeAudio}/>
        </div>
      <div style={{
        width: '100%',
        border: '1px solid #EFF0F2',
        flexShrink: 0,
        display: "flex",
        gap: "12px",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <IconButton
            sx={{
              margin: "10px",
              padding: '10px',
              fontSize: '40px',
              height: 'auto',
              width: 'auto',
            }}
            color="primary"
            onClick={isRecording ? handleStopRecording : startRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <StopIcon sx={{ fontSize: '5rem' }} /> : <MicIcon sx={{ fontSize: '5rem' }} />}
        </IconButton>
      </div>
    </div>
  );
}
