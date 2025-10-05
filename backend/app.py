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
import re
import uuid
import sqlite3

load_dotenv()


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:3000"], cors_credentials=False)
app.config["SECRET_KEY"] = "secret!"

# Initialize Cerebras client
cerebras_client = OpenAI(
    api_key=os.getenv("CEREBRAS_API_KEY"),
    base_url=os.getenv("CEREBRAS_BASE_URL")
)

# Deepgram API configuration
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPGRAM_URL_STT = "https://api.deepgram.com/v1/listen"
DEEPGRAM_URL_TTS = "https://api.deepgram.com/v1/speak"

# Load medical knowledge base
with open("medical_knowledge_base_v2.json", "r", encoding="utf-8") as f:
    medical_kb = json.load(f)

@app.get("/healthz")
def healthz():
    return {"Yes": True}

@app.route("/audio/<filename>")
def serve_audio(filename):
    return send_from_directory("static/audio", filename)

def search_patient_database(name, age=None):
    """
    Search patient database for complete medical history and allergies
    """
    try:
        conn = sqlite3.connect('patients.db')
        cursor = conn.cursor()

        if age:
            cursor.execute(
                "SELECT name, age, medical_history, allergies FROM patients WHERE name = ? AND age = ?",
                (name, age)
            )
        else:
            cursor.execute(
                "SELECT name, age, medical_history, allergies FROM patients WHERE name = ?",
                (name,)
            )

        result = cursor.fetchone()
        conn.close()

        if result:
            return {
                "name": result[0],
                "age": result[1],
                "medical_history": result[2],
                "allergies": result[3]
            }
        return None
    except Exception as e:
        print(f"Database search error: {str(e)}")
        return None

