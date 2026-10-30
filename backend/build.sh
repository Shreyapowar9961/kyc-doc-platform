#!/bin/bash
apt-get install -y tesseract-ocr poppler-utils
pip install pytesseract Pillow scikit-learn sentence-transformers pdf2image pdfplumber numpy pandas
npm install
npx prisma migrate deploy
npx prisma generate
cd ../data && python3 generate_samples.py
cd ../ml && python3 train.py