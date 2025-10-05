# Emergency Medical Companion

An AI-powered emergency response system providing real-time voice-based medical guidance and hospital resource allocation for bystanders and 911 operators during critical situations.

## 🌟 Features

### For Bystanders (User Interface, Port 3000)
- **Voice-to-Text**: Record patient symptoms via microphone using Deepgram STT
- **AI Medical Advice**: Instant triage and guidance from Cerebras LLaMA-4 LLM
- **Text-to-Speech**: Audio playback of medical advice via Deepgram TTS
- **Patient Info Extraction**: Automatically extracts name, age, injuries, and pain level
- **Medical Knowledge Base**: RAG-based symptom matching with severity assessment
- **Patient Database**: Automatic lookup of medical history and allergies

### For 911 Operators (Operator Interface, Port 3001)
- **Real-time Monitoring**: WebSocket broadcasts all bystander interactions from port 3000
- **Hospital Resource Management**: View nearby hospitals with real-time inventories
- **Blood Plasma Inventory**: Track blood types and stock levels across hospitals
- **Medication Inventory**: Monitor trauma-specific medications with stock quantities
- **Smart Recommendations**: LLM suggests optimal hospital based on condition and resources
- **Independent Recording**: Operators can record their own queries

## 🏗️ Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│   User (3000)   │ ←─────────────────→│                  │
│   Bystander     │                     │  Flask Backend   │
└─────────────────┘                     │   (Port 5000)    │
                                        │                  │
┌─────────────────┐     WebSocket      │  • Broadcasting  │
│ Operator (3001) │ ←─────────────────→│  • Client Track  │
│  911 Dispatch   │                     │  • RAG Search    │
└─────────────────┘                     └──────────────────┘
                                               ↓
                                        ┌──────────────────┐
                                        │   External APIs  │
                                        │ • Deepgram STT   │
                                        │ • Deepgram TTS   │
                                        │ • Cerebras LLM   │
                                        └──────────────────┘
                                               ↓
                                        ┌──────────────────┐
                                        │   SQLite DBs     │
                                        │ • patients.db    │
                                        │ • hospitals.db   │
                                        │ • blood_plasma.db│
                                        │ • medications.db │
                                        │ • knowledge_base │
                                        └──────────────────┘
```

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 14+
- npm or yarn

### Environment Variables
Create a `.env` file in the `backend` directory:
```env
DEEPGRAM_API_KEY=your_deepgram_api_key
CEREBRAS_API_KEY=your_cerebras_api_key
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KY233466/Emergency-Medical-Companion.git
   cd Emergency-Medical-Companion
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Install user frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

4. **Install operator frontend dependencies**
   ```bash
   cd frontend-operator
   npm install
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   python app.py
   ```
   Backend runs on `http://localhost:5000`

2. **Start the user frontend**
   ```bash
   cd frontend
   npm start
   ```
   User interface runs on `http://localhost:3000`

3. **Start the operator frontend**
   ```bash
   cd frontend-operator
   npm start
   ```
   Operator interface runs on `http://localhost:3001`

## 📊 Database Schema

### Patients Database (`patients.db`)
- **id**: INTEGER, Primary Key
- **name**: TEXT, Patient name
- **age**: INTEGER, Patient age
- **medical_history**: TEXT, Complete medical history
- **allergies**: TEXT, Known allergies

### Hospitals Database (`hospitals.db`)
- **id**: INTEGER, Primary Key
- **name**: TEXT, Hospital name
- **address**: TEXT, Full address
- **latitude**: REAL, GPS coordinate
- **longitude**: REAL, GPS coordinate

### Blood Plasma Database (`blood_plasma.db`)
- **id**: INTEGER, Primary Key
- **hospital_id**: INTEGER, Foreign Key
- **blood_type**: TEXT (O-, A+, AB+, etc.)
- **volume**: REAL, Volume in liters
- **usage**: TEXT, Usage description
- **stock_quantity**: INTEGER, Units available
- **expiration_date**: TEXT, Expiration date