def extract_patient_info(transcript):
    """
    使用正则表达式提取患者信息 (支持中英文)
    """
    info = {
        "name": None,
        "age": None,
        "injury": None,
        "pain_location": None,
        "pain_level": None,
        "allergies": None,
        "symptoms": []
    }

    # 提取姓名: 我叫XXX / My name is XXX / I am XXX / 患者名叫XXX
    name_patterns = [
        r'患者名叫([A-Za-z\u4e00-\u9fa5\s]+?)(?:[,，。\.]|$)',
        r'我叫([A-Za-z\u4e00-\u9fa5]+)',
        r'(?:my name is|I am|I\'m)\s+([A-Za-z\s]+?)(?:[,\.]|$)',
    ]
    for pattern in name_patterns:
        name_match = re.search(pattern, transcript, re.IGNORECASE)
        if name_match:
            info["name"] = name_match.group(1).strip()
            break

    # 提取年龄: XX岁 / XX years old / I am XX
    age_patterns = [
        r'(\d+)岁',
        r'(\d+)\s+years?\s+old',
        r'I am (\d+)',
    ]
    for pattern in age_patterns:
        age_match = re.search(pattern, transcript, re.IGNORECASE)
        if age_match:
            info["age"] = int(age_match.group(1))
            break

    # 提取受伤原因/症状: 中文
    injury_patterns_cn = [
        r'发生了?(车祸|交通事故)',
        r'从(.+?)摔下来',
        r'被(.+?)(撞|打|咬)',
        r'(摔|跌|撞)(?:倒|伤)',
        r'因为(.+?)(晕倒|昏倒|昏迷)',
        r'(高血压|低血压|糖尿病|心脏病)'
    ]
    for pattern in injury_patterns_cn:
        injury_match = re.search(pattern, transcript)
        if injury_match:
            info["injury"] = injury_match.group(0)
            break

    # 提取受伤原因/症状: 英文
    if not info["injury"]:
        injury_patterns_en = [
            r'(car accident|traffic accident|motor vehicle accident)',
            r'(fell|fainted|collapsed|injured|hit|cut|burned|broke)',
            r'because of\s+(.+?)(?:\.|,|$)',
            r'(high blood pressure|low blood pressure|diabetes|heart attack|stroke)',
        ]
        for pattern in injury_patterns_en:
            injury_match = re.search(pattern, transcript, re.IGNORECASE)
            if injury_match:
                info["injury"] = injury_match.group(0)
                break

    # 提取疼痛部位: 中文
    pain_patterns_cn = [
        r'([\u4e00-\u9fa5]+?)(很|特别|非常)?(痛|疼)',
        r'(头|脚|手|腿|腰|背|胸|腹|肚子|脖子|颈|膝盖|脚踝|脚腕|手腕|肩膀|关节).*?(痛|疼)'
    ]
    for pattern in pain_patterns_cn:
        pain_match = re.search(pattern, transcript)
        if pain_match:
            info["pain_location"] = pain_match.group(1)
            break

    # 提取疼痛部位: 英文
    if not info["pain_location"]:
        pain_patterns_en = [
            r'(head|chest|stomach|abdomen|back|neck|shoulder|arm|leg|knee|ankle|wrist|foot|hand)\s+(?:pain|hurt|ache)',
            r'pain in (?:my|the)\s+([a-z]+)',
        ]
        for pattern in pain_patterns_en:
            pain_match = re.search(pattern, transcript, re.IGNORECASE)
            if pain_match:
                info["pain_location"] = pain_match.group(1)
                break

    # 提取疼痛等级: 疼痛等级是X / pain level X
    pain_level_patterns = [
        r'疼痛等级.*?(\d+)',
        r'pain level.*?(\d+)',
    ]
    for pattern in pain_level_patterns:
        pain_level_match = re.search(pattern, transcript, re.IGNORECASE)
        if pain_level_match:
            info["pain_level"] = int(pain_level_match.group(1))
            break

    # 提取过敏信息: 对XXX过敏 / allergic to XXX
    allergy_patterns = [
        r'对(.+?)过敏',
        r'allergic to\s+([a-z\s]+)',
    ]
    for pattern in allergy_patterns:
        allergy_match = re.search(pattern, transcript, re.IGNORECASE)
        if allergy_match:
            info["allergies"] = allergy_match.group(1).strip()
            break

    # 提取症状关键词
    symptom_keywords = [
        r'(晕倒|昏倒|昏迷|fainted|collapsed|unconscious)',
        r'(高血压|low blood pressure|high blood pressure|hypertension)',
        r'(呼吸困难|difficulty breathing|shortness of breath)',
        r'(出血|bleeding)',
        r'(骨折|broken bone|fracture)',
    ]
    for pattern in symptom_keywords:
        if re.search(pattern, transcript, re.IGNORECASE):
            info["symptoms"].append(re.search(pattern, transcript, re.IGNORECASE).group(0))

    return info

def search_medical_knowledge(patient_info):
    """
    在医疗知识库中搜索相关病症 (支持中英文)
    """
    results = []
    search_text = ""

    # 收集所有可能的症状信息
    if patient_info.get("pain_location"):
        search_text += " " + patient_info["pain_location"]
    if patient_info.get("injury"):
        search_text += " " + patient_info["injury"]
    if patient_info.get("symptoms"):
        search_text += " " + " ".join(patient_info["symptoms"])

    search_text = search_text.lower()

    # 症状关键词映射（中英文到知识库症状）
    symptom_mapping = {
        # 车祸相关
        "车祸": "car accident",
        "交通事故": "car accident",
        "car accident": "car accident",
        "traffic accident": "car accident",
        "motor vehicle accident": "car accident",

        # 中文映射
        "脚踝": "sprained ankle",
        "脚腕": "sprained ankle",
        "ankle": "sprained ankle",

        "晕倒": "unconsciousness",
        "昏倒": "unconsciousness",
        "昏迷": "unconsciousness",
        "fainted": "unconsciousness",
        "collapsed": "unconsciousness",
        "unconscious": "unconsciousness",

        "高血压": "unconsciousness",  # 高血压可能导致昏迷
        "hypertension": "unconsciousness",
        "high blood pressure": "unconsciousness",

        "胸": "chest pain",
        "chest": "chest pain",

        "呼吸困难": "difficulty breathing",
        "difficulty breathing": "difficulty breathing",
        "shortness of breath": "difficulty breathing",

        "出血": "severe bleeding",
        "bleeding": "severe bleeding",

        "腹": "severe abdominal pain",
        "stomach": "severe abdominal pain",
        "abdomen": "severe abdominal pain",

        "发烧": "high fever",
        "fever": "high fever",

        "骨折": "broken bone",
        "broken": "broken bone",
        "fracture": "broken bone",

        "过敏": "allergic reaction",
        "allergic": "allergic reaction",
        "allergy": "allergic reaction"
    }

    # 查找匹配的症状
    matched_symptoms = set()
    for keyword, symptom_en in symptom_mapping.items():
        if keyword.lower() in search_text:
            matched_symptoms.add(symptom_en)

    # 从知识库中查找匹配的条目
    for symptom in matched_symptoms:
        for entry in medical_kb:
            if symptom.lower() == entry["symptom"].lower():
                if entry not in results:  # 避免重复
                    results.append(entry)

    return results

