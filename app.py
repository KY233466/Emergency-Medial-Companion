from flask import Flask, request, jsonify
from flask import send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from openai import OpenAI
from dotenv import load_dotenv
from io import BytesIO
import os
import requests
import json
from datetime import datetime

load_dotenv()


app = Flask(__name__)
CORS(app)
app.config["SECRET_KEY"] = "secret!"
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize Cerebras client
cerebras_client = OpenAI(
    api_key=os.getenv("CEREBRAS_API_KEY"),
    base_url=os.getenv("CEREBRAS_BASE_URL")
)

# Deepgram API configuration
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPGRAM_URL_STT = "https://api.deepgram.com/v1/listen"
DEEPGRAM_URL_TTS = "https://api.deepgram.com/v1/speak"


@app.route("/audio/<filename>")
def serve_audio(filename):
    return send_from_directory("static/audio", filename)


@socketio.on("audio_data")
def handle_audio(data):
    try:
        print(type(data))

        # Use Deepgram REST API for transcription
        headers = {
            "Authorization": f"Token {DEEPGRAM_API_KEY}",
            "Content-Type": "audio/webm"
        }

        params = {
            "model": "nova-2",
            "smart_format": "true"
        }

        # Transcribe audio using Deepgram REST API
        response = requests.post(
            DEEPGRAM_URL_STT,
            headers=headers,
            params=params,
            data=data
        )

        if response.status_code == 200:
            result = response.json()
            transcript = result["results"]["channels"][0]["alternatives"][0]["transcript"]
            print(f"Text: {transcript}")
            emit("transcription", {"text": transcript})

            # Get response from Cerebras
            llm_response = get_response(transcript)
            emit("response", {"text": llm_response})

            # Generate audio using Deepgram TTS
            audio_filename = datetime.now().strftime("%Y%m%d_%H%M%S") + ".mp3"
            audio_url = synthesize_audio(llm_response, audio_filename)
            emit("audio_url", {"url": audio_url})
        else:
            print(f"Deepgram STT error: {response.status_code} - {response.text}")

    except Exception as e:
        print("An error occurred: ", str(e))


def get_response(prompt):
    completion = cerebras_client.chat.completions.create(
        model=os.getenv("CEREBRAS_MODEL", "llama-4-Scout"),
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant. Be extremely concise.",
            },
            {"role": "user", "content": prompt},
        ],
    )

    response = completion.choices[0].message.content
    print(response)

    return response


def synthesize_audio(text, audio_filename):
    try:
        # Configure Deepgram TTS using REST API
        headers = {
            "Authorization": f"Token {DEEPGRAM_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "text": text
        }

        params = {
            "model": "aura-asteria-en",
            "encoding": "mp3"
        }

        # Generate speech using Deepgram REST API
        response = requests.post(
            DEEPGRAM_URL_TTS,
            headers=headers,
            params=params,
            json=payload
        )

        if response.status_code == 200:
            # Save to static/audio directory
            audio_url = os.path.join("static", "audio", audio_filename)

            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(audio_url), exist_ok=True)

            # Save the audio content
            with open(audio_url, "wb") as audio_file:
                audio_file.write(response.content)

            print(f"Audio saved to: {audio_url}")
            return audio_url
        else:
            print(f"Deepgram TTS error: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        print(f"Error in TTS: {str(e)}")
        return None


@socketio.on("connect")
def test_connect():
    print("Client connected.")


@socketio.on("disconnect")
def test_disconnect():
    print("Client disconnected.")


if __name__ == "__main__":
    app.run(debug=True)