### Medications Database (`medications.db`)
- **id**: INTEGER, Primary Key
- **hospital_id**: INTEGER, Foreign Key
- **name**: TEXT, Medication name
- **type**: TEXT, Medication type
- **dosage**: TEXT, Dosage information
- **usage**: TEXT, Usage description
- **stock_quantity**: INTEGER, Units available
- **expiration_date**: TEXT, Expiration date

### Medical Knowledge Base (`medical_knowledge_base_v2.json`)
- **symptom**: Symptom description
- **severity**: Critical/Moderate/Stable
- **conditions**: Possible medical conditions
- **treatment**: Recommended treatments

## 🔧 Technology Stack

### Backend
- **Flask**: Web framework
- **Flask-SocketIO**: Real-time WebSocket communication
- **Flask-CORS**: Cross-origin resource sharing
- **Deepgram API**: Speech-to-Text and Text-to-Speech
- **Cerebras API**: LLaMA-4-Scout-17B LLM for medical advice
- **SQLite**: Database management
- **Python Regex**: Bilingual patient info extraction

### Frontend
- **React**: UI framework
- **Socket.IO Client**: Real-time communication
- **Material-UI**: UI components
- **react-audio-voice-recorder**: Audio recording
- **Axios**: HTTP requests

## 🎯 Key Workflows

### User Workflow (Port 3000)
1. Bystander records patient symptoms via microphone
2. Audio sent to backend via WebSocket
3. Deepgram transcribes audio to text
4. System extracts patient information using regex
5. Patient database searched for medical history
6. Medical knowledge base queried for symptom matches
7. Cerebras LLM generates medical advice
8. Deepgram converts advice to audio
9. Response and audio sent back to user

### Operator Workflow (Port 3001)
1. Receives real-time broadcast of all port 3000 interactions
2. System queries hospital databases for resource availability
3. LLM recommends optimal hospital based on patient condition and resources
4. Operator can independently record queries
5. Displays patient info, database records, knowledge base matches, and hospital resources

### Broadcasting System
- Backend tracks connected clients by origin port (3000 vs 3001)
- All port 3000 events broadcast to all port 3001 operator clients
- Events include: transcription, patient info, database records, knowledge base results, responses, and audio URLs
- Port 3001 recordings are NOT broadcast back to port 3000

## 📝 API Endpoints

### WebSocket Events

**Client → Server:**
- `audio_data`: Recorded audio blob

**Server → Client:**
- `transcription`: Transcribed text from audio
- `no_transcription`: Error when no speech detected
- `patient_info`: Extracted patient information
- `database_patient_found`: Patient record from database
- `knowledge_base_results`: Medical knowledge base matches
- `hospital_resources`: Hospital inventory (operators only)
- `response`: LLM medical advice (users only)
- `operator_recommendation`: Hospital recommendation (operators only)
- `audio_url`: TTS audio file URL

### HTTP Endpoints
- `GET /healthz`: Health check endpoint
- `GET /audio/<filename>`: Serve generated audio files

## 🔐 Security Notes
- CORS restricted to `localhost:3000` and `localhost:3001`
- No authentication implemented (development only)
- Sensitive medical data should be encrypted in production
- API keys stored in `.env` file

## 🤝 Contributing
Contributions are welcome! Fork the repo and submit PRs with features like:
- Multilingual transcription support
- Real-time GPS integration
- Advanced triage algorithms
- EMS dispatch system integration

## ⚠️ Disclaimer
**This is an educational/demo project. NOT intended for actual medical use. Always call 911 or consult qualified healthcare professionals for emergencies.**

## 📄 License
MIT License

## 🙏 Acknowledgments
- **Deepgram**: Speech-to-Text and Text-to-Speech APIs
- **Cerebras**: LLaMA-4 inference for medical advice generation
- **OpenAI**: API client library structure

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
