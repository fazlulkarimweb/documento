# Use a slim Python 3.10 image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    gcc \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install project dependencies
COPY pyproject.toml .
RUN pip install --upgrade pip
RUN pip install -e ".[test]"

# Copy the rest of the application
COPY . .

# Expose the FastAPI port
EXPOSE 8000

# Run the application
CMD ["legal-draft-agent", "start"]

