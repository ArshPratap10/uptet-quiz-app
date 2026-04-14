import os
import json
import google.generativeai as genai

# Setup Gemini API (Replace with your actual API key)
# Get a free key at https://aistudio.google.com/
API_KEY = "AIzaSyBlsmPO6vNm-WuI3N1qSnbzlW_bb_X-Q-I"
genai.configure(api_key=API_KEY)

# Use Gemini 1.5 Pro - ideal for processing large PDFs perfectly
MODEL_NAME = "models/gemini-1.5-pro"

def extract_questions_from_pdf(pdf_path, year, subject):
    """
    Reads a UPTET PDF and directly outputs structured JSON matching the React App format.
    """
    print(f"Uploading and processing {pdf_path}...")
    
    try:
        # Upload the file to Gemini API directly
        uploaded_file = genai.upload_file(pdf_path)
        print("Upload successful. Extracting text via AI...")

        model = genai.GenerativeModel(MODEL_NAME)
        prompt = f"""
        Read the provided UPTET question paper carefully.
        Extract ALL multiple-choice questions from it.
        Ignore headers, footers, page numbers, and unrelated instructions.
        
        Output ONLY a valid JSON array of objects, where each object matches this format:
        {{
            "id": [Generate a unique integer ID],
            "subject": "{subject}",
            "chapter": "Determine the chapter/topic based on the question context",
            "year": "{year}",
            "questionText": "The actual question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctOptionIndex": [Integer 0 to 3 showing which option is correct],
            "explanation": "Brief explanation of the correct answer (if present in document, otherwise leave empty string)"
        }}
        
        IMPORTANT: Generate ALL text values (subject, chapter, questionText, options, explanation) STRICTLY in the Hindi Language.
        """
        
        response = model.generate_content(
            [uploaded_file, prompt],
            generation_config={"response_mime_type": "application/json"}
        )
        
        questions = json.loads(response.text)
        print(f"Successfully extracted {len(questions)} questions from the PDF.")
        
        # Save to the JSON data file for the React app
        output_file = "src/data/questions.json"
        
        # Merge if exists
        if os.path.exists(output_file):
            with open(output_file, 'r') as f:
                existing_data = json.load(f)
                
            # offset IDs so they don't clash
            max_id = max([q["id"] for q in existing_data], default=0)
            for q in questions:
                q["id"] = max_id + 1
                max_id += 1
                
            existing_data.extend(questions)
            final_data = existing_data
        else:
            final_data = questions

        with open(output_file, 'w') as f:
            json.dump(final_data, f, indent=2)
            
        print(f"Saved to {output_file}. Done!")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    # Example Usage: Place your extracted PDF in the same folder and run this script
    pdf_filename = "uptet_2020_paper.pdf" # Change this to your actual PDF name!
    
    if os.path.exists(pdf_filename):
        extract_questions_from_pdf(pdf_filename, year="UPTET 2020", subject="Child Development")
    else:
        print(f"Could not find {pdf_filename}. Please place the PDF in the folder first!")