@socketio.on("audio_data")
def handle_audio(data):
    try:
        sid = request.sid
        req_id = str(uuid.uuid4())
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
            print(f"Text: {transcript!r}")

            if not transcript or not transcript.strip():
                emit("no_transcription", {
                    "req_id": req_id,
                    # optional server message if you want:
                    "message": "No speech was detected in the recording."
                }, to=sid)
                return
            else:
                emit("transcription", {"text": transcript, "req_id": req_id}, to=sid)

            # 提取患者信息
            patient_info = extract_patient_info(transcript)
            print(f"提取的患者信息: {patient_info}")

            # 搜索患者数据库
            db_patient = None
            if patient_info["name"]:
                db_patient = search_patient_database(patient_info["name"], patient_info.get("age"))
                if db_patient:
                    print(f"数据库找到患者: {db_patient['name']}")
                    emit("database_patient_found", {**db_patient, "req_id": req_id}, to=sid)
                    # 如果数据库中有更完整的信息，更新patient_info
                    if not patient_info["age"] and db_patient["age"]:
                        patient_info["age"] = db_patient["age"]
                    if not patient_info["allergies"] and db_patient["allergies"]:
                        patient_info["allergies"] = db_patient["allergies"]
            else:
                # 如果没有提取到姓名，使用默认患者 John Smith
                print("未提取到患者姓名，使用默认患者: John Smith")
                db_patient = search_patient_database("John Smith")
                if db_patient:
                    print(f"数据库找到默认患者: {db_patient['name']}")
                    emit("database_patient_found", {**db_patient, "req_id": req_id}, to=sid)
                    # 使用默认患者信息
                    patient_info["name"] = db_patient["name"]
                    patient_info["age"] = db_patient["age"]
                    patient_info["allergies"] = db_patient["allergies"]

            emit("patient_info", {**patient_info, "req_id": req_id}, to=sid)

            # 搜索医疗知识库
            knowledge_results = search_medical_knowledge(patient_info)
            print(f"知识库搜索结果: {knowledge_results}")
            if knowledge_results:
                emit("knowledge_base_results", {"results": knowledge_results, "req_id": req_id}, to=sid)

            # Build enhanced prompt
            enhanced_prompt = f"Patient Information: {transcript}\n\n"
            if patient_info["name"]:
                enhanced_prompt += f"Name: {patient_info['name']}\n"
            if patient_info["age"]:
                enhanced_prompt += f"Age: {patient_info['age']} years old\n"
            if patient_info["injury"]:
                enhanced_prompt += f"Injury/Condition: {patient_info['injury']}\n"
            if patient_info["pain_location"]:
                enhanced_prompt += f"Pain Location: {patient_info['pain_location']}\n"
            if patient_info["pain_level"]:
                enhanced_prompt += f"Pain Level: {patient_info['pain_level']}/10\n"
            if patient_info["allergies"]:
                enhanced_prompt += f"Allergies: {patient_info['allergies']}\n"

            # 添加数据库中的完整病史信息
            if db_patient:
                enhanced_prompt += f"\nPatient Medical History from Database:\n"
                enhanced_prompt += f"- Complete Medical History: {db_patient['medical_history']}\n"
                enhanced_prompt += f"- Known Allergies: {db_patient['allergies']}\n"

            if knowledge_results:
                enhanced_prompt += f"\nMedical Knowledge Base Match Results:\n"
                for result in knowledge_results:
                    enhanced_prompt += f"- Symptom: {result['symptom']}\n"
                    enhanced_prompt += f"  Severity: {result['severity']}\n"
                    enhanced_prompt += f"  Possible Conditions: {', '.join(result['conditions'])}\n"
                    enhanced_prompt += f"  Recommended Treatment: {result['treatment']}\n"

            enhanced_prompt += "\nPlease provide professional medical advice based on the above information."

            # Get response from Cerebras
            llm_response = get_response(enhanced_prompt)
            emit("response", {"text": llm_response, "req_id": req_id}, to=sid)

            # Generate audio using Deepgram TTS
            audio_filename = datetime.now().strftime("%Y%m%d_%H%M%S") + ".mp3"
            audio_url = synthesize_audio(llm_response, audio_filename)
            emit("audio_url", {"url": audio_url, "req_id": req_id}, to=sid)
        else:
            print(f"Deepgram STT error: {response.status_code} - {response.text}")

    except Exception as e:
        print("An error occurred: ", str(e))


