import React, { useEffect, useState } from 'react';
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


  const handleStopRecording = () => {
    stopRecording();
  };

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('transcription', (data) => {
      console.log('Transcription:', data.text);
      // Optionally update the UI to show the transcription
    });

    socket.on('response', (data) => {
      console.log('Response Text:', data.text);
      // Optionally update the UI to show the response text
    });

    socket.on('audio_url', (data) => {
      setAudioUrl(host + data.url)
      setAudioKey(Date.now()); // Update the key to force refresh
      console.log('Received audio URL:', host + data.url);
      // Handle playing the received audio URL here
    });

    return () => {
      socket.off('connect');
      socket.off('transcription');
      socket.off('response');
      socket.off('audio_url');
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      setAudioUrl('')
    }
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
      <div style={{flex: "1 1 auto",
        minHeight: 0,
        overflow: "hidden"}}>
        <History/>
      </div>
      <div style={{flexShrink: 0,
        display: "flex",
        gap: "12px",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px 0",
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
        {audioUrl && <audio key={audioKey} src={audioUrl} controls autoPlay />}
      </div>
    </div>
  );
}
