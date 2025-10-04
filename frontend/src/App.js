import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import IconButton from '@mui/material/IconButton';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import { useAudioRecorder } from 'react-audio-voice-recorder';
import { io } from "socket.io-client";
import History from "./components/history";

const host = 'http://localhost:5000/'
const socket = io(host)

export default function App() {
  const {
    startRecording,
    stopRecording,
    recordingBlob,
    isRecording
  } = useAudioRecorder();

  const [audioUrl, setAudioUrl] = useState('');
  const [audioKey, setAudioKey] = useState(Date.now()); // for updating the audio key
  const [messages, setMessages] = useState([{"role": "bot", "text" : "Hi, I am a medical emergency companion. I am equipped with the medical of this person and ability to search the web for medial related knowledge. Please hit record to ask your question."}]);

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

  const playAudio = (url, id = null) => {
    const a = playerRef.current;
    try {
      a.pause();
      a.src = url;
      a.currentTime = 0;
      a.play()
          .then(() => { if (id) setPlayingId(id); setPaused(false); })
          .catch(err => console.warn('Autoplay blocked or failed:', err));
    } catch (e) { console.error(e); }
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
      setAudioUrl(full);
      setAudioKey(Date.now());
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
    if (isRecording) setAudioUrl('')
  }, [isRecording])

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
      <div style={{
        width: '100%',
        backgroundColor: "#013366",
        padding: '15px',
        fontWeight: 'bold',
        marginLeft: '30px',
      }}>
        Medical Emergency Companion
      </div>
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