def get_response(prompt):
    """
    Generate medical advice using Cerebras API
    """
    system_prompt = """You are a professional medical assistant. Based on the provided patient information and medical knowledge base data, provide professional and accurate medical advice.

Requirements:
1. Provide recommendations based on patient symptoms and knowledge base matching results
2. If patient has allergy information, you MUST avoid recommending related medications
3. Give appropriate urgency recommendations based on symptom severity (Critical/Moderate/Stable)
4. Keep it concise and professional, 3-5 sentences
5. If the situation is Critical, recommend immediate medical attention or emergency services
6. Respond in the same language as the patient's input (Chinese or English)"""

    completion = cerebras_client.chat.completions.create(
        model="llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=500
    )

    response = completion.choices[0].message.content
    print(f"\nLLM Response: {response}\n")

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


@socketio.on("tts_text")
def handle_tts_text(payload):
    """
    Synthesize arbitrary text to speech using the same Deepgram voice as normal responses.
    Expects: {"text": "...", "req_id": "optional-id"}
    Emits:
      - "audio_url": {"url": "...", "req_id": "..."} on success
      - "tts_error": {"message": "...", "req_id": "..."} on failure
    """
    try:
        sid = request.sid
        text = (payload or {}).get("text", "")
        req_id = (payload or {}).get("req_id") or str(uuid.uuid4())

        if not text or not text.strip():
            emit("tts_error", {"req_id": req_id, "message": "No text provided for TTS."}, to=sid)
            return

        # Use the same TTS voice/model as in synthesize_audio (aura-asteria-en)
        audio_filename = datetime.now().strftime("%Y%m%d_%H%M%S") + ".mp3"
        audio_url = synthesize_audio(text, audio_filename)

        if audio_url:
            emit("audio_url", {"url": audio_url, "req_id": req_id}, to=sid)
        else:
            emit("tts_error", {"req_id": req_id, "message": "TTS synthesis failed."}, to=sid)
    except Exception as e:
        emit("tts_error", {"req_id": (payload or {}).get("req_id"), "message": str(e)}, to=request.sid)


@socketio.on("connect")
def test_connect():
    print("Client connected.")


@socketio.on("disconnect")
def test_disconnect():
    print("Client disconnected.")


if __name__ == "__main__":
    socketio.run(app, host="127.0.0.1", port=5000, debug=True, allow_unsafe_werkzeug=True)
