import json

chapters_dict = {
    "हिंदी": [
        "वर्णमाला", "स्वर", "व्यंजन", "विसर्ग", "समास", "संज्ञा", "सर्वनाम", "क्रिया", "वाक्य", "लिंग एवं वचन", "उपसर्ग - प्रत्यय", "तत्सम - तद्भव , देशज - विदेशज", "मुहावरे एवं लोकोक्तियां", "विराम चिन्हों की पहचान एवं उपयोग", "पर्यायवाची एवं विलोम शब्द", "अलंकार", "वाच्य", "अपठित गद्यांश", "साहित्य"
    ],
    "राजनीति विज्ञान": [
        "Democracy लोकतंत्र", "Indian constitution भारतीय संविधान", "GOVERNMENT STRUCTURE सरकारी ढांचा", "Rural and urban self governance ग्रामीण और शहरी स्वशासन", "Centre state relation केंद्र राज्य संबंध", "Important Articles महत्वपूर्ण अनुच्छेद", "Media + Gender मीडिया + लिंग", "District administration जिला प्रशासन", "National security and foreign policy", "Traffic safety", "Global ocean and India", "Civil defence"
    ],
    "इतिहास": [
        "Sources of historical knowledge", "Stone Age Culture", "Chalcolithic Culture", "Vedic Culture", "India in the 6th Century BC", "Early States of India", "Mauryan Empire", "Post-Mauryan India", "Gupta Period", "Rajput Period", "Pushyabhuti Dynasty", "Kingdoms of South India", "Arrival of Islam in India", "Delhi Sultanate", "Mughal Empire"
    ],
    "अर्थशास्त्र": [
        "Introduction परिचय", "Currency मुद्रा", "World Financial Institutions", "Introduction to Economics", "Demand and Supply मांग और आपूर्ति", "National Income राष्ट्रीय आय", "Five-Year Plans and NITI Aayog", "Development of Indian Agriculture", "Budget and its Types", "Indian Financial Market", "Functions of RBI"
    ],
    "भूगोल": [
        "Our Solar System हमारा सौर मंडल", "Globe ग्लोब", "The Earth and its Movements", "Spheres of the Earth", "Landforms of the Earth", "Maps + Directions", "Water Bodies of India", "Natural Vegetation of the World", "Wildlife of India", "Our State Uttar Pradesh", "Environment पर्यावरण", "Inside Our Earth", "Rocks and Minerals", "The Changing Earth", "Air + Water"
    ],
    "बाल विकास": [
        "Growth and Development विकास और वृद्धि", "Heredity and Environment", "Socialization and Gender", "Bloom’s Taxonomy AND NCF", "Motivation and learning", "Learning disability and RPWD", "NEP एनईपी", "Teaching Learning Materials", "Teaching Methods", "Jean Piaget", "Lev Vygotsky", "Kohlberg", "Child-Centered Education"
    ]
}

questions = []
q_id = 1

for subject, chapters in chapters_dict.items():
    for chapter in chapters:
        questions.append({
            "id": q_id,
            "subject": subject,
            "chapter": chapter,
            "year": "UPTET 2026 Batch",
            "questionText": f"{chapter} से संबंधित यह एक प्लेसहोल्डर प्रश्न है। (Placeholder question for {chapter})",
            "options": ["विकल्प 1", "विकल्प 2", "विकल्प 3", "विकल्प 4"],
            "correctOptionIndex": 0,
            "explanation": "यह केवल संरचना दिखाने के लिए एक डमी प्रश्न है। (Dummy question to initialize structure)"
        })
        q_id += 1

with open("src/data/questions.json", "w", encoding="utf-8") as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)

print("Generated structured questions.json successfully!")
