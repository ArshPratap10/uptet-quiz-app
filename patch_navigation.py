import re
import os

path = r'C:\Users\91969\Desktop\Codex\uptet-offline-pwa\src\App.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Patch renderPYQ
pyq_pattern = r'(const renderPYQ = \(\) => \{[\s\S]*?return \(\s*<div className="content-area">)'
pyq_replacement = r'\1\n        <button className="btn-outline" style={{ marginBottom: "1.5rem" }} onClick={goBackView}>\n          ← {t("Back", "वापस")}\n        </button>'
content = re.sub(pyq_pattern, pyq_replacement, content)

# 2. Localize Exam Simulator
content = content.replace('<h1 className="section-title">Exam Simulator</h1>', '<h1 className="section-title">{t("Exam Simulator", "परीक्षा सिम्युलेटर")}</h1>')
content = content.replace('<p style={{ color: \'var(--text-muted)\', marginBottom: \'2rem\' }}>Run a proper test strictly evaluated at the end.</p>', '<p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>{t("Run a proper test strictly evaluated at the end.", "एक पूरा परीक्षण चलाएं जो अंत में सख्ती से मूल्यांकित हो।")}</p>')

# 3. Patch renderSyllabus
syllabus_pattern = r'(const renderSyllabus = \(\) => \{[\s\S]*?return \(\s*<div className="content-area">)'
syllabus_replacement = r'\1\n        <button className="btn-outline" style={{ marginBottom: "1.5rem" }} onClick={goBackView}>\n          ← {t("Back", "वापस")}\n        </button>'
content = re.sub(syllabus_pattern, syllabus_replacement, content)

# 4. Patch renderQuiz to have a quit button
quiz_header_pattern = r'(<span style=\{\{ fontWeight: 600 \}\}>\{selectedChapter\}</span>)'
quiz_header_replacement = r'\1\n            <button className="btn-outline" style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }} onClick={goBackView}>{t("Exit", "बाहर निकलें")}</button>'
content = re.sub(quiz_header_pattern, quiz_header_replacement, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully patched App.jsx")
