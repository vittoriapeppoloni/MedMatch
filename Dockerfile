FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Download Llama model (you'll need to provide the model file)
RUN mkdir -p models

# Expose port
EXPOSE 5000

# Start the application
CMD ["python", "server/main.py"]