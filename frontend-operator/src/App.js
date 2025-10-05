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

  const [messages, setMessages] = useState([{role: "bot", text : "I have access to the databases of nearby hospital to help you decide which hospital to send the patient to. Please hit record to talk about patient symptoms."}]);

  // ONE shared audio element
  const playerRef = useRef(new Audio());
  const [playingId, setPlayingId] = useState("card-1");
  const [paused, setPaused] = useState(true);

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
    if (a.paused) a.play().catch(() => {})
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

    socket.on('patient_info', (data) => {
      console.log('Patient Info:', data);
      setMessages(prev => [...prev, { id: `${data.req_id}:patient`, role: 'info', type: 'patient', data }]);
    });

    socket.on('database_patient_found', (data) => {
      console.log('Database Patient Found:', data);
      setMessages(prev => [...prev, { id: `${data.req_id}:db`, role: 'info', type: 'database', data }]);
    });

    socket.on('knowledge_base_results', (data) => {
      console.log('Knowledge Base Results:', data);
      setMessages(prev => [...prev, { id: `${data.req_id}:kb`, role: 'info', type: 'knowledge', data }]);
    });

    socket.on('hospital_resources', (data) => {
      console.log('Hospital Resources:', data);
      setMessages(prev => [...prev, { id: `${data.req_id}:hosp`, role: 'info', type: 'hospitals', data }]);
    });

    socket.on('operator_recommendation', (data) => {
      setMessages(prev => [...prev, { id: data.req_id, role: 'bot', text: data.text, audioUrl: null }]);
      console.log('Operator Recommendation:', data.text);
    });

    socket.on('response', (data) => {
      setMessages(prev => [...prev, { id: data.req_id, role: 'bot', text: data.text, audioUrl: null }]);
      console.log('Response Text:', data.text);
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
      socket.off('patient_info');
      socket.off('database_patient_found');
      socket.off('knowledge_base_results');
      socket.off('hospital_resources');
      socket.off('operator_recommendation');
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
      <div style={{flex: "1 1 auto",
        width: '100%',
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
            sx={(theme) => ({
              margin: "10px",
              padding: '10px',
              fontSize: '40px',
              height: 'auto',
              width: 'auto',
              '&.Mui-disabled': {
                color: theme.palette.action.disabled,   // make the icon/button gray
              },
            })}
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
